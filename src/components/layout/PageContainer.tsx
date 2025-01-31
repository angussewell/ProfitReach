import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className={cn(
        "container mx-auto px-6 py-8 max-w-7xl",
        className
      )}>
        {children}
      </div>
    </div>
  )
} 