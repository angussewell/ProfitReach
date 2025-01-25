import * as React from 'react';
import { Bell, Settings } from 'lucide-react';

export default function TopNav() {
  return (
    <nav className="h-16 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center">
        <div className="flex flex-1 items-center justify-end space-x-4">
          <button className="h-9 w-9 rounded-full hover:bg-accent hover:text-accent-foreground flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </button>
          <button className="h-9 w-9 rounded-full hover:bg-accent hover:text-accent-foreground flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-brand-primary to-brand-primary-dark" />
        </div>
      </div>
    </nav>
  );
} 