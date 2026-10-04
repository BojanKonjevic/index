import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Props {
  icon?: ReactNode
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, message, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-[0.563rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-12 text-center",
        className,
      )}
    >
      {icon}
      {title && <p className="text-[0.875rem] font-medium text-[var(--text-primary)]">{title}</p>}
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      {action}
    </div>
  )
}
