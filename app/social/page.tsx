import Social from '../../src/views/Social'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <Social />
    </ProtectedGate>
  )
}
