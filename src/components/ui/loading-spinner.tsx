import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size }), className)}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }