import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import Groups from '../../src/views/Groups'

export default function Page() {
  return <ProtectedGate><Groups /></ProtectedGate>
}
