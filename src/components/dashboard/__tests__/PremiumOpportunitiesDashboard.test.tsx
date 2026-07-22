import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PremiumOpportunitiesDashboard from '../PremiumOpportunitiesDashboard';

// Mock the auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: {
      id: 'test-user',
      plan: 'pro',
      verification_status: 'verified',
      domain: 'Développeur'
    }
  })
}));

describe('PremiumOpportunitiesDashboard', () => {
  // Le composant fait un vrai fetch Supabase asynchrone (données réelles,
  // plus de mock instantané — voir le fix "fausses opportunités factices").
  // Un seul test avec plusieurs assertions après résolution : trois tests
  // séparés dans le même describe se montaient sans démontage entre eux
  // (pas de cleanup() automatique ici), ce qui rendait les requêtes
  // findByText indépendantes non fiables selon l'ordre d'exécution.
  it('renders with real fetched data once loaded', async () => {
    render(<PremiumOpportunitiesDashboard />);

    expect(await screen.findByText(/opportunités correspondent parfaitement à ton profil/i, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/Top 10 Flamboyant/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipelines par Compétences/i)).toBeInTheDocument();
  });
});
