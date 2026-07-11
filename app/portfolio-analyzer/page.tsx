import { ProtectedGate } from '../../src/components/auth/RouteGuards'
import PortfolioAnalyzer from '../../src/views/PortfolioAnalyzer'
export default function Page() {
  return (
    <ProtectedGate>
      <PortfolioAnalyzer />
    </ProtectedGate>
  )
}
