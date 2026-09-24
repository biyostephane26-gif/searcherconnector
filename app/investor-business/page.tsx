import InvestorBusiness from '../../src/views/InvestorBusiness'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <InvestorBusiness />
    </ProtectedGate>
  )
}
