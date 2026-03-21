import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-[#E8ECF0] text-[#1B2A4A]',
        verified: 'bg-[#DCFCE7] text-[#1A7A4A]',
        pending: 'bg-[#FEF3C7] text-[#B45309]',
        rejected: 'bg-[#FEE2E2] text-[#C41A1A]',
        expired: 'bg-[#F3F4F6] text-[#6B7280]',
        navy: 'bg-[#1B2A4A] text-white',
        swiss: 'bg-[#D4001A] text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
