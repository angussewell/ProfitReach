'use client';

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface SequenceMetricCardProps {
  name: string;
  replyRate: number;
  activeContacts: number;
  totalContacts: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
}

export default function SequenceMetricCard({
  name,
  replyRate,
  activeContacts,
  totalContacts,
  trend,
  trendValue,
}: SequenceMetricCardProps) {
  const activeRate = (activeContacts / totalContacts) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
          ${trend === 'up' ? 'bg-green-100 text-green-800' : 
            trend === 'down' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'}`}>
          {trend === 'up' ? (
            <ArrowUpIcon className="w-4 h-4 mr-1" />
          ) : trend === 'down' ? (
            <ArrowDownIcon className="w-4 h-4 mr-1" />
          ) : null}
          {trendValue}%
        </span>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-500">Reply Rate</span>
            <span className="text-sm font-semibold text-gray-900">{replyRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${replyRate}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-500">Active Contacts</span>
            <span className="text-sm font-semibold text-gray-900">{activeRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full" 
              style={{ width: `${activeRate}%` }}
            />
          </div>
        </div>

        <div className="pt-2 flex justify-between text-sm text-gray-500">
          <span>{activeContacts} active</span>
          <span>{totalContacts} total</span>
        </div>
      </div>
    </div>
  );
} 