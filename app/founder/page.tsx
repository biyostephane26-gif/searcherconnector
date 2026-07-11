import Founder from '../../src/views/Founder'
import { FounderGate } from '../../src/components/auth/RouteGuards'
export default function Page() {
  return (
    <FounderGate>
      <Founder />
    </FounderGate>
  )
}
