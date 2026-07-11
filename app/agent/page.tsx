import AgentDashboard from '../../src/views/AgentDashboard'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <ProtectedGate>
      <AgentDashboard />
    </ProtectedGate>
  )
}
