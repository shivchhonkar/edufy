import type { InputHTMLAttributes } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export default function AuthInput({ label, hint, error, id, className = '', ...props }: AuthInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 bg-white transition-colors
          placeholder:text-gray-400
          focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none
          ${error ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}
          ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
