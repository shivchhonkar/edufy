'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiTrash2, FiSearch, FiFilter } from 'react-icons/fi';

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal form state
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formIsbn, setFormIsbn] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formTotalCopies, setFormTotalCopies] = useState(1);
  const [formPublishYear, setFormPublishYear] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formBookCover, setFormBookCover] = useState<File | null>(null);
  const [formBookCoverPreview, setFormBookCoverPreview] = useState<string>('');
  const [formLoading, setFormLoading] = useState(false);

  const { alert } = useDialog();

  const loadBooks = async () => {
    try {
      const res = await fetch('/api/library/books');
      const d = await res.json();
      if (d.success) setBooks(d.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/library/categories');
      const d = await res.json();
      if (d.success) setCategories(d.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBooks();
    loadCategories();
  }, []);

  const handleAddBook = async () => {
    if (!formTitle.trim()) {
      await alert('Title is required', { title: 'Validation Error' });
      return;
    }
    if (!formAuthor.trim()) {
      await alert('Author is required', { title: 'Validation Error' });
      return;
    }
    if (!formIsbn.trim()) {
      await alert('ISBN is required', { title: 'Validation Error' });
      return;
    }
    if (!formCategoryId) {
      await alert('Category is required', { title: 'Validation Error' });
      return;
    }
    if (!formPublisher.trim()) {
      await alert('Publisher is required', { title: 'Validation Error' });
      return;
    }
    if (!formPublishYear.trim()) {
      await alert('Publish Year is required', { title: 'Validation Error' });
      return;
    }
    if (formTotalCopies <= 0) {
      await alert('Quantity must be at least 1', { title: 'Validation Error' });
      return;
    }

    setFormLoading(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        author: formAuthor.trim(),
        publisher: formPublisher.trim(),
        isbn: formIsbn.trim(),
        category_id: parseInt(formCategoryId, 10),
        total_copies: formTotalCopies,
        publish_year: parseInt(formPublishYear, 10),
      };
      if (formDescription.trim()) payload.description = formDescription.trim();

      const res = await fetch('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();

      if (d.success) {
        setFormTitle('');
        setFormAuthor('');
        setFormPublisher('');
        setFormIsbn('');
        setFormCategoryId('');
        setFormTotalCopies(1);
        setFormPublishYear('');
        setFormDescription('');
        setFormBookCover(null);
        setFormBookCoverPreview('');
        setShowModal(false);
        await loadBooks();
        await alert('Book added successfully!', { title: 'Success' });
      } else {
        await alert(d.error || 'Failed to add book', { title: 'Error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to add book', { title: 'Error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetForm = () => {
    setFormTitle('');
    setFormAuthor('');
    setFormPublisher('');
    setFormIsbn('');
    setFormCategoryId('');
    setFormTotalCopies(1);
    setFormPublishYear('');
    setFormDescription('');
    setFormBookCover(null);
    setFormBookCoverPreview('');
  };

  const handleBookCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or JPEG image', { title: 'Invalid File' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB', { title: 'File Too Large' });
        return;
      }
      setFormBookCover(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormBookCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      const res = await fetch(`/api/library/books/${bookId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        await loadBooks();
        await alert('Book deleted successfully', { title: 'Success' });
      } else {
        await alert(d.error || 'Failed to delete', { title: 'Error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to delete book', { title: 'Error' });
    }
  };

  // Filter and search logic
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (book.isbn && book.isbn.includes(searchQuery));

    const matchesCategory = !filterCategory || book.category_id?.toString() === filterCategory;

    let matchesStatus = true;
    if (filterStatus === 'available') {
      matchesStatus = (book.copies || []).some((c: any) => c.status === 'available');
    } else if (filterStatus === 'issued') {
      matchesStatus = (book.copies || []).some((c: any) => c.status === 'issued');
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get category name by ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'N/A';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  // Get status label
  const getBookStatus = (book: any) => {
    const copies = book.copies || [];
    if (copies.some((c: any) => c.status === 'available')) return 'Available';
    if (copies.some((c: any) => c.status === 'issued')) return 'Issued';
    return 'N/A';
  };

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const paginatedBooks = filteredBooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Books</h1>
            <p className="text-gray-500 text-sm">Manage your library catalog</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            + Add Book
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex bg-white rounded-lg border border-gray-200 p-4 gap-3 mb-4">
          <div className="">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, author or ISBN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="issued">Issued</option>
            </select>

            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <FiFilter className="text-lg" />
              Filter
            </button>
          </div>
        </div>

        {/* Books Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Cover</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">ISBN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedBooks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No books found
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map((book, idx) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-10 h-14 bg-gradient-to-br from-blue-200 to-blue-400 rounded text-white flex items-center justify-center text-xs font-bold">
                          {book.title.substring(0, 2).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{book.title}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{book.author || 'N/A'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{getCategoryName(book.category_id)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{book.isbn || 'N/A'}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                            getBookStatus(book) === 'Available'
                              ? 'bg-green-100 text-green-800'
                              : getBookStatus(book) === 'Issued'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getBookStatus(book)}
                        </span>
                      </td>
                      <td className="px-6 py-3 flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredBooks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredBooks.length)} of {filteredBooks.length} entries
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Add Book Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Add Book</h2>

              <div className="space-y-6">
                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Enter book title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* ISBN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ISBN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formIsbn}
                        onChange={(e) => setFormIsbn(e.target.value)}
                        placeholder="Enter ISBN"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Publisher */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publisher <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formPublisher}
                        onChange={(e) => setFormPublisher(e.target.value)}
                        placeholder="Enter publisher"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formTotalCopies}
                        onChange={(e) => setFormTotalCopies(parseInt(e.target.value || '1', 10))}
                        placeholder="Enter quantity"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Enter book description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Author */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Author <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Publish Year */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publish Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formPublishYear}
                        onChange={(e) => setFormPublishYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select year</option>
                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Book Cover */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Book Cover</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={handleBookCoverChange}
                          className="hidden"
                          id="book-cover-input"
                        />
                        <label
                          htmlFor="book-cover-input"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-center text-sm text-gray-600"
                        >
                          {formBookCover ? formBookCover.name : 'Choose File'}
                          <div className="text-xs text-gray-400 mt-1">
                            JPG, PNG or JPEG. Max size 2MB
                          </div>
                        </label>
                      </div>
                      {formBookCoverPreview && (
                        <div className="mt-2">
                          <img src={formBookCoverPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-8 justify-end">
                <button
                  onClick={handleResetForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleAddBook}
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {formLoading ? 'Saving...' : 'Save Book'}
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
