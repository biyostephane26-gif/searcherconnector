import GoldDot from '../ui/GoldDot'

export default function ScanningBar({ isScanning }: { isScanning: boolean }) {
  const platforms = ['LinkedIn', 'Indeed', 'Reddit', 'GitHub', 'YouTube', 'Upwork', 'Crunchbase', 'Glassdoor']

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
      {platforms.map((p) => (
        <div 
          key={p}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold tracking-widest uppercase transition-all duration-500
            ${isScanning ? 'border-[#D4AF37] text-[#D4AF37] bg-[#1A1500]' : 'border-[#2a2a2a] text-gray-500 bg-[#111111]'}
          `}
        >
          {isScanning && <GoldDot />}
          {p}
        </div>
      ))}
    </div>
  )
}
