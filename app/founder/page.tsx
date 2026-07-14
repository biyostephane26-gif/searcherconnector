import Founder from '../../src/views/Founder'
import { FounderGate } from '../../src/components/auth/RouteGuards'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <FounderGate>
      <Founder />
    </FounderGate>
  )
}
