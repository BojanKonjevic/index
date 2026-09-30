import { FileText, FileVideo, FileImage, FileCode, Globe } from "lucide-react"

export const typeBadgeStyles: Record<string, string> = {
  pdf: "bg-[var(--type-pdf-bg)] text-[var(--type-pdf-text)]",
  video: "bg-[var(--type-video-bg)] text-[var(--type-video-text)]",
  image: "bg-[var(--type-image-bg)] text-[var(--type-image-text)]",
  text: "bg-[var(--type-text-bg)] text-[var(--type-text-text)]",
  html: "bg-[var(--type-text-bg)] text-[var(--type-text-text)]",
}

export const typeTagStyles: Record<string, { container: string; icon: string }> = {
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
  text: {
    container: "border-[var(--type-text-text)] bg-[var(--type-text-bg)]",
    icon: "text-[var(--type-text-text)]",
  },
  html: {
    container: "border-[var(--type-text-text)] bg-[var(--type-text-bg)]",
    icon: "text-[var(--type-text-text)]",
  },
}

export const typeIconMap: Record<string, typeof FileText> = {
  pdf: FileText,
  video: FileVideo,
  image: FileImage,
  text: FileCode,
  html: Globe,
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
