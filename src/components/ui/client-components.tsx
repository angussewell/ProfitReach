'use client';

import { Button } from './button';
import { Input } from './input';
import { Card } from './card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { Upload, Plus, Search, X, Inbox, Loader2, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes } from 'react';
import * as SelectPrimitive from "@radix-ui/react-select";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";

// Re-export icons
export const ClientUploadIcon = Upload;
export const ClientPlusIcon = Plus;
export const ClientSearchIcon = Search;
export const ClientXIcon = X;
export const ClientInboxIcon = Inbox;
export const ClientLoaderIcon = Loader2;
export const ClientMessageSquareIcon = MessageSquare;

// Re-export components
export const ClientButton = Button;
export const ClientInput = Input;
export const ClientCard = Card;
export const ClientSelect = Select;
export const ClientSelectContent = SelectContent;
export const ClientSelectItem = SelectItem;
export const ClientSelectTrigger = SelectTrigger;
export const ClientSelectValue = SelectValue;
export const ClientCheckbox = Checkbox;
export const ClientSwitch = Switch; 