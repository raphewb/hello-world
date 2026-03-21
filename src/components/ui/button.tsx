import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[6px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#1B2A4A] text-white hover:bg-[#152038] focus-visible:ring-[#1B2A4A]',
        destructive: 'bg-[#C41A1A] text-white hover:bg-[#a81616] focus-visible:ring-[#C41A1A]',
        outline: 'border border-[#E8ECF0] bg-white text-[#1B2A4A] hover:bg-[#F7F8FA]',
        ghost: 'text-[#1B2A4A] hover:bg-[#F7F8FA]',
        link: 'text-[#1B2A4A] underline-offset-4 hover:underline p-0 h-auto',
        swiss: 'bg-[#D4001A] text-white hover:bg-[#b8001a] focus-visible:ring-[#D4001A]',
        success: 'bg-[#1A7A4A] text-white hover:bg-[#15623b]',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
