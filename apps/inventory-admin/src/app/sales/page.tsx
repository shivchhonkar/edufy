'use client';

import React, { useState, useEffect } from 'react';
import { FiSearch, FiShoppingCart, FiPlus, FiTrash2, FiUser } from 'react-icons/fi';
import { Button } from '@edulakhya/ui';
import { formatCurrency } from '@edulakhya/utils';
import Link from 'next/link';

export default function SalesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (studentSearch.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
  }, [studentSearch]);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (data.success) {
        setItems(data.data.filter((item: any) => item.quantity > 0));
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const searchStudents = async () => {
    try {
      const res = await fetch(`/api/students/search?q=${studentSearch}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error searching students:', error);
    }
  };

  const addToCart = (item: any) => {
    const existingItem = cart.find((i) => i.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === item.id
            ? { ...i, cart_quantity: Math.min(i.cart_quantity + 1, item.quantity) }
            : i
        )
      );
    } else {
      setCart([...cart, { ...item, cart_quantity: 1 }]);
    }
  };

  const updateCartQuantity = (itemId: number, quantity: number) => {
    const item = items.find((i) => i.id === itemId);
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else if (quantity <= item.quantity) {
      setCart(
        cart.map((i) =>
          i.id === itemId ? { ...i, cart_quantity: quantity } : i
        )
      );
    }
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter((i) => i.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price || 0) * item.cart_quantity, 0);
  };

  const handleCheckout = async () => {
    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const saleItems = cart.map((item) => ({
        item_id: item.id,
        quantity: item.cart_quantity,
        unit_price: item.unit_price,
      }));

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          items: saleItems,
          created_by: 1, // TODO: Get from auth context
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Sale completed! Total: ${formatCurrency(data.data.total_amount)}`);
        setCart([]);
        setSelectedStudent(null);
        fetchItems(); // Refresh items to update quantities
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Failed to complete sale');
    }
  };

  const filteredItems = items.filter((item) =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.item_code && item.item_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl text-gray-900">Point of Sale</h1>
              <p className="text-sm text-gray-600">Sell items to students</p>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:border-indigo-500 cursor-pointer transition"
                    onClick={() => addToCart(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{item.item_code}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-indigo-600">
                        {formatCurrency(item.unit_price || 0)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                      >
                        <FiPlus />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    No items available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-4">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold flex items-center">
                  <FiShoppingCart className="mr-2" />
                  Cart ({cart.length})
                </h2>
              </div>

              {/* Student Selection */}
              <div className="p-4 border-b bg-gray-50">
                {selectedStudent ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FiUser className="text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium text-sm">
                          {selectedStudent.first_name} {selectedStudent.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedStudent.admission_number}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setShowStudentSearch(!showStudentSearch)}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Select Student
                    </button>

                    {showStudentSearch && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                        />
                        {students.length > 0 && (
                          <div className="max-h-40 overflow-y-auto border rounded-lg">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowStudentSearch(false);
                                  setStudentSearch('');
                                }}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                              >
                                <p className="text-sm font-medium">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {student.admission_number}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="p-4 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b pb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.item_name}</h4>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.unit_price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={item.cart_quantity}
                            onChange={(e) =>
                              updateCartQuantity(item.id, parseInt(e.target.value))
                            }
                            className="w-16 px-2 py-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total and Checkout */}
              {cart.length > 0 && (
                <div className="p-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-xl text-indigo-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    disabled={!selectedStudent}
                    className="w-full"
                  >
                    Complete Sale
                  </Button>
                  <button
                    onClick={() => setCart([])}
                    className="w-full mt-2 px-4 py-2 text-red-600 hover:text-red-800"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


























































