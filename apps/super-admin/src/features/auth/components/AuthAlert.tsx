import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface AuthAlertProps {
  type: 'error' | 'success';
  title?: string;
  children: React.ReactNode;
}

export default function AuthAlert({ type, title, children }: AuthAlertProps) {
  const isError = type === 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-xl px-4 py-3.5 ${
        isError
          ? 'border-2 border-red-200 bg-red-50 text-red-900'
          : 'border border-green-200 bg-green-50 text-green-800'
      }`}
    >
      {isError ? (
        <FiAlertCircle className="mt-0.5 shrink-0 text-red-600" size={20} aria-hidden="true" />
      ) : (
        <FiCheckCircle className="mt-0.5 shrink-0 text-green-600" size={20} aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={`text-sm font-semibold leading-snug ${isError ? 'text-red-900' : 'text-green-900'}`}>
            {title}
          </p>
        ) : null}
        <p
          className={`text-sm leading-relaxed ${
            title ? 'mt-1' : ''
          } ${isError ? 'font-medium text-red-800' : 'text-green-800'}`}
        >
          {children}
        </p>
      </div>
    </div>
  );
}
