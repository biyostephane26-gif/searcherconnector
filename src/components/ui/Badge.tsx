type Status = 'pending' | 'verified' | 'genius' | 'refused' | 'free' | 'active' | 'suspicious'

const config: Record<Status, { label: string; className: string }> = {
  pending:   { label: 'PENDING',   className: 'border border-gray-600 text-gray-400 bg-gray-900' },
  verified:  { label: 'VERIFIED',  className: 'border border-[#D4AF37] text-[#D4AF37] bg-[#1A1500]' },
  genius:    { label: 'GENIUS',    className: 'border-2 border-[#D4AF37] text-[#D4AF37] bg-[#1A1500] shadow-[0_0_10px_rgba(212,175,55,0.3)]' },
  refused:   { label: 'REFUSED',   className: 'border border-red-800 text-red-400 bg-red-950' },
  free:      { label: 'FREE',      className: 'border border-gray-700 text-gray-500 bg-gray-900' },
  active:    { label: 'ACTIVE',    className: 'border border-green-700 text-green-400 bg-green-950' },
  suspicious:{ label: 'SUSPICIOUS',className: 'border border-red-700 text-red-400 bg-red-950' },
}

export default function Badge({ status }: { status: Status }) {
  const c = config[status] || config.pending
  return (
    <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded ${c.className}`}>
      {c.label}
    </span>
  )
}
