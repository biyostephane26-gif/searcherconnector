import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import Referrals from '../../src/views/Referrals'

export default function Page() {
  return (
    <ProtectedGate>
      <Referrals />
    </ProtectedGate>
  )
}
