'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useEffect, useState, type ReactNode } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiTrash2, FiSearch, FiX, FiPlus, FiBook, FiCheckCircle, FiBookOpen } from 'react-icons/fi';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryMasterLinks from '@/features/library/components/LibraryMasterLinks';
import Link from 'next/link';

type MasterOption = { id: number; name: string };

type Book = {
  id: number;
  title: string;
  author?: string | null;
  publisher?: string | null;
  author2?: string | null;
  isbn?: string | null;
  author_id?: number | null;
  publisher_id?: number | null;
  vendor_id?: number | null;
  subject_id?: number | null;
  category_id?: number | null;
  total_copies?: number;
  publish_year?: number | null;
  description?: string | null;
  remarks?: string | null;
  price?: number | string | null;
  language?: string | null;
  edition?: string | null;
  pages?: number | null;
  accession_prefix?: string | null;
  accession_no?: string | null;
  purchase_date?: string | null;
  location?: string | null;
  class_no?: string | null;
  binding?: string | null;
  is_reference?: boolean | null;
  book_type?: string | null;
  volume?: string | null;
  bill_no?: string | null;
  with_cd?: boolean | null;
  accession_date?: string | null;
  book_status?: string | null;
  copies?: { id: number; book_id: number; status: string }[];
};

type BookForm = {
  accessionPrefix: string;
  accessionNo: string;
  medium: string;
  title: string;
  edition: string;
  pages: string;
  authorId: string;
  subjectId: string;
  remarks: string;
  publisherId: string;
  vendorId: string;
  price: string;
  purchaseDate: string;
  location: string;
  classNo: string;
  binding: string;
  isReference: 'Yes' | 'No';
  bookType: string;
  author2: string;
  volume: string;
  year: string;
  billNo: string;
  withCd: 'Yes' | 'No';
  accessionDate: string;
  isbn: string;
  bookStatus: string;
  totalCopies: string;
};

const ITEMS_PER_PAGE = 10;
const MEDIA = [
  'English',
  'Hindi',
  'Sanskrit',
  'Urdu',
  'Arabic',
  'Chinese',
  'Japanese',
  'German',
  'French',
  'Spanish',
  'Russian',
  'Portuguese',
  'Italian',
  'Korean',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Malayalam',
  'Kannada',
  'Odia',
  'Assamese',
  'Nepali',
  'Persian',
  'Turkish',
  'Dutch',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Malay',
  'Other',
];
const DEFAULT_MEDIUM = 'English';
const BOOK_STATUSES = ['On Shelf', 'Issued', 'Lost', 'Damaged', 'Binding', 'Withdrawn'];
const INPUT =
  'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-[var(--theme-font)] focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

const EMPTY_FORM: BookForm = {
  accessionPrefix: '',
  accessionNo: '',
  medium: DEFAULT_MEDIUM,
  title: '',
  edition: '',
  pages: '',
  authorId: '',
  subjectId: '',
  remarks: '',
  publisherId: '',
  vendorId: '',
  price: '',
  purchaseDate: '',
  location: '',
  classNo: '',
  binding: '',
  isReference: 'Yes',
  bookType: '',
  author2: '',
  volume: '',
  year: '',
  billNo: '',
  withCd: 'Yes',
  accessionDate: '',
  isbn: '',
  bookStatus: 'On Shelf',
  totalCopies: '1',
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function yesNo(value: unknown): 'Yes' | 'No' {
  return value === true || value === 't' || value === 'Yes' ? 'Yes' : 'No';
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
      <label className="text-sm font-medium text-[var(--theme-muted-font)]">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} />;
}

