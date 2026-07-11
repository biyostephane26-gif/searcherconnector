import Signup from '../../src/views/Signup'
import { Suspense } from 'react'
import LoadingScreen from '../../src/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Signup />
    </Suspense>
  )
}
