'use client';

import React from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700',
        };
      case 'info':
        return {
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          confirmButton: 'bg-blue-600 hover:bg-blue-700',
        };
      default: // warning
        return {
          iconColor: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <FiAlertCircle className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-6 py-2.5 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

