import Transactions from '../../src/views/Transactions'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <ProtectedGate>
      <Transactions />
    </ProtectedGate>
  )
}
