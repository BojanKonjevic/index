import {
  FileText,
  FileVideo,
  FileImage,
  FileCode2,
  ScrollText,
  NotebookText,
  Database,
  Table,
  Globe,
} from "lucide-react"
import { formatOf, type FormatKey } from "@/lib/format"

export const formatBadgeStyles: Record<FormatKey, string> = {
  pdf: "bg-[var(--type-pdf-bg)] text-[var(--type-pdf-text)]",
  video: "bg-[var(--type-video-bg)] text-[var(--type-video-text)]",
  image: "bg-[var(--type-image-bg)] text-[var(--type-image-text)]",
  html: "bg-[var(--type-html-bg)] text-[var(--type-html-text)]",
  md: "bg-[var(--type-md-bg)] text-[var(--type-md-text)]",
  txt: "bg-[var(--type-txt-bg)] text-[var(--type-txt-text)]",
  py: "bg-[var(--type-py-bg)] text-[var(--type-py-text)]",
  sql: "bg-[var(--type-text-bg)] text-[var(--type-text-text)]",
  csv: "bg-[var(--type-text-bg)] text-[var(--type-text-text)]",
}

export const formatTagStyles: Record<FormatKey, { container: string; icon: string }> = {
  pdf: {
    container: "border-[var(--type-pdf-text)] bg-[var(--type-pdf-bg)]",
    icon: "text-[var(--type-pdf-text)]",
  },
  video: {
    container: "border-[var(--type-video-text)] bg-[var(--type-video-bg)]",
    icon: "text-[var(--type-video-text)]",
  },
  image: {
    container: "border-[var(--type-image-text)] bg-[var(--type-image-bg)]",
    icon: "text-[var(--type-image-text)]",
  },
  html: {
    container: "border-[var(--type-html-text)] bg-[var(--type-html-bg)]",
    icon: "text-[var(--type-html-text)]",
  },
  md: {
    container: "border-[var(--type-md-text)] bg-[var(--type-md-bg)]",
    icon: "text-[var(--type-md-text)]",
  },
  txt: {
    container: "border-[var(--type-txt-text)] bg-[var(--type-txt-bg)]",
    icon: "text-[var(--type-txt-text)]",
  },
  py: {
    container: "border-[var(--type-py-text)] bg-[var(--type-py-bg)]",
    icon: "text-[var(--type-py-text)]",
  },
  sql: {
    container: "border-[var(--type-text-text)] bg-[var(--type-text-bg)]",
    icon: "text-[var(--type-text-text)]",
  },
  csv: {
    container: "border-[var(--type-text-text)] bg-[var(--type-text-bg)]",
    icon: "text-[var(--type-text-text)]",
  },
}

export const formatIconMap: Record<FormatKey, typeof FileText> = {
  pdf: FileText,
  video: FileVideo,
  image: FileImage,
  html: Globe,
  md: NotebookText,
  txt: ScrollText,
  py: FileCode2,
  sql: Database,
  csv: Table,
}

export const formatLabelKeys: Record<FormatKey, string> = {
  pdf: "materialType.pdf",
  video: "materialType.video",
  image: "materialType.image",
  html: "materialType.html",
  md: "materialType.md",
  txt: "materialType.text",
  py: "materialType.py",
  sql: "materialType.sql",
  csv: "materialType.csv",
}

export function formatVisual(fileType: string, url?: string | null) {
  const format = formatOf(fileType, url)
  return {
    format,
    Icon: formatIconMap[format],
    tag: formatTagStyles[format],
    badge: formatBadgeStyles[format],
    labelKey: formatLabelKeys[format],
  }
}

export const categoryBadgeStyles: Record<string, string> = {
  theory: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
  problems: "bg-[var(--status-later-bg)] text-[var(--status-later-text)]",
  exam: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
  k1: "bg-[var(--status-mid-bg)] text-[var(--status-mid-text)]",
  k2: "bg-[var(--status-mid-bg)] text-[var(--status-mid-text)]",
  final: "bg-[var(--status-soon-bg)] text-[var(--status-soon-text)]",
  misc: "bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
}
