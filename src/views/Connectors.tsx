'use client'

import { useRouter } from 'next/navigation'
import Sidebar from '../components/layout/Sidebar'
import ConnectorsPanel from '../components/cowork/ConnectorsPanel'
import type { CoworkTool } from '../components/cowork/ToolAttachment'

// Page dédiée aux connecteurs — même panneau que l'onglet Connecteurs de
// SCAI Cowork, accessible directement depuis le menu latéral.
export default function Connectors() {
  const router = useRouter()

  const onUseTool = (id: string) => {
    const tools: CoworkTool[] = ['pdf', 'excel', 'word', 'image', 'video']
    if (tools.includes(id as CoworkTool)) router.push(`/agent?tool=${id}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">Connecteurs</h2>
        </header>
        <div className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
          <ConnectorsPanel onUseTool={onUseTool} />
        </div>
      </main>
    </div>
  )
}
