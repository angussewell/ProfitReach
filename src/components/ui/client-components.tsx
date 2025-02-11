'use client';

import { Button } from './button';
import { Input } from './input';
import { Card } from './card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { Upload, Plus, Search, X, Inbox, Loader2, MessageSquare } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactElement, FC } from 'react';
import * as SelectPrimitive from "@radix-ui/react-select";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";

// Create a wrapper component for Lucide icons
const IconWrapper = ({ icon: Icon, ...props }: { icon: LucideIcon } & LucideProps) => {
  return <Icon {...props} />;
};

// Re-export icons as wrapped components
export const ClientUploadIcon = (props: LucideProps) => <Upload {...props} />;
export const ClientPlusIcon = (props: LucideProps) => <Plus {...props} />;
export const ClientSearchIcon = (props: LucideProps) => <Search {...props} />;
export const ClientXIcon = (props: LucideProps) => <X {...props} />;
export const ClientInboxIcon = (props: LucideProps) => <Inbox {...props} />;
export const ClientLoaderIcon = (props: LucideProps) => <Loader2 {...props} />;
export const ClientMessageSquareIcon = (props: LucideProps) => <MessageSquare {...props} />;

// Create wrapper components for UI components
const ButtonWrapper = (props: ComponentProps<typeof Button>) => <Button {...props} />;
const InputWrapper = (props: ComponentProps<typeof Input>) => <Input {...props} />;
const CardWrapper = (props: ComponentProps<typeof Card>) => <Card {...props} />;
const SwitchWrapper = (props: ComponentProps<typeof Switch>) => <Switch {...props} />;

// Re-export components as wrapped components
export const ClientButton = ButtonWrapper;
export const ClientInput = InputWrapper;
export const ClientCard = CardWrapper;
export const ClientSelect = Select;
export const ClientSelectContent = SelectContent;
export const ClientSelectItem = SelectItem;
export const ClientSelectTrigger = SelectTrigger;
export const ClientSelectValue = SelectValue;
export const ClientCheckbox = Checkbox;
export const ClientSwitch = SwitchWrapper; 