import Card from '../ui/Card'
import { Briefcase, Send, MessageSquare, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Props = {
  stats: {
    found: number
    applied: number
    responses: number
    avgScore: number
  }
}

export default function MetricCards({ stats }: Props) {
  const { t } = useTranslation()
  const items = [
    { label: t('metrics.found'), value: stats.found, icon: <Briefcase className="w-4 h-4" /> },
    { label: t('metrics.applied'), value: stats.applied, icon: <Send className="w-4 h-4" /> },
    { label: t('metrics.responses'), value: stats.responses, icon: <MessageSquare className="w-4 h-4" /> },
    { label: t('metrics.avgScore'), value: `${stats.avgScore}/100`, icon: <Target className="w-4 h-4" /> },
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
