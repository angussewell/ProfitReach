'use client';

import { Button } from './button';
import { Input } from './input';
import { Card } from './card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { Upload, Plus, Search, X } from 'lucide-react';
import type { FC } from 'react';
import type { LucideProps } from 'lucide-react';

// Re-export icons with proper typing
export const ClientUploadIcon: FC<LucideProps> = Upload;
export const ClientPlusIcon: FC<LucideProps> = Plus;
export const ClientSearchIcon: FC<LucideProps> = Search;
export const ClientXIcon: FC<LucideProps> = X;

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