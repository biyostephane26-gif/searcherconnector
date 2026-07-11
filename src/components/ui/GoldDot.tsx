export default function GoldDot({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  return (
    <span className={`inline-block ${s} rounded-full bg-[#D4AF37] animate-pulse`} />
  )
}
