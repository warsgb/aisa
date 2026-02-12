import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-700',
  }
  
  const sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-6 text-base',
  }
  
  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
  
  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  )
}
