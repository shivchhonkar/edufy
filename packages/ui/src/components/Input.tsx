import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  ...props
}: InputProps) {
  const inputClasses = [
    'px-4 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2',
    error 
      ? 'border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    fullWidth && 'w-full',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

