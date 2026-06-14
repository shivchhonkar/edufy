import { query } from './db';

export interface PaymentReceiptData {
  payment_id: number;
  student_id: number;
  receipt_number: string;
  payment_date: string;
  academic_year: string;
  selected_months: string[];
  tuition_fees_per_month: number;
  transport_fees_per_month: number;
  other_fees_per_month: number;
  total_tuition_paid: number;
  total_transport_paid: number;
  total_other_paid: number;
  total_amount_paid: number;
  payment_method: string;
  transaction_id?: string;
  late_fee_charged: number;
  discount_applied: number;
  receipt_type?: string;
  is_bulk_payment: boolean;
  months_count: number;
}

export async function createPaymentReceipt(receiptData: PaymentReceiptData) {
  try {
    const result = await query(
      `INSERT INTO payment_receipts (
        payment_id, student_id, receipt_number, payment_date, academic_year,
        selected_months, tuition_fees_per_month, transport_fees_per_month, other_fees_per_month,
        total_tuition_paid, total_transport_paid, total_other_paid, total_amount_paid,
        payment_method, transaction_id, late_fee_charged, discount_applied,
        receipt_type, is_bulk_payment, months_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        receiptData.payment_id,
        receiptData.student_id,
        receiptData.receipt_number,
        receiptData.payment_date,
        receiptData.academic_year,
        JSON.stringify(receiptData.selected_months),
        receiptData.tuition_fees_per_month,
        receiptData.transport_fees_per_month,
        receiptData.other_fees_per_month,
        receiptData.total_tuition_paid,
        receiptData.total_transport_paid,
        receiptData.total_other_paid,
        receiptData.total_amount_paid,
        receiptData.payment_method,
        receiptData.transaction_id,
        receiptData.late_fee_charged,
        receiptData.discount_applied,
        receiptData.receipt_type || 'original',
        receiptData.is_bulk_payment,
        receiptData.months_count
      ]
    );

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Error creating payment receipt:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}

export async function getPaymentReceiptByPaymentId(paymentId: number) {
  try {
    const result = await query(
      `SELECT pr.*, s.first_name, s.last_name, s.admission_number, s.parent_name, s.parent_phone, s.parent_email,
              c.name as class_name, sec.name as section_name
       FROM payment_receipts pr
       JOIN students s ON pr.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE pr.payment_id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Payment receipt not found'
      };
    }

    const receipt = result.rows[0];
    
    // Parse selected_months JSON
    receipt.selected_months = JSON.parse(receipt.selected_months || '[]');

    return {
      success: true,
      data: receipt
    };
  } catch (error: any) {
    console.error('Error fetching payment receipt:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}

export async function getStudentPaymentReceipts(studentId: number, academicYear?: string) {
  try {
    let queryText = `
      SELECT pr.*, s.first_name, s.last_name, s.admission_number, s.parent_name, s.parent_phone, s.parent_email,
             c.name as class_name, sec.name as section_name
      FROM payment_receipts pr
      JOIN students s ON pr.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE pr.student_id = $1
    `;
    
    const params = [studentId];
    
    if (academicYear) {
      queryText += ` AND pr.academic_year = $2`;
      params.push(academicYear);
    }
    
    queryText += ` ORDER BY pr.payment_date DESC`;

    const result = await query(queryText, params);

    // Parse selected_months JSON for each receipt
    const receipts = result.rows.map(receipt => ({
      ...receipt,
      selected_months: JSON.parse(receipt.selected_months || '[]')
    }));

    return {
      success: true,
      data: receipts
    };
  } catch (error: any) {
    console.error('Error fetching student payment receipts:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}

export async function generateCompletePaymentSummary(studentId: number, academicYear: string) {
  try {
    const result = await query(
      `SELECT 
        pr.student_id,
        pr.academic_year,
        SUM(pr.total_tuition_paid) as total_tuition_paid,
        SUM(pr.total_transport_paid) as total_transport_paid,
        SUM(pr.total_other_paid) as total_other_paid,
        SUM(pr.total_amount_paid) as total_amount_paid,
        COUNT(pr.id) as payment_count,
        array_agg(DISTINCT unnest(pr.selected_months)) as all_months_paid
      FROM payment_receipts pr
      WHERE pr.student_id = $1 AND pr.academic_year = $2
      GROUP BY pr.student_id, pr.academic_year`,
      [studentId, academicYear]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'No payment receipts found for this student'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Error generating complete payment summary:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}