function BooksTableSkeleton() {
  return (
    <>
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <tr key={index}>
          <td className="px-3 py-3">
            <Pulse className="h-3 w-5" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-10 w-8" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3.5 w-40 max-w-full" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3.5 w-24 max-w-full" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3 w-20" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3 w-24" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3 w-8" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3 w-8" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-3 w-8" />
          </td>
          <td className="px-3 py-3">
            <Pulse className="h-5 w-16 rounded-full" />
          </td>
          <td className="px-3 py-3">
            <div className="flex justify-end gap-1">
              <Pulse className="h-6 w-6" />
              <Pulse className="h-6 w-6" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<MasterOption[]>([]);
  const [authors, setAuthors] = useState<MasterOption[]>([]);
  const [publishers, setPublishers] = useState<MasterOption[]>([]);
  const [vendors, setVendors] = useState<MasterOption[]>([]);
  const [subjects, setSubjects] = useState<MasterOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<BookForm>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const { alert, confirm } = useDialog();

  const patchForm = (partial: Partial<BookForm>) => setForm((prev) => ({ ...prev, ...partial }));

  const loadBooks = async () => {
    try {
      const res = await fetch('/api/library/books', { cache: 'no-store' });
      const d = await res.json();
      if (d.success) setBooks(d.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    try {
      const [cRes, aRes, pRes, vRes, sRes] = await Promise.all([
        fetch('/api/library/categories'),
        fetch('/api/library/masters/authors'),
        fetch('/api/library/masters/publishers'),
        fetch('/api/library/vendors'),
        fetch('/api/library/masters/subjects'),
      ]);
      const [cData, aData, pData, vData, sData] = await Promise.all([
        cRes.json(),
        aRes.json(),
        pRes.json(),
        vRes.json(),
        sRes.json(),
      ]);
      if (cData.success) setCategories(cData.data || []);
      if (aData.success) setAuthors(aData.data || []);
      if (pData.success) setPublishers(pData.data || []);
      if (vData.success) setVendors(vData.data || []);
      if (sData.success) setSubjects(sData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBooks();
    loadMasters();
  }, []);

  const resetForm = () => setForm({ ...EMPTY_FORM, medium: DEFAULT_MEDIUM });

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
    setForm({
      accessionPrefix: book.accession_prefix || '',
      accessionNo: book.accession_no || '',
      medium: book.language || DEFAULT_MEDIUM,
      title: book.title || '',
      edition: book.edition || '',
      pages: book.pages != null ? String(book.pages) : '',
      authorId: book.author_id?.toString() || '',
      subjectId: book.subject_id?.toString() || '',
      remarks: book.remarks || book.description || '',
      publisherId: book.publisher_id?.toString() || '',
      vendorId: book.vendor_id?.toString() || '',
      price: book.price != null && book.price !== '' ? String(book.price) : '',
      purchaseDate: toDateInput(book.purchase_date),
      location: book.location || '',
      classNo: book.class_no || '',
      binding: book.binding || '',
      isReference: yesNo(book.is_reference),
      bookType: book.book_type || '',
      author2: book.author2 || '',
      volume: book.volume || '',
      year: book.publish_year != null ? String(book.publish_year) : '',
      billNo: book.bill_no || '',
      withCd: yesNo(book.with_cd),
      accessionDate: toDateInput(book.accession_date),
      isbn: book.isbn || '',
      bookStatus: book.book_status || 'On Shelf',
      totalCopies: String(book.copies?.length ?? book.total_copies ?? 0),
    });
    setShowModal(true);
  };

  const validateForm = async () => {
    if (!form.title.trim()) {
      await alert('Book Title is required', { title: 'Validation Error' });
      return false;
    }
    if (!editingBook && Number(form.totalCopies) < 0) {
      await alert('No Of Books cannot be negative', { title: 'Validation Error' });
      return false;
    }
    return true;
  };

  const buildPayload = (): Record<string, unknown> => ({
    title: form.title.trim(),
    accession_prefix: form.accessionPrefix.trim(),
    accession_no: form.accessionNo.trim(),
    medium: form.medium || DEFAULT_MEDIUM,
    edition: form.edition.trim(),
    pages: form.pages,
    author_id: form.authorId ? parseInt(form.authorId, 10) : null,
    author: authors.find((a) => String(a.id) === form.authorId)?.name || '',
    subject_id: form.subjectId ? parseInt(form.subjectId, 10) : null,
    remarks: form.remarks.trim(),
    publisher_id: form.publisherId ? parseInt(form.publisherId, 10) : null,
    publisher: publishers.find((p) => String(p.id) === form.publisherId)?.name || '',
    vendor_id: form.vendorId ? parseInt(form.vendorId, 10) : null,
    price: form.price,
    purchase_date: form.purchaseDate,
    location: form.location.trim(),
    class_no: form.classNo.trim(),
    binding: form.binding.trim(),
    is_reference: form.isReference === 'Yes',
    book_type: form.bookType.trim(),
    author2: form.author2.trim(),
    volume: form.volume.trim(),
    publish_year: form.year,
    bill_no: form.billNo.trim(),
    with_cd: form.withCd === 'Yes',
    accession_date: form.accessionDate,
    isbn: form.isbn.trim(),
    book_status: form.bookStatus,
  });

  const handleSaveBook = async () => {
    if (!(await validateForm())) return;

    setFormLoading(true);
    try {
      const payload = buildPayload();
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
        payload.total_copies = parseInt(form.totalCopies || '0', 10) || 0;
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
      (book.isbn && book.isbn.toLowerCase().includes(q)) ||
      (book.accession_no && book.accession_no.toLowerCase().includes(q));
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

  const copyCounts = (book: Book) => {
    const copies = book.copies || [];
    const available = copies.filter((c) => c.status === 'available').length;
    const issued = copies.filter((c) => c.status === 'issued').length;
    const total = copies.length || book.total_copies || 0;
    return { available, issued, total };
  };

  const getBookStatus = (book: Book) => {
    const { available, issued } = copyCounts(book);
    if (available > 0 && issued > 0) return 'Partial';
    if (available > 0) return 'Available';
    if (issued > 0) return 'Issued';
    return book.book_status || 'N/A';
  };

  const inventory = books.reduce(
    (acc, book) => {
      const counts = copyCounts(book);
      acc.available += counts.available;
      acc.issued += counts.issued;
      acc.total += counts.total;
      return acc;
    },
    { available: 0, issued: 0, total: 0 }
  );

  const statusClass = (status: string) => {
    if (status === 'Available' || status === 'On Shelf') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Books</h1>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <FiPlus size={16} />
            Add Book
          </button>
        </div>
        {/* LibraryModuleLinks /> */}
        <LibraryMasterLinks />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[68px] animate-pulse rounded-xl bg-gray-100" />
            ))
          ) : (
            <>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
                <div className="flex items-center gap-2">
                  <FiCheckCircle size={16} />
                  <p className="text-[11px] font-medium opacity-80">Available copies</p>
                </div>
                <p className="mt-0.5 text-lg font-semibold">{inventory.available}</p>
              </div>
              <Link
                href="/library/reports/issued"
                className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-amber-700 hover:opacity-90"
              >
                <div className="flex items-center gap-2">
                  <FiBookOpen size={16} />
                  <p className="text-[11px] font-medium opacity-80">Issued copies</p>
                </div>
                <p className="mt-0.5 text-lg font-semibold">{inventory.issued}</p>
              </Link>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
                <div className="flex items-center gap-2">
                  <FiBook size={16} />
                  <p className="text-[11px] font-medium opacity-80">Total copies</p>
                </div>
                <p className="mt-0.5 text-lg font-semibold">{inventory.total}</p>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by title, author, ISBN or accession no..."
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
            {loading ? (
              <Pulse className="h-3 w-24" />
            ) : (
              <span>
                {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
                {filteredBooks.length !== books.length ? ` (of ${books.length} total)` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-busy={loading} aria-live="polite">
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
                    Total
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Available
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Issued
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
                {loading ? (
                  <BooksTableSkeleton />
                ) : paginatedBooks.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-gray-500">
                      No books found
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map((book, idx) => {
                    const status = getBookStatus(book);
                    const { available, issued, total } = copyCounts(book);
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
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{total}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-emerald-700">{available}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-amber-700">{issued}</td>
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

          {!loading && filteredBooks.length > 0 && (
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

        <AppModal open={showModal} onClose={closeModal}>
          <AppModalShell
            header={
              <>
                <h2 className="text-lg font-medium text-[var(--theme-font)]">
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
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={handleSaveBook}
                  disabled={formLoading}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {formLoading ? 'Saving…' : 'Save'}
                </button>
              </>
            }
          >
            <div className="p-4 sm:p-6">
              <div className="mx-auto max-w-5xl">
                <h3 className="mb-4 text-center text-sm font-semibold text-[var(--theme-primary-800)]">
                  Book Details
                </h3>
                <div className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
                  <div className="space-y-3">
                    <FieldRow label="Sr.No">
                      <input
                        type="text"
                        readOnly
                        value={editingBook?.id ?? ''}
                        className={`${INPUT} bg-gray-50 text-gray-500`}
                      />
                    </FieldRow>
                    <FieldRow label="Acc No.">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={form.accessionPrefix}
                          onChange={(e) => patchForm({ accessionPrefix: e.target.value })}
                          className={INPUT}
                        />
                        <input
                          type="text"
                          value={form.accessionNo}
                          onChange={(e) => patchForm({ accessionNo: e.target.value })}
                          className={INPUT}
                        />
                      </div>
                    </FieldRow>
                    <FieldRow label="Medium">
                      <select
                        value={form.medium || DEFAULT_MEDIUM}
                        onChange={(e) => patchForm({ medium: e.target.value || DEFAULT_MEDIUM })}
                        className={INPUT}
                      >
                        {(form.medium && !MEDIA.includes(form.medium)
                          ? [form.medium, ...MEDIA]
                          : MEDIA
                        ).map((medium) => (
                          <option key={medium} value={medium}>
                            {medium}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="Book Title">
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => patchForm({ title: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Edition">
                      <input
                        type="text"
                        value={form.edition}
                        onChange={(e) => patchForm({ edition: e.target.value })}
                        className={`${INPUT} max-w-[10rem]`}
                      />
                    </FieldRow>
                    <FieldRow label="Pages">
                      <input
                        type="number"
                        min={0}
                        value={form.pages}
                        onChange={(e) => patchForm({ pages: e.target.value })}
                        className={`${INPUT} max-w-[10rem]`}
                      />
                    </FieldRow>
                    <FieldRow label="Author">
                      <select
                        value={form.authorId}
                        onChange={(e) => patchForm({ authorId: e.target.value })}
                        className={INPUT}
                      >
                        <option value="">Select author</option>
                        {authors.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="Subject">
                      <select
                        value={form.subjectId}
                        onChange={(e) => patchForm({ subjectId: e.target.value })}
                        className={INPUT}
                      >
                        <option value="">Select subject</option>
                        {subjects.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="Remarks">
                      <input
                        type="text"
                        value={form.remarks}
                        onChange={(e) => patchForm({ remarks: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Publisher">
                      <select
                        value={form.publisherId}
                        onChange={(e) => patchForm({ publisherId: e.target.value })}
                        className={INPUT}
                      >
                        <option value="">Select publisher</option>
                        {publishers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="Vendor">
                      <select
                        value={form.vendorId}
                        onChange={(e) => patchForm({ vendorId: e.target.value })}
                        className={INPUT}
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="Price">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.price}
                        onChange={(e) => patchForm({ price: e.target.value })}
                        className={`${INPUT} max-w-[10rem]`}
                      />
                    </FieldRow>
                    <FieldRow label="Pur Date">
                      <input
                        type="date"
                        value={form.purchaseDate}
                        onChange={(e) => patchForm({ purchaseDate: e.target.value })}
                        className={`${INPUT} max-w-[12rem]`}
                      />
                    </FieldRow>
                  </div>

                  <div className="space-y-3">
                    <FieldRow label="Location">
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => patchForm({ location: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Class No">
                      <input
                        type="text"
                        value={form.classNo}
                        onChange={(e) => patchForm({ classNo: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Binding">
                      <input
                        type="text"
                        value={form.binding}
                        onChange={(e) => patchForm({ binding: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Reference Book">
                      <select
                        value={form.isReference}
                        onChange={(e) => patchForm({ isReference: e.target.value as 'Yes' | 'No' })}
                        className={`${INPUT} max-w-[8rem]`}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </FieldRow>
                    <FieldRow label="Type">
                      <input
                        type="text"
                        value={form.bookType}
                        onChange={(e) => patchForm({ bookType: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Author2">
                      <input
                        type="text"
                        value={form.author2}
                        onChange={(e) => patchForm({ author2: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Volume">
                      <input
                        type="text"
                        value={form.volume}
                        onChange={(e) => patchForm({ volume: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Year">
                      <input
                        type="number"
                        min={0}
                        value={form.year}
                        onChange={(e) => patchForm({ year: e.target.value })}
                        className={`${INPUT} max-w-[10rem]`}
                      />
                    </FieldRow>
                    <FieldRow label="Bill No">
                      <input
                        type="text"
                        value={form.billNo}
                        onChange={(e) => patchForm({ billNo: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="With CD">
                      <select
                        value={form.withCd}
                        onChange={(e) => patchForm({ withCd: e.target.value as 'Yes' | 'No' })}
                        className={`${INPUT} max-w-[8rem]`}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </FieldRow>
                    <FieldRow label="Acc Date">
                      <input
                        type="date"
                        value={form.accessionDate}
                        onChange={(e) => patchForm({ accessionDate: e.target.value })}
                        className={`${INPUT} max-w-[12rem]`}
                      />
                    </FieldRow>
                    <FieldRow label="ISBN">
                      <input
                        type="text"
                        value={form.isbn}
                        onChange={(e) => patchForm({ isbn: e.target.value })}
                        className={INPUT}
                      />
                    </FieldRow>
                    <FieldRow label="Book Status">
                      <select
                        value={form.bookStatus}
                        onChange={(e) => patchForm({ bookStatus: e.target.value })}
                        className={INPUT}
                      >
                        {BOOK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="No Of Books">
                      <input
                        type="number"
                        min={0}
                        readOnly={!!editingBook}
                        value={form.totalCopies}
                        onChange={(e) => patchForm({ totalCopies: e.target.value })}
                        className={`${INPUT} max-w-[10rem] ${editingBook ? 'bg-gray-50 text-gray-500' : ''}`}
                      />
                    </FieldRow>
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
