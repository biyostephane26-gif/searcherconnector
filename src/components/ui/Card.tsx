import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  gold?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', gold, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#111111] rounded-xl p-4
        ${gold ? 'border border-[#D4AF37]' : 'border border-[#2a2a2a]'}
        ${onClick ? 'cursor-pointer hover:border-[#D4AF37] transition-colors duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
