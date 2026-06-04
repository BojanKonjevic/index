import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const srMonths = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
]

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return `${d.getDate()}. ${srMonths[d.getMonth()]}`
}

export function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso + "T00:00:00")
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "upravo"
  if (mins < 60) return `pre ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `pre ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "juče"
  return `pre ${days} dana`
}
