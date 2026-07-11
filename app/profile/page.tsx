import Profile from '../../src/views/Profile'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <ProtectedGate>
      <Profile />
    </ProtectedGate>
  )
}
