import React from 'react';
import { IconType } from 'react-icons';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  color?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}

