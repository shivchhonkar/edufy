'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiTrash2, FiSearch, FiFilter } from 'react-icons/fi';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Modal form state
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDateOfBirth, setFormDateOfBirth] = useState('');
  const [formMembershipDate, setFormMembershipDate] = useState('');
  const [formMemberType, setFormMemberType] = useState('student');
  const [formStatus, setFormStatus] = useState('active');
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string>('');

  const { alert } = useDialog();

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/library/members');
      const d = await res.json();
      if (d.success) setMembers(d.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleAddMember = async () => {
    if (!formFullName.trim()) {
      await alert('Full Name is required', { title: 'Validation Error' });
      return;
    }
    if (!formEmail.trim()) {
      await alert('Email is required', { title: 'Validation Error' });
      return;
    }
    if (!formPhone.trim()) {
      await alert('Phone is required', { title: 'Validation Error' });
      return;
    }

    setFormLoading(true);
    try {
      const payload: any = {
        name: formFullName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        member_type: formMemberType,
        active: formStatus === 'active',
      };
      if (formAddress.trim()) payload.address = formAddress.trim();
      if (formDateOfBirth) payload.date_of_birth = formDateOfBirth;
      if (formMembershipDate) payload.membership_date = formMembershipDate;

      const res = await fetch('/api/library/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();

      if (d.success) {
        handleResetForm();
        setShowModal(false);
        await loadMembers();
        await alert('Member added successfully!', { title: 'Success' });
      } else {
        await alert(d.error || 'Failed to add member', { title: 'Error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to add member', { title: 'Error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetForm = () => {
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormDateOfBirth('');
    setFormMembershipDate('');
    setFormMemberType('student');
    setFormStatus('active');
    setFormPhoto(null);
    setFormPhotoPreview('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setFormPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMember = async (memberId: number) => {
    try {
      const res = await fetch(`/api/library/members/${memberId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        await loadMembers();
        await alert('Member deleted successfully', { title: 'Success' });
      } else {
        await alert(d.error || 'Failed to delete', { title: 'Error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to delete member', { title: 'Error' });
    }
  };

  // Filter and search logic
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (member.phone && member.phone.includes(searchQuery));

    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = member.active === true;
    } else if (filterStatus === 'inactive') {
      matchesStatus = member.active === false;
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Members</h1>
            <p className="text-gray-500 text-sm">Manage library members</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            + Add Member
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
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
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <FiFilter className="text-lg" />
              Filter
            </button>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((member, idx) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {member.name.substring(0, 1).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{member.email || 'N/A'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{member.phone || 'N/A'}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                            member.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {member.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
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
              Showing {filteredMembers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} entries
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

        {/* Add Member Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Member</h2>
                <p className="text-sm text-gray-500 mt-1">Members / Add Member</p>
              </div>

              <div className="space-y-6">
                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Enter address"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Photo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={handlePhotoChange}
                          className="hidden"
                          id="photo-input"
                        />
                        <label
                          htmlFor="photo-input"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-center text-sm text-gray-600"
                        >
                          {formPhoto ? formPhoto.name : 'Choose File'}
                          <div className="text-xs text-gray-400 mt-1">
                            JPG, PNG or JPEG. Max size 2MB
                          </div>
                        </label>
                      </div>
                      {formPhotoPreview && (
                        <div className="mt-2">
                          <img src={formPhotoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="Enter email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formDateOfBirth}
                        onChange={(e) => setFormDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Membership Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Membership Date</label>
                      <input
                        type="date"
                        value={formMembershipDate}
                        onChange={(e) => setFormMembershipDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Member Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Member Type</label>
                      <select
                        value={formMemberType}
                        onChange={(e) => setFormMemberType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="staff">Staff</option>
                        <option value="guest">Guest</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="status"
                            value="active"
                            checked={formStatus === 'active'}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Active</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="status"
                            value="inactive"
                            checked={formStatus === 'inactive'}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Inactive</span>
                        </label>
                      </div>
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
                  onClick={handleAddMember}
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {formLoading ? 'Saving...' : 'Save Member'}
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
