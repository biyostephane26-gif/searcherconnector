import Messages from '../../src/views/Messages'
import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import { Suspense } from 'react'

export default function Page() {
  return (
    <ProtectedGate>
      <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
        <Messages />
      </Suspense>
    </ProtectedGate>
  )
}
