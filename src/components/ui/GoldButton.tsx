import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  variant?: 'filled' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

export default function GoldButton({
  children, onClick, loading, variant = 'filled', size = 'md',
  className = '', disabled, type = 'button', fullWidth
}: Props) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  }
  
  const base = `rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''}`
  const filled = 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F5E6A3] disabled:opacity-50'
  const outlined = 'border border-[#D4AF37] text-[#D4AF37] hover:bg-[#1A1500] disabled:opacity-50'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variant === 'filled' ? filled : outlined} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
