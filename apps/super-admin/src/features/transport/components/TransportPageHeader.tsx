'use client';

import { FiInfo } from 'react-icons/fi';

interface TransportPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  showSetupHint?: boolean;
}

export default function TransportPageHeader({
  title,
  description,
  action,
  showSetupHint = false,
}: TransportPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl text-gray-900">{title}</h1>
          {showSetupHint && (
            <div className="relative group">
              <button
                type="button"
                aria-label="Transport quick setup guide"
                className="text-gray-400 hover:text-primary-600 transition-colors rounded-full p-0.5"
              >
                <FiInfo size={18} />
              </button>
              <div
                role="tooltip"
                className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-lg opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
              >
                <p className="font-medium text-gray-900 mb-2">Quick setup</p>
                <ul className="space-y-1.5">
                  <li>
                    <strong>Vehicles</strong> — Add bus/van with driver details
                  </li>
                  <li>
                    <strong>Routes & Stops</strong> — Create route, add pickup stops with fees, assign a vehicle
                  </li>
                  <li>
                    <strong>Route Assignments</strong> — Assign students to route and stop (fee auto-fills)
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
