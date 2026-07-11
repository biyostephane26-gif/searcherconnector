import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import TalentSearch from '../../src/views/TalentSearch'
export default function Page() {
  return (
    <ProtectedGate>
      <TalentSearch />
    </ProtectedGate>
  )
}
