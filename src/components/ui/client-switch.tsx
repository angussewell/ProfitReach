'use client';

import { Switch } from '@/components/ui/switch';

interface ClientSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void | Promise<void>;
}

export function ClientSwitch({ checked, onCheckedChange }: ClientSwitchProps) {
  return <Switch checked={checked} onCheckedChange={onCheckedChange} />;
} 