import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Next.js image
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => 
    `<img src="${src}" alt="${alt}" {...props} />`
  ),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    }),
  },
});

// Mock MediaRecorder
class MockMediaRecorder {
  ondataavailable: (e: any) => void = () => {};
  onstop: () => void = () => {};
  state = 'inactive';
  start = vi.fn();
  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  });
  constructor() {
    this.state = 'inactive';
  }
}
Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: MockMediaRecorder,
});

// Mock ioredis (BullMQ)
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock Supabase
vi.mock('./src/lib/supabase', () => {
  // Create a mock object that supports method chaining
  const createMockChain = () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  return {
    supabase: {
      from: vi.fn().mockReturnValue(createMockChain()),
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    },
  };
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
