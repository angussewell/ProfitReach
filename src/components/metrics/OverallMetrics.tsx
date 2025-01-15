'use client';

interface OverallMetricsProps {
  totalSequences: number;
  averageReplyRate: number;
  totalActiveContacts: number;
  bestPerformingSequence: {
    name: string;
    replyRate: number;
  };
}

export default function OverallMetrics({
  totalSequences,
  averageReplyRate,
  totalActiveContacts,
  bestPerformingSequence,
}: OverallMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Active Sequences</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{totalSequences}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Average Reply Rate</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{averageReplyRate}%</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Active Contacts</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{totalActiveContacts}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500">Best Performing</h3>
        <p className="mt-2 text-lg font-semibold text-gray-900">{bestPerformingSequence.name}</p>
        <p className="text-sm text-green-600">{bestPerformingSequence.replyRate}% reply rate</p>
      </div>
    </div>
  );
} 