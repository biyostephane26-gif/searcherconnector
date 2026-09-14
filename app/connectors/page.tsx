import Connectors from '../../src/views/Connectors'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <ProtectedGate>
      <Connectors />
    </ProtectedGate>
  )
}
