"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-base outline-none transition-[background-color,border-color,color,box-shadow] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-2 focus-visible:ring-ring/28 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 data-loading:select-none data-loading:text-transparent sm:text-sm [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 px-[calc(--spacing(3)-1px)] sm:h-8",
        icon: "size-9 sm:size-8",
        lg: "h-10 px-[calc(--spacing(3.5)-1px)] sm:h-9",
        md: "h-9 px-[calc(--spacing(3)-1px)] sm:h-8",
        sm: "h-8 gap-1.5 px-[calc(--spacing(2.5)-1px)] sm:h-7",
      },
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-[0_16px_30px_-20px_rgba(17,17,17,0.42)] hover:bg-primary/92 data-pressed:bg-primary/92 *:data-[slot=button-loading-indicator]:text-primary-foreground",
        primary:
          "border-primary bg-primary text-primary-foreground shadow-[0_16px_30px_-20px_rgba(17,17,17,0.42)] hover:bg-primary/92 data-pressed:bg-primary/92 *:data-[slot=button-loading-indicator]:text-primary-foreground",
        destructive:
          "border-destructive bg-destructive text-white shadow-[0_16px_30px_-20px_rgba(220,38,38,0.38)] hover:bg-destructive/92 data-pressed:bg-destructive/92 *:data-[slot=button-loading-indicator]:text-white",
        danger:
          "border-destructive bg-destructive text-white shadow-[0_16px_30px_-20px_rgba(220,38,38,0.38)] hover:bg-destructive/92 data-pressed:bg-destructive/92 *:data-[slot=button-loading-indicator]:text-white",
        ghost:
          "border-transparent text-foreground hover:bg-muted data-pressed:bg-muted *:data-[slot=button-loading-indicator]:text-foreground",
        link:
          "border-transparent text-foreground underline-offset-4 hover:underline data-pressed:underline *:data-[slot=button-loading-indicator]:text-foreground",
        outline:
          "border-input bg-white text-foreground shadow-none hover:bg-muted/80 data-pressed:bg-muted/80 *:data-[slot=button-loading-indicator]:text-foreground",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/80 data-pressed:bg-secondary/80 *:data-[slot=button-loading-indicator]:text-secondary-foreground",
        success:
          "border-success bg-success text-white shadow-[0_16px_30px_-20px_rgba(21,128,61,0.35)] hover:bg-success/92 data-pressed:bg-success/92 *:data-[slot=button-loading-indicator]:text-white",
      },
    },
  }
)

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"]
type ButtonSize = VariantProps<typeof buttonVariants>["size"]

export interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  className,
  variant,
  size,
  render,
  children,
  loading = false,
  disabled: disabledProp,
  ...props
}: ButtonProps): React.ReactElement {
  const isDisabled = Boolean(loading || disabledProp)
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] = render ? undefined : "button"

  const defaultProps = {
    children: (
      <>
        {children}
        {loading && (
          <Spinner
            className="pointer-events-none absolute size-4"
            data-slot="button-loading-indicator"
          />
        )}
      </>
    ),
    className: cn(buttonVariants({ className, size, variant })),
    "aria-disabled": loading || undefined,
    "data-loading": loading ? "" : undefined,
    "data-slot": "button",
    disabled: isDisabled,
    type: typeValue,
  }

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  })
}
