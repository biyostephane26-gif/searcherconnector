import Opportunities from '../../src/views/Opportunities'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <Opportunities />
    </ProtectedGate>
  )
}
