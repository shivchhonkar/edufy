'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
  type?: 'info' | 'success' | 'error' | 'warning';
}

export default function AlertDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  onClose,
  type = 'info',
}: AlertDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          Icon: FiCheckCircle,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100',
          confirmButton: 'bg-green-600 hover:bg-green-700',
        };
      case 'error':
        return {
          Icon: FiXCircle,
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          Icon: FiAlertCircle,
          iconColor: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700',
        };
      default:
        return {
          Icon: FiInfo,
          iconColor: 'text-primary-600',
          iconBg: 'bg-primary-100',
          confirmButton: 'bg-primary-600 hover:bg-primary-700',
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.Icon;

  return createPortal(
    <div
      className="confirm-dialog-overlay bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all relative">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
