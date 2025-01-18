'use client';

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

interface SidebarProps {
  children: ReactNode;
  isOpen: boolean;
}

export function Sidebar({ children, isOpen }: SidebarProps) {
  return (
    <motion.div
      style={{
        width: isOpen ? '240px' : '0px',
        overflow: 'hidden',
        transition: 'width 0.1s ease'
      }}
    >
      {children}
    </motion.div>
  );
}

export const SidebarBody = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <>
      <DesktopSidebar className={className}>{children}</DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
};

interface DesktopSidebarProps extends React.ComponentProps<typeof motion.div> {
  children: React.ReactNode;
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: DesktopSidebarProps) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full hidden md:flex md:flex-col bg-[#213343] text-white flex-shrink-0 border-r border-[#2d4454] shadow-lg",
        "transition-all duration-100 ease-in-out",
        className
      )}
      animate={{
        width: animate ? (open ? "250px" : "64px") : "250px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      <div className="flex items-center justify-center h-16 px-4 border-b border-[#2d4454]">
        <img 
          src={open ? "/HubSpot Logo Black and White.png" : "/HubSpot Logo.png"}
          alt="HubSpot Logo" 
          className={cn(
            "transition-all duration-100",
            open ? "w-36" : "w-8"
          )} 
        />
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {children}
      </div>
    </motion.div>
  );
};

interface MobileSidebarProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export const MobileSidebar = ({
  className,
  children,
  ...props
}: MobileSidebarProps) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-16 px-4 flex md:hidden items-center justify-between bg-[#213343] text-white w-full border-b border-[#2d4454]",
          "fixed top-0 left-0 right-0 z-50"
        )}
        {...props}
      >
        <div className="flex items-center">
          <img 
            src="/HubSpot Logo.png"
            alt="HubSpot Logo" 
            className="w-8 h-8"
          />
        </div>
        <Menu
          className="text-white cursor-pointer hover:text-[#cbd6e2] transition-colors"
          onClick={() => setOpen(!open)}
        />
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.1,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed inset-0 bg-[#213343] p-6 z-[100]",
                "flex flex-col",
                className
              )}
            >
              <div className="flex items-center justify-between mb-8">
                <img 
                  src="/HubSpot Logo Black and White.png"
                  alt="HubSpot Logo" 
                  className="w-36"
                />
                <X
                  className="text-white cursor-pointer hover:text-[#cbd6e2] transition-colors"
                  onClick={() => setOpen(false)}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="h-16 md:hidden" /> {/* Spacer for fixed header */}
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open } = useSidebar();
  const pathname = usePathname();
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-100",
        "hover:bg-[#2d4454] group relative overflow-hidden",
        isActive && "bg-[#2d4454] text-white",
        !isActive && "text-[#cbd6e2] hover:text-white",
        className
      )}
      {...props}
    >
      <div className="w-8 h-8 flex items-center justify-center relative z-10 -ml-0.5">
        {React.cloneElement(link.icon as React.ReactElement, {
          className: cn(
            "w-5 h-5 transition-all duration-100",
            isActive ? "text-white" : "text-[#cbd6e2] group-hover:text-white"
          ),
        })}
      </div>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className={cn(
              "font-medium whitespace-nowrap relative z-10",
              isActive ? "text-white" : "text-[#cbd6e2] group-hover:text-white"
            )}
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#ff7a59] to-[#ff957a] opacity-10"
          layoutId="activeBackground"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </Link>
  );
}; 