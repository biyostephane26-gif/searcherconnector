import Dashboard from '../../src/views/Dashboard'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <Dashboard />
    </ProtectedGate>
  )
}
