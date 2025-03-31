'use client';

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar'; // We'll create this next

// Placeholder content components (replace with actual content later)
const AdminDashboardContent = () => <div className="p-6">Dashboard Content Area</div>;
const AdminLeadMagnetsContent = () => <div className="p-6">Lead Magnets Content Area (Placeholder)</div>;

export default function AdminViewManager() {
  const [activeView, setActiveView] = useState<'dashboard' | 'leadMagnets'>('dashboard');

  return (
    <div className="flex flex-1">
      <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto">
        {activeView === 'dashboard' && <AdminDashboardContent />}
        {activeView === 'leadMagnets' && <AdminLeadMagnetsContent />}
      </main>
    </div>
  );
} 