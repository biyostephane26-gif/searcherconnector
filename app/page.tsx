import Landing from '../src/views/Landing'
import { HomeGate } from '../src/components/auth/RouteGuards'

export default function Page() {
  return (
    <HomeGate>
      <Landing />
    </HomeGate>
  )
}
