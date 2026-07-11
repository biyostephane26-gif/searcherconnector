import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import FindWorker from '../../src/views/FindWorker'
export default function Page() {
  return (
    <ProtectedGate>
      <FindWorker />
    </ProtectedGate>
  )
}
