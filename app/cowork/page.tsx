import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import Cowork from '../../src/views/Cowork'
export default function Page() {
  return <ProtectedGate><Cowork /></ProtectedGate>
}
