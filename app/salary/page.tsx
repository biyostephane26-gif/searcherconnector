import Salary from '../../src/views/Salary'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <Salary />
    </ProtectedGate>
  )
}
