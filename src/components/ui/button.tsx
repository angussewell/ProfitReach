'use client';

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Bolder Button variants V2 - Aggressive Cohesion
const baseStyles = "inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] focus:scale-[1.02]";

const buttonVariants = cva(
  baseStyles,
  {
    variants: {
      variant: {
        // Aggressive Default: Light gray bg, thick dark border, bold font
        default: "bg-neutral-100 text-neutral-900 font-semibold border-2 border-neutral-500 shadow-sm hover:border-neutral-700 hover:shadow",
        
        // Aggressive Secondary: White bg, same thick dark border
        secondary: "bg-white text-neutral-800 font-medium border-2 border-neutral-500 hover:border-neutral-700 hover:bg-neutral-50",
        
        // Aggressive Outline: White bg, same thick dark border (identical to secondary visually, maybe remove or differentiate later if needed)
        outline: "bg-white text-neutral-800 font-medium border-2 border-neutral-500 hover:border-neutral-700 hover:bg-neutral-50", 
        
        // Aggressive Destructive: White bg, red text, thick red border
        destructive: "bg-white text-red-700 font-medium border-2 border-red-500 hover:bg-red-50 hover:border-red-700 focus-visible:ring-destructive",
        
        // Ghost: Unchanged - no border
        ghost: "text-gray-700 hover:bg-gray-100 border border-transparent",
        
        // Link: Unchanged
        link: "text-blue-600 underline-offset-4 hover:underline",
        
        // Subtle Gradient Warm V6: Subtle warm gradient bg (RGBA 15%), dark red text, consistent border
        "brand-gradient-warm": "text-[#ab213e] font-medium border-2 border-neutral-500 shadow-sm hover:border-neutral-700 hover:shadow [background-image:linear-gradient(to_top_right,rgba(237,173,82,0.15),rgba(233,61,61,0.15),rgba(171,33,62,0.15))]",
        
        // Subtle Gradient Cold V6: Subtle cold gradient bg (RGBA 15%), dark blue text, consistent border
        "brand-gradient-cold": "text-[#092843] font-medium border-2 border-neutral-500 shadow-sm hover:border-neutral-700 hover:shadow [background-image:linear-gradient(to_top_right,rgba(83,181,217,0.15),rgba(27,79,117,0.15),rgba(9,40,67,0.15))]", 
      },
      size: {
        // Standard: compact, visually balanced
        default: "h-10 px-5 py-2 rounded-lg",
        // Small: for compact UI
        sm: "h-9 px-3 py-1.5 text-sm rounded-lg",
        // Large: for emphasis
        lg: "h-12 px-6 py-2.5 rounded-lg",
        // Icon buttons: square, balanced
        icon: "h-10 w-10 p-2 rounded-lg flex items-center justify-center"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
