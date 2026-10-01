import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { useI18n } from "@/hooks/useI18n"

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      aria-label={label}
      title={label}
      className="flex shrink-0 cursor-pointer items-center justify-center size-7 rounded-[0.375rem] text-[var(--text-hint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

export function Section({
  title,
  copyText,
  children,
}: {
  title: string
  copyText?: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <section className="overflow-hidden rounded-[0.625rem] border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-faint)] bg-[var(--bg-subtle)] px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[0.688rem] font-medium text-[var(--text-secondary)]">
          {title}
        </span>
        {copyText !== undefined && <CopyButton text={copyText} label={t("viewer.code_copy")} />}
      </div>
      {children}
    </section>
  )
}
