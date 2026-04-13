"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    className={cn(
      "flex h-10 w-full items-center rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 has-[:disabled]:opacity-50",
      className
    )}
    {...props}
  />
))
InputGroup.displayName = "InputGroup"

const inputGroupAddonVariants = cva(
  "flex h-auto items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3",
        "inline-end": "order-last pr-3",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof inputGroupAddonVariants>
>(({ className, align = "inline-start", ...props }, ref) => (
  <div
    ref={ref}
    data-align={align}
    className={cn(inputGroupAddonVariants({ align }), className)}
    {...props}
  />
))
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, variant = "ghost", size = "sm", type = "button", ...props }, ref) => (
  <Button
    ref={ref}
    type={type}
    variant={variant}
    size={size}
    className={cn("shadow-none", className)}
    {...props}
  />
))
InputGroupButton.displayName = "InputGroupButton"

const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  />
))
InputGroupText.displayName = "InputGroupText"

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      "flex-1 border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
))
InputGroupInput.displayName = "InputGroupInput"

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn(
      "flex-1 resize-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
))
InputGroupTextarea.displayName = "InputGroupTextarea"

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
