import { ProtectedGate } from '../../../../src/components/auth/RouteGuards'
import EditApplicationStatus from '../../../../src/views/EditApplicationStatus'

export default function Page() {
  return (
    <ProtectedGate>
      <EditApplicationStatus />
    </ProtectedGate>
  )
}
