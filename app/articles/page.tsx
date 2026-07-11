import Articles from '../../src/views/Articles'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <ProtectedGate>
      <Articles />
    </ProtectedGate>
  )
}
