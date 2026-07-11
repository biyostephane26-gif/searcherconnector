import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  it('shows Top 10 Flamboyant section', () => {
    render(<PremiumOpportunitiesDashboard />);
    
    expect(screen.getByText(/Top 10 Flamboyant/i)).toBeInTheDocument();
  });

  it('shows Pipelines by Skills section', () => {
    render(<PremiumOpportunitiesDashboard />);
    
    expect(screen.getByText(/Pipelines par Compétences/i)).toBeInTheDocument();
  });

  it('displays opportunity count', () => {
    render(<PremiumOpportunitiesDashboard />);
    
    expect(screen.getByText(/opportunités correspondent parfaitement à ton profil/i)).toBeInTheDocument();
  });
});
