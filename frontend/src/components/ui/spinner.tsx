import { Loader2Icon } from "lucide-react"
import type React from "react"

import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.ComponentProps<typeof Loader2Icon> {
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
}

export function Spinner({
  className,
  size = "md",
  ...props
}: SpinnerProps): React.ReactElement {
  return (
    <Loader2Icon
      aria-label="Loading"
      className={cn("animate-spin", sizeClasses[size], className)}
      role="status"
      {...props}
    />
  )
}
