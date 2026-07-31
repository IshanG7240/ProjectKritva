import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-body font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-mk-navy text-white hover:bg-mk-navy-hover",
        default: "bg-mk-navy text-white hover:bg-mk-navy-hover",
        secondary:
          "bg-white text-mk-ink border-mk-border hover:bg-mk-surface-2",
        outline:
          "bg-white text-mk-ink border-mk-border hover:bg-mk-surface-2",
        ghost: "bg-transparent text-mk-ink hover:bg-mk-surface-2",
        danger: "bg-danger text-white hover:bg-danger/90",
        destructive: "bg-danger text-white hover:bg-danger/90",
        link:
          "text-mk-navy underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        default: "h-11 px-4",
        lg: "h-12 px-5",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
