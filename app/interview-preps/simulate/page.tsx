import { ProtectedGate } from '../../../src/components/auth/RouteGuards'
import InterviewSimulation from '../../../src/views/InterviewSimulation'

export default function Page() {
  return (
    <ProtectedGate>
      <InterviewSimulation />
    </ProtectedGate>
  )
}
