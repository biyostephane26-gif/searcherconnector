import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import Applications from '../../src/views/Applications'

export default function Page() {
  return (
    <ProtectedGate>
      <Applications />
    </ProtectedGate>
  )
}
