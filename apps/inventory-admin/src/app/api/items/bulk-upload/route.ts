import { NextRequest, NextResponse } from 'next/server';
import { query } from '@EduLakhya/database';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Please upload a CSV file' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    let records;
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      return NextResponse.json(
        { success: false, error: `CSV parsing error: ${parseError.message}` },
        { status: 400 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const processedItems: any[] = [];

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because: +1 for header, +1 for 0-based index

      try {
        // Validate required fields
        if (!record.item_name || !record.unit || !record.quantity || !record.unit_price) {
          errors.push(`Row ${rowNum}: Missing required fields (item_name, unit, quantity, or unit_price) for ${record.item_name || 'unknown item'}`);
          errorCount++;
          continue;
        }

        // Validate numeric fields
        const quantity = parseInt(record.quantity);
        const unitPrice = parseFloat(record.unit_price);
        const gstPercentage = record.gst_percentage ? parseFloat(record.gst_percentage) : 18;
        const minStockLevel = record.min_stock_level ? parseInt(record.min_stock_level) : null;

        if (isNaN(quantity) || quantity < 0) {
          errors.push(`Row ${rowNum}: Invalid quantity for ${record.item_name}`);
          errorCount++;
          continue;
        }

        if (isNaN(unitPrice) || unitPrice < 0) {
          errors.push(`Row ${rowNum}: Invalid unit_price for ${record.item_name}`);
          errorCount++;
          continue;
        }

        if (![0, 5, 12, 18, 28].includes(gstPercentage)) {
          errors.push(`Row ${rowNum}: Invalid GST percentage for ${record.item_name}. Must be 0, 5, 12, 18, or 28`);
          errorCount++;
          continue;
        }

        // Get or create category
        let categoryId = null;
        if (record.category_name && record.category_name.trim()) {
          try {
            const categoryResult = await query(
              'SELECT id FROM inventory_categories WHERE LOWER(name) = LOWER($1)',
              [record.category_name.trim()]
            );
            
            if (categoryResult.rows.length > 0) {
              categoryId = categoryResult.rows[0].id;
            } else {
              // Create new category
              const newCategory = await query(
                'INSERT INTO inventory_categories (name, description, created_at) VALUES ($1, $2, NOW()) RETURNING id',
                [record.category_name.trim(), `Auto-created from bulk upload`]
              );
              categoryId = newCategory.rows[0].id;
            }
          } catch (catError: any) {
            console.error(`Category error for ${record.item_name}:`, catError);
            // Continue without category
          }
        }

        // Check if item_code already exists
        if (record.item_code && record.item_code.trim()) {
          const existingItem = await query(
            'SELECT id FROM inventory_items WHERE item_code = $1',
            [record.item_code.trim()]
          );
          
          if (existingItem.rows.length > 0) {
            errors.push(`Row ${rowNum}: Item code ${record.item_code} already exists. Skipping ${record.item_name}`);
            errorCount++;
            continue;
          }
        }

        // Insert item
        const result = await query(
          `INSERT INTO inventory_items (
            category_id, item_name, item_code, description, unit, 
            quantity, min_stock_level, unit_price, gst_percentage, 
            hsn_code, supplier_name, supplier_contact, location, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          RETURNING id, item_name, item_code`,
          [
            categoryId,
            record.item_name.trim(),
            record.item_code?.trim() || null,
            record.description?.trim() || null,
            record.unit.trim(),
            quantity,
            minStockLevel,
            unitPrice,
            gstPercentage,
            record.hsn_code?.trim() || null,
            record.supplier_name?.trim() || null,
            record.supplier_contact?.trim() || null,
            record.location?.trim() || null
          ]
        );

        processedItems.push(result.rows[0]);
        successCount++;

      } catch (itemError: any) {
        console.error(`Error inserting row ${rowNum}:`, itemError);
        errors.push(`Row ${rowNum}: ${itemError.message} - ${record.item_name}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Upload complete: ${successCount} items added, ${errorCount} errors`,
      data: {
        totalRows: records.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 20), // Return first 20 errors
        processedItems: processedItems.slice(0, 10), // Return first 10 processed items
      }
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process upload' },
      { status: 500 }
    );
  }
}

