import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { createHash } from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCHF(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function hashIpAddress(ip: string): string {
  return createHash('sha256').update(ip + process.env.NEXTAUTH_SECRET).digest('hex').slice(0, 16)
}

export function computeRentEligibilityRange(monthlyIncomeChf: number): {
  min: number
  max: number
} {
  // Swiss standard: income must be 3× rent
  // Show range rather than exact income
  const max = Math.floor(monthlyIncomeChf / 3 / 100) * 100 // round down to nearest 100
  const min = Math.max(0, max - 500)
  return { min, max }
}

export function qualifiesForRent(
  monthlyIncomeChf: number | null,
  monthlyRentChf: number
): boolean {
  if (!monthlyIncomeChf) return false
  return monthlyIncomeChf >= monthlyRentChf * 3
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(date: Date | string | null, days = 30): boolean {
  if (!date) return false
  return daysUntil(date) <= days && daysUntil(date) > 0
}

export function isExpired(date: Date | string | null): boolean {
  if (!date) return false
  return daysUntil(date) <= 0
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateCertificateExpiry(daysFromNow = 90): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d
}

export function getAvatarInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
