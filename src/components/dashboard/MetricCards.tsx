import Card from '../ui/Card'
import { Briefcase, Send, MessageSquare, Target } from 'lucide-react'

type Props = {
  stats: {
    found: number
    applied: number
    responses: number
    avgScore: number
  }
}

export default function MetricCards({ stats }: Props) {
  const items = [
    { label: 'Found', value: stats.found, icon: <Briefcase className="w-4 h-4" /> },
    { label: 'Applied', value: stats.applied, icon: <Send className="w-4 h-4" /> },
    { label: 'Responses', value: stats.responses, icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Avg Score', value: `${stats.avgScore}/100`, icon: <Target className="w-4 h-4" /> },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] tracking-widest uppercase font-bold mb-2">
            {item.icon}
            {item.label}
          </div>
          <div className="text-3xl font-bold text-[#D4AF37]">{item.value}</div>
        </Card>
      ))}
    </div>
  )
}
