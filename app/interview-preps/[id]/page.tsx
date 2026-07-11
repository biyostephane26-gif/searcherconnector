import InterviewPrepDetail from '../../../src/views/InterviewPrepDetail'
import { ProtectedGate } from '../../../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <ProtectedGate>
      <InterviewPrepDetail />
    </ProtectedGate>
  )
}
