'use client';

import Link from 'next/link';
import Image from 'next/image'; // Added Image import
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // Assuming utils file exists for cn
import { Button } from '@/components/ui/button'; // Assuming Button component exists
import { LayoutDashboard, BarChart3, Package, LucideIcon, ArrowLeft } from 'lucide-react'; // Added ArrowLeft, Import LucideIcon type
import React from 'react'; // Import React

// Define an interface for the navigation items
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon; // Use the imported LucideIcon type
}


const AdminSidebar = () => {
  const pathname = usePathname();

  // Apply the interface to the array
  const navItems: NavItem[] = [
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/inventory', label: 'Inventory', icon: Package },
    // Add other top-level admin links here if needed in the future
  ];

  return (
    <aside className="w-64 border-r border-r-primary/10 bg-background pt-6 p-4 flex flex-col relative before:absolute before:left-0 before:top-0 before:w-[3px] before:h-full before:bg-gradient-to-b before:from-primary/80 before:to-primary/20 before:rounded"> {/* Added pt-6 */}
      {/* Logo and Back Button Section */}
      <div className="mb-6 flex flex-col space-y-3"> {/* Reduced mb-8 to mb-6, space-y-4 to space-y-3 */}
         {/* Logo */}
         <div className="flex items-center justify-center h-9"> {/* Reduced h-10 to h-9 */}
           <Image
             src="/TempShift Icon Logo.png?v=6"
             alt="TempShift Logo"
             width={36}
             height={36}
             className="h-9 w-9 object-contain"
             priority
           />
         </div>
         {/* Back Button */}
         <Button
           asChild
           variant="outline"
           className="w-full justify-start text-sm font-medium border-primary/20 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
           aria-label="Return to main application"
         >
           <Link href="/scenarios"> {/* Updated href */}
             <ArrowLeft className="mr-3 h-5 w-5 text-primary group-hover:translate-x-[-2px] transition-transform" /> {/* Adjusted icon size/margin */}
             Back to App
           </Link>
         </Button>
      </div>

      {/* Divider */}
      <hr className="my-3 border-border/50" /> {/* Adjusted margin */}

      {/* Navigation Section */}
      <nav className="flex flex-col space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon; // Explicitly assign the icon component
          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'secondary' : 'ghost'} // Keep secondary for active
              className={cn(
                "w-full justify-start transition-colors group h-10", // Added group here, increased height h-10
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none", // Added focus ring
                isActive 
                  ? "font-semibold text-secondary-foreground hover:bg-secondary/80" // Use secondary-foreground for active text, slightly darker hover
                  : "hover:bg-accent hover:text-accent-foreground text-muted-foreground" // Use accent for hover bg/text on inactive
              )}
            >
              <Link href={item.href} className="flex items-center w-full h-full"> {/* Ensure link fills button */}
                <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-secondary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} /> {/* Adjusted icon size/margin */}
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      {/* Optional: Add footer or user info section later */}
    </aside>
  );
};

export default AdminSidebar;
