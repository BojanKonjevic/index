import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Props {
  children: ReactNode
  className?: string
  narrow?: boolean
}

export function PageContainer({ children, className, narrow = false }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 md:px-8",
        narrow ? "max-w-[45rem]" : "max-w-[72rem]",
        className,
      )}
    >
      {children}
    </div>
  )
}
