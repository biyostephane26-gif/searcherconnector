import { ProtectedGate } from '../../../src/components/auth/RouteGuards'
import ApplicationDetail from '../../../src/views/ApplicationDetail'

export default function Page() {
  return <ProtectedGate><ApplicationDetail /></ProtectedGate>
}
