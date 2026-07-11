import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import OpportunityCreator from '../../src/views/OpportunityCreator'
export default function Page() {
  return <ProtectedGate><OpportunityCreator /></ProtectedGate>
}
