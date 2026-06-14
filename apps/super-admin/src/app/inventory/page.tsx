'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { InventoryItem } from '@/shared/types';
import { FiPackage, FiPlus, FiAlertCircle } from 'react-icons/fi';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory/items');
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = items.filter(
    (item) => item.quantity <= (item.min_stock_level || 0)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Manage school inventory and stock</p>
          </div>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2">
            <FiPlus />
            <span>Add Item</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Items</p>
                <p className="text-3xl font-bold text-blue-700 mt-2">{items.length}</p>
              </div>
              <FiPackage className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Low Stock</p>
                <p className="text-3xl font-bold text-red-700 mt-2">{lowStockItems.length}</p>
              </div>
              <FiAlertCircle className="w-10 h-10 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No inventory items found. Add your first item to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.item_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{item.unit_price || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.quantity <= (item.min_stock_level || 0) ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

