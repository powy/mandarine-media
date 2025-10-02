import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock localStorage globally with actual storage
const createStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] !== undefined ? store[key] : null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
};

const localStorageMock = createStorageMock();
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const sessionStorageMock = createStorageMock();
Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock FormData as a class that tracks appended data
class MockFormData {
  private data: Map<string, any[]> = new Map();

  append = vi.fn((key: string, value: any) => {
    const existing = this.data.get(key) || [];
    this.data.set(key, [...existing, value]);
  });

  delete = vi.fn((key: string) => {
    this.data.delete(key);
  });

  get = vi.fn((key: string) => {
    const values = this.data.get(key);
    return values && values.length > 0 ? values[0] : null;
  });

  getAll = vi.fn((key: string) => {
    return this.data.get(key) || [];
  });

  has = vi.fn((key: string) => {
    return this.data.has(key);
  });

  set = vi.fn((key: string, value: any) => {
    this.data.set(key, [value]);
  });

  forEach = vi.fn((callback: (value: any, key: string) => void) => {
    this.data.forEach((values, key) => {
      values.forEach(value => callback(value, key));
    });
  });
}

global.FormData = MockFormData as any;

// Mock File
global.File = vi.fn() as any;

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks();
  // Clear the actual storage
  localStorageMock.clear();
  sessionStorageMock.clear();
  // Clear the mock call history
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});