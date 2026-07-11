import InterviewPreps from '../../src/views/InterviewPreps'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <ProtectedGate>
      <InterviewPreps />
    </ProtectedGate>
  )
}
