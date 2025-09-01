import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.location
delete (window as any).location;
(window as any).location = { href: 'http://localhost:3000' };

// Mock react-router-dom globally
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    MemoryRouter: ({ children }: any) => React.createElement('div', { 'data-testid': 'memory-router' }, children),
    useNavigate: () => vi.fn(),
  };
});

// Mock console methods to reduce test output noise
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Setup for Material-UI components
// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};