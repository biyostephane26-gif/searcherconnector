import Settings from '../../src/views/Settings'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <Settings />
    </ProtectedGate>
  )
}
