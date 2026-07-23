'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { AppModalShell, APP_MODAL_BODY } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiTrash2, FiSearch, FiX, FiPlus, FiBook } from 'react-icons/fi';

type Book = {
  id: number;
  title: string;
  author?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  category_id?: number | null;
  total_copies?: number;
  publish_year?: number | null;
  description?: string | null;
  copies?: { id: number; book_id: number; status: string }[];
};

const ITEMS_PER_PAGE = 10;

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formIsbn, setFormIsbn] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formTotalCopies, setFormTotalCopies] = useState(1);
  const [formPublishYear, setFormPublishYear] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBookCover, setFormBookCover] = useState<File | null>(null);
  const [formBookCoverPreview, setFormBookCoverPreview] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const { alert, confirm } = useDialog();

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

  const resetForm = () => {
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

  const closeModal = () => {
    setShowModal(false);
    setEditingBook(null);
    resetForm();
  };

  const openAddModal = () => {
    setEditingBook(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setFormTitle(book.title || '');
    setFormAuthor(book.author || '');
    setFormPublisher(book.publisher || '');
    setFormIsbn(book.isbn || '');
    setFormCategoryId(book.category_id?.toString() || '');
    setFormTotalCopies(book.total_copies || 1);
    setFormPublishYear(book.publish_year?.toString() || '');
    setFormDescription(book.description || '');
    setFormBookCover(null);
    setFormBookCoverPreview('');
    setShowModal(true);
  };

  const validateForm = async () => {
    if (!formTitle.trim()) {
      await alert('Title is required', { title: 'Validation Error' });
      return false;
    }
    if (!formAuthor.trim()) {
      await alert('Author is required', { title: 'Validation Error' });
      return false;
    }
    if (!formIsbn.trim()) {
      await alert('ISBN is required', { title: 'Validation Error' });
      return false;
    }
    if (!formCategoryId) {
      await alert('Category is required', { title: 'Validation Error' });
      return false;
    }
    if (!formPublisher.trim()) {
      await alert('Publisher is required', { title: 'Validation Error' });
      return false;
    }
    if (!editingBook && !formPublishYear.trim()) {
      await alert('Publish Year is required', { title: 'Validation Error' });
      return false;
    }
    if (!editingBook && formTotalCopies <= 0) {
      await alert('Quantity must be at least 1', { title: 'Validation Error' });
      return false;
    }
    return true;
  };

  const handleSaveBook = async () => {
    if (!(await validateForm())) return;

    setFormLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: formTitle.trim(),
        author: formAuthor.trim(),
        publisher: formPublisher.trim(),
        isbn: formIsbn.trim(),
        category_id: parseInt(formCategoryId, 10),
      };
      if (formDescription.trim()) payload.description = formDescription.trim();
      if (formPublishYear.trim()) payload.publish_year = parseInt(formPublishYear, 10);

      if (editingBook) {
        const res = await fetch(`/api/library/books/${editingBook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.success) {
          closeModal();
          await loadBooks();
          await alert('Book updated successfully!', { title: 'Success', type: 'success' });
        } else {
          await alert(d.error || 'Failed to update book', { title: 'Error', type: 'error' });
        }
      } else {
        payload.total_copies = formTotalCopies;
        const res = await fetch('/api/library/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.success) {
          closeModal();
          await loadBooks();
          await alert('Book added successfully!', { title: 'Success', type: 'success' });
        } else {
          await alert(d.error || 'Failed to add book', { title: 'Error', type: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
      await alert(editingBook ? 'Failed to update book' : 'Failed to add book', {
        title: 'Error',
        type: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleBookCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      void alert('Please upload a JPG, PNG, or JPEG image', { title: 'Invalid File', type: 'warning' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      void alert('File size must be less than 2MB', { title: 'File Too Large', type: 'warning' });
      return;
    }
    setFormBookCover(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFormBookCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDeleteBook = async (book: Book) => {
    const issuedCount = (book.copies || []).filter((c) => c.status === 'issued').length;
    const message =
      issuedCount > 0
        ? `"${book.title}" has ${issuedCount} issued cop${issuedCount === 1 ? 'y' : 'ies'}. Delete anyway?`
        : `Delete "${book.title}"? This cannot be undone.`;

    const ok = await confirm(message, {
      title: 'Delete Book',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/library/books/${book.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        await loadBooks();
        await alert('Book deleted successfully', { title: 'Success', type: 'success' });
      } else {
        await alert(d.error || 'Failed to delete book', { title: 'Error', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to delete book', { title: 'Error', type: 'error' });
    }
  };

  const filteredBooks = books.filter((book) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      book.title.toLowerCase().includes(q) ||
      (book.author && book.author.toLowerCase().includes(q)) ||
      (book.isbn && book.isbn.toLowerCase().includes(q));
    const matchesCategory = !filterCategory || book.category_id?.toString() === filterCategory;

    let matchesStatus = true;
    if (filterStatus === 'available') {
      matchesStatus = (book.copies || []).some((c) => c.status === 'available');
    } else if (filterStatus === 'issued') {
      matchesStatus = (book.copies || []).some((c) => c.status === 'issued');
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryName = (categoryId: number | null | undefined) => {
    if (!categoryId) return '—';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const getBookStatus = (book: Book) => {
    const copies = book.copies || [];
    const available = copies.filter((c) => c.status === 'available').length;
    const issued = copies.filter((c) => c.status === 'issued').length;
    if (available > 0 && issued > 0) return 'Partial';
    if (available > 0) return 'Available';
    if (issued > 0) return 'Issued';
    return 'N/A';
  };

  const statusClass = (status: string) => {
    if (status === 'Available') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    if (status === 'Issued') return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    if (status === 'Partial') return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    return 'bg-gray-50 text-gray-600 ring-gray-500/20';
  };

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const coverColors = [
    'from-primary-400 to-primary-600',
    'from-indigo-400 to-indigo-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Books</h1>
            {/* <p className="text-sm text-gray-500">Manage your library catalog</p> */}
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <FiPlus size={16} />
            Add Book
          </button>
        </div>

        {/* Stats + Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by title, author or ISBN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="issued">Issued</option>
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <FiBook size={14} />
            <span>
              {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
              {filteredBooks.length !== books.length ? ` (of ${books.length} total)` : ''}
            </span>
          </div>
        </div>

        {/* Books Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Cover
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Title
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Author
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    ISBN
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Copies
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBooks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-gray-500">
                      No books found
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map((book, idx) => {
                    const status = getBookStatus(book);
                    const copyCount = book.copies?.length ?? book.total_copies ?? 0;
                    return (
                      <tr key={book.id} className="hover:bg-gray-50/80">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                          {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div
                            className={`flex h-10 w-8 items-center justify-center rounded bg-gradient-to-br text-[10px] font-bold text-white ${coverColors[book.id % coverColors.length]}`}
                          >
                            {book.title.substring(0, 2).toUpperCase()}
                          </div>
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2 font-medium text-gray-900">
                          {book.title}
                        </td>
                        <td className="max-w-[120px] truncate px-3 py-2 text-gray-600">
                          {book.author || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {getCategoryName(book.category_id)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-600">
                          {book.isbn || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{copyCount}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(book)}
                              title="Edit book"
                              className="rounded-lg p-1.5 text-primary-600 hover:bg-primary-50"
                            >
                              <FiEdit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBook(book)}
                              title="Delete book"
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredBooks.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredBooks.length)} of {filteredBooks.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, i, arr) => (
                    <span key={page} className="flex items-center">
                      {i > 0 && arr[i - 1] !== page - 1 && (
                        <span className="px-1 text-xs text-gray-400">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[28px] rounded px-2 py-1 text-xs ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-200 text-gray-700 hover:bg-white'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-gray-200 px-2.5 py-1 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add / Edit Book Modal — full content area */}
        <AppModal open={showModal} onClose={closeModal}>
          <AppModalShell
            header={
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingBook ? 'Edit Book' : 'Add Book'}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX size={20} />
                </button>
              </>
            }
            footer={
              <>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSaveBook}
                  disabled={formLoading}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {formLoading ? 'Saving…' : editingBook ? 'Update Book' : 'Save Book'}
                </button>
              </>
            }
          >
            <div className={`${APP_MODAL_BODY} p-4 sm:p-6`}>
              <div className="mx-auto max-w-4xl">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Enter book title"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        ISBN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formIsbn}
                        onChange={(e) => setFormIsbn(e.target.value)}
                        placeholder="Enter ISBN"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Publisher <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formPublisher}
                        onChange={(e) => setFormPublisher(e.target.value)}
                        placeholder="Enter publisher"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    {!editingBook && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formTotalCopies}
                          onChange={(e) =>
                            setFormTotalCopies(parseInt(e.target.value || '1', 10))
                          }
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    )}
                    {editingBook && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Total Copies
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={editingBook.copies?.length ?? editingBook.total_copies ?? 0}
                          className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Enter book description"
                        rows={4}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Author <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Publish Year {!editingBook && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={formPublishYear}
                        onChange={(e) => setFormPublishYear(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option value="">Select year</option>
                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(
                          (year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Book Cover
                      </label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleBookCoverChange}
                        className="hidden"
                        id="book-cover-input"
                      />
                      <label
                        htmlFor="book-cover-input"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-4 py-6 text-center hover:border-primary-300 hover:bg-primary-50/30"
                      >
                        {formBookCoverPreview ? (
                          <img
                            src={formBookCoverPreview}
                            alt="Cover preview"
                            className="mb-2 h-32 w-auto rounded object-cover"
                          />
                        ) : (
                          <FiBook className="mb-2 text-2xl text-gray-300" />
                        )}
                        <span className="text-sm text-gray-600">
                          {formBookCover ? formBookCover.name : 'Choose file'}
                        </span>
                        <span className="mt-1 text-xs text-gray-400">
                          JPG, PNG or JPEG · Max 2MB
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AppModalShell>
        </AppModal>
      </div>
    </DashboardLayout>
  );
}
