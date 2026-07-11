import { ProtectedGate } from '../../../src/components/auth/RouteGuards'
import GroupDetail from '../../../src/views/GroupDetail'

export default function Page() {
  return <ProtectedGate><GroupDetail /></ProtectedGate>
}
