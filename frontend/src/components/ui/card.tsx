import React from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'subtle' | 'hero' | 'outline'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClassName = {
      default:
        'border border-border/80 bg-white shadow-[0_20px_48px_-34px_rgba(17,17,17,0.16)]',
      subtle:
        'border border-border/70 bg-muted/45 shadow-[0_16px_40px_-34px_rgba(17,17,17,0.08)]',
      hero:
        'border border-border/80 bg-white shadow-[0_28px_72px_-46px_rgba(17,17,17,0.22)]',
      outline:
        'border border-border/80 bg-white shadow-none',
    } satisfies Record<CardVariant, string>

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[28px] text-text-primary',
          variantClassName[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-2 p-6 pb-4', className)}
        {...props}
      />
    )
  },
)

CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('font-heading text-xl font-semibold leading-tight tracking-tight text-text-primary', className)}
        {...props}
      />
    )
  },
)

CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm leading-6 text-text-secondary', className)}
        {...props}
      />
    )
  },
)

CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 pt-0', className)}
        {...props}
      />
    )
  },
)

CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 border-t border-border/60 bg-muted/40 px-6 py-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
        {...props}
      />
    )
  },
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
