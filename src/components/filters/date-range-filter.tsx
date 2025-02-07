'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, startOfMonth, endOfMonth, startOfYear, format, startOfDay, endOfDay } from 'date-fns';

type DateRange = {
  from: Date;
  to: Date;
};

type PredefinedRange = {
  label: string;
  value: string;
  getRange: () => DateRange;
};

const predefinedRanges: PredefinedRange[] = [
  {
    label: 'Today',
    value: 'today',
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 7 days',
    value: 'last7days',
    getRange: () => ({
      from: addDays(new Date(), -7),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    value: 'last30days',
    getRange: () => ({
      from: addDays(new Date(), -30),
      to: new Date(),
    }),
  },
  {
    label: 'This month',
    value: 'thisMonth',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Last month',
    value: 'lastMonth',
    getRange: () => ({
      from: startOfMonth(addDays(new Date(), -30)),
      to: endOfMonth(addDays(new Date(), -30)),
    }),
  },
  {
    label: 'Year to date',
    value: 'yearToDate',
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
  {
    label: 'All time',
    value: 'allTime',
    getRange: () => ({
      from: new Date(0), // Beginning of time
      to: new Date(),
    }),
  },
];

interface DateRangeFilterProps {
  onRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) {
  const [selectedRange, setSelectedRange] = React.useState<string>('last30days');

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    const range = predefinedRanges.find(r => r.value === value)?.getRange();
    if (range) {
      onRangeChange(range);
    }
  };

  React.useEffect(() => {
    // Set initial range
    const initialRange = predefinedRanges.find(r => r.value === selectedRange)?.getRange();
    if (initialRange) {
      onRangeChange(initialRange);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {predefinedRanges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 