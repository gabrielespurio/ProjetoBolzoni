import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/10 outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:border-input/80",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
