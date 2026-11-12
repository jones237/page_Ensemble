// src/components/ui/button.tsx
import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => (
    <button
      className={`inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${className}`}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button }
