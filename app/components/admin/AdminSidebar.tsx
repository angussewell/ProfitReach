import React from 'react';
import { LayoutDashboard, Magnet } from 'lucide-react'; // Using lucide icons for consistency

type AdminSidebarProps = {
  activeView: 'dashboard' | 'leadMagnets';
  setActiveView: (view: 'dashboard' | 'leadMagnets') => void;
};

// Basic Link component styling (adapt as needed for your design system)
const SidebarLink = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out 
      ${isActive
        ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
      }
    `}
  >
    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
    <span>{label}</span>
  </button>
);

export default function AdminSidebar({ activeView, setActiveView }: AdminSidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col p-4">
      {/* Placeholder for Logo/Title if needed */}
      <div className="mb-6 text-center">
        <span className="text-xl font-semibold text-gray-800 dark:text-white">Admin Panel</span>
        {/* Replace with your logo component if desired */}
        {/* <img src="/logo.png" alt="Logo" className="h-8 w-auto mx-auto mt-2" /> */}
      </div>

      <nav className="flex-1 space-y-1">
        <SidebarLink
          icon={LayoutDashboard}
          label="Dashboard"
          isActive={activeView === 'dashboard'}
          onClick={() => setActiveView('dashboard')}
        />
        <SidebarLink
          icon={Magnet} // Using Magnet icon for Lead Magnets
          label="Lead Magnets"
          isActive={activeView === 'leadMagnets'}
          onClick={() => setActiveView('leadMagnets')}
        />
        {/* Add more links here as needed */}
      </nav>

      {/* Optional Footer Area */}
      {/* <div className="mt-auto"> ... </div> */}
    </aside>
  );
} 