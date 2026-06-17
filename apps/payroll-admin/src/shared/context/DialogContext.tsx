'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import AlertDialog from '@/shared/components/common/AlertDialog';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

type AlertType = 'info' | 'success' | 'error' | 'warning';
type ConfirmType = 'warning' | 'danger' | 'info';

export type AlertOptions = {
  title?: string;
  type?: AlertType;
  confirmText?: string;
};

export type ConfirmOptions = {
  title?: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
};

type AlertState = {
  message: string;
  options: AlertOptions;
  resolve: () => void;
};

type ConfirmState = {
  message: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type DialogContextValue = {
  alert: (message: string, options?: AlertOptions) => Promise<void>;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const alert = useCallback((message: string, options: AlertOptions = {}) => {
    return new Promise<void>((resolve) => {
      setAlertState({ message, options, resolve });
    });
  }, []);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, options, resolve });
    });
  }, []);

  const closeAlert = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  const closeConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}

      {alertState && (
        <AlertDialog
          isOpen
          title={alertState.options.title || 'Notice'}
          message={alertState.message}
          confirmText={alertState.options.confirmText}
          type={alertState.options.type}
          onClose={closeAlert}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          isOpen
          title={confirmState.options.title || 'Confirm'}
          message={confirmState.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          type={confirmState.options.type}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}
    </DialogContext.Provider>
  );
}
