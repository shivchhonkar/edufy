'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiSearch, FiPackage, FiAlertCircle, FiUpload, FiDownload } from 'react-icons/fi';
import { Button } from '@edulakhya/ui';
import { formatCurrency } from '@edulakhya/utils';
import { InventoryCategory } from '@edulakhya/types';
import Link from 'next/link';
import VirtualizedTable, { type VirtualizedTableColumn } from '@/components/VirtualizedTable';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [selectedCategory, search]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (search) params.append('search', search);
      
      const res = await fetch(`/api/items?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const openModal = useCallback((item: any = null) => {
    setEditingItem(item);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchItems();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  }, []);

  const itemColumns = useMemo<VirtualizedTableColumn<any>[]>(
    () => [
      {
        key: 'item',
        header: 'Item',
        width: '2fr',
        render: (item) => (
          <div className="flex items-center min-w-0">
            <FiPackage className="text-gray-400 mr-3 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{item.item_name}</div>
              <div className="text-sm text-gray-500 truncate">{item.item_code}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        width: '1fr',
        render: (item) => <span className="text-gray-900">{item.category_name || '-'}</span>,
      },
      {
        key: 'stock',
        header: 'Stock',
        width: '1fr',
        render: (item) => (
          <div>
            <div className="flex items-center">
              <span
                className={`font-medium ${
                  item.min_stock_level && item.quantity <= item.min_stock_level
                    ? 'text-red-600'
                    : 'text-gray-900'
                }`}
              >
                {item.quantity} {item.unit}
              </span>
              {item.min_stock_level && item.quantity <= item.min_stock_level && (
                <FiAlertCircle className="ml-2 text-red-600 shrink-0" />
              )}
            </div>
            {item.min_stock_level && (
              <div className="text-xs text-gray-500">Min: {item.min_stock_level}</div>
            )}
          </div>
        ),
      },
      {
        key: 'unit_price',
        header: 'Unit Price',
        width: '0.9fr',
        render: (item) => (
          <span className="text-gray-900">
            {item.unit_price ? formatCurrency(item.unit_price) : '-'}
          </span>
        ),
      },
      {
        key: 'supplier',
        header: 'Supplier',
        width: '1.2fr',
        render: (item) => (
          <span className="text-gray-900 truncate">{item.supplier_name || '-'}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '100px',
        headerClassName: 'text-right',
        cellClassName: 'justify-end',
        render: (item) => (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => openModal(item)}
              className="text-indigo-600 hover:text-indigo-900"
              aria-label={`Edit ${item.item_name}`}
            >
              <FiEdit />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="text-red-600 hover:text-red-900"
              aria-label={`Delete ${item.item_name}`}
            >
              <FiTrash2 />
            </button>
          </div>
        ),
      },
    ],
    [handleDelete, openModal],
  );

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/items/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const { totalRows, successCount, errorCount, errors } = data.data;
        let message = `✅ Upload Complete!\n\n`;
        message += `Total Rows: ${totalRows}\n`;
        message += `✓ Successfully Added: ${successCount}\n`;
        message += `✗ Errors: ${errorCount}\n`;
        
        if (errors && errors.length > 0) {
          message += `\nFirst few errors:\n${errors.slice(0, 5).join('\n')}`;
        }
        
        alert(message);
        fetchItems(); // Refresh list
        fetchCategories(); // Refresh categories (new ones might have been created)
      } else {
        alert(`❌ Upload Failed\n\n${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h1 className="text-xl text-gray-900">Inventory Items</h1>
              <p className="text-sm text-gray-600">Manage your inventory stock</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2">
                <Link href="/">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FiUpload className="mr-2" />
                  {uploading ? 'Uploading...' : 'Bulk Upload'}
                </Button>
                <Button onClick={() => openModal()}>
                  <FiPlus className="mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a
                  href="/sample_inventory_upload.csv"
                  download="sample_inventory_upload.csv"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <FiDownload className="text-xs" />
                  Download Sample CSV (50 items)
                </a>
                <span className="text-gray-400">|</span>
                <a
                  href="/template_inventory_upload.csv"
                  download="template_inventory_upload.csv"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <FiDownload className="text-xs" />
                  Download Blank Template
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading items...' : `${items.length} item${items.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <VirtualizedTable
              rows={items}
              columns={itemColumns}
              getRowKey={(item) => item.id}
              rowHeight={72}
              maxHeight="min(72vh, 800px)"
              minWidth={1024}
              emptyMessage="No items found"
              rowClassName="hover:bg-gray-50"
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingItem(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}

function ItemModal({ item, categories, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    category_id: item?.category_id || '',
    item_name: item?.item_name || '',
    item_code: item?.item_code || '',
    description: item?.description || '',
    unit: item?.unit || 'pcs',
    quantity: item?.quantity || 0,
    min_stock_level: item?.min_stock_level || '',
    unit_price: item?.unit_price || '',
    gst_percentage: item?.gst_percentage || '18',
    hsn_code: item?.hsn_code || '',
    supplier_name: item?.supplier_name || '',
    supplier_contact: item?.supplier_contact || '',
    location: item?.location || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = item ? `/api/items/${item.id}` : '/api/items';
      const method = item ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl mb-4">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat: InventoryCategory) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="pcs, kg, ltr, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stock {!item && '*'}
                </label>
                <input
                  type="number"
                  required={!item}
                  disabled={!!item}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
                {item && (
                  <p className="text-xs text-gray-500 mt-1">
                    Use transactions to update stock
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST % *
                </label>
                <select
                  value={formData.gst_percentage}
                  onChange={(e) => setFormData({ ...formData, gst_percentage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Price incl. GST: ₹{(parseFloat(formData.unit_price || '0') * (1 + parseFloat(formData.gst_percentage || '0') / 100)).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HSN/SAC Code
                </label>
                <input
                  type="text"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 6301"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Contact
                </label>
                <input
                  type="text"
                  value={formData.supplier_contact}
                  onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Item'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


