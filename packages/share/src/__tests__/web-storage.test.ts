import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebStorage } from '../utils/web-storage';

describe('WebStorage', () => {
  let webStorage: WebStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
    webStorage = new WebStorage();
  });

  describe('Basic Storage Operations', () => {
    it('should get item from localStorage', async () => {
      localStorage.setItem('test-key', 'test-value');

      const value = await webStorage.getItem('test-key');

      expect(value).toBe('test-value');
    });

    it('should return null for non-existent items', async () => {
      const value = await webStorage.getItem('non-existent');

      expect(value).toBeNull();
    });

    it('should set item in localStorage', async () => {
      await webStorage.setItem('test-key', 'test-value');

      expect(localStorage.getItem('test-key')).toBe('test-value');
    });

    it('should remove item from localStorage', async () => {
      localStorage.setItem('test-key', 'test-value');

      await webStorage.removeItem('test-key');

      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should clear all items from localStorage', async () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');

      await webStorage.clear();

      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
      expect(localStorage.length).toBe(0);
    });
  });

  describe('Secure Storage Operations', () => {
    it('should use same storage for secure operations', async () => {
      await webStorage.setSecureItem('secure-key', 'secure-value');

      const value = await webStorage.getSecureItem('secure-key');

      expect(value).toBe('secure-value');
      expect(localStorage.getItem('secure-key')).toBe('secure-value');
    });

    it('should remove secure items', async () => {
      await webStorage.setSecureItem('secure-key', 'secure-value');
      await webStorage.removeSecureItem('secure-key');

      const value = await webStorage.getSecureItem('secure-key');

      expect(value).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage access errors', async () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      await expect(webStorage.getItem('test-key')).rejects.toThrow('localStorage is not available');

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage quota exceeded errors', async () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      await expect(webStorage.setItem('test-key', 'test-value')).rejects.toThrow('QuotaExceededError');

      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage removal errors', async () => {
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Cannot remove item');
      });

      await expect(webStorage.removeItem('test-key')).rejects.toThrow('Cannot remove item');

      localStorage.removeItem = originalRemoveItem;
    });

    it('should handle localStorage clear errors', async () => {
      const originalClear = localStorage.clear;
      localStorage.clear = vi.fn().mockImplementation(() => {
        throw new Error('Cannot clear storage');
      });

      await expect(webStorage.clear()).rejects.toThrow('Cannot clear storage');

      localStorage.clear = originalClear;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      await webStorage.setItem('empty-key', '');

      const value = await webStorage.getItem('empty-key');

      expect(value).toBe('');
    });

    it('should handle undefined keys', async () => {
      await webStorage.setItem(undefined as any, 'value');

      const value = await webStorage.getItem(undefined as any);

      expect(value).toBe('value');
    });

    it('should handle null values', async () => {
      await webStorage.setItem('null-key', null as any);

      const value = await webStorage.getItem('null-key');

      expect(value).toBe('null'); // localStorage stores as string
    });

    it('should handle very large values', async () => {
      const largeValue = 'x'.repeat(10000);

      await webStorage.setItem('large-key', largeValue);

      const value = await webStorage.getItem('large-key');

      expect(value).toBe(largeValue);
    });

    it('should handle special characters in keys and values', async () => {
      const specialKey = 'key-with-特殊字符-and-émojis-🎉';
      const specialValue = 'value-with-特殊字符-and-émojis-🎉';

      await webStorage.setItem(specialKey, specialValue);

      const value = await webStorage.getItem(specialKey);

      expect(value).toBe(specialValue);
    });
  });

  describe('Browser Compatibility', () => {
    it('should work when localStorage is available', async () => {
      // Verify localStorage is available (should be true in test environment)
      expect(typeof localStorage).toBe('object');

      await webStorage.setItem('test', 'value');
      const value = await webStorage.getItem('test');

      expect(value).toBe('value');
    });

    it('should handle disabled localStorage gracefully', async () => {
      // Simulate disabled localStorage
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: null,
        writable: true,
      });

      // This should throw when trying to access localStorage
      expect(() => new WebStorage()).toThrow();

      // Restore localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];

      for (let i = 0; i < 100; i++) {
        operations.push(webStorage.setItem(`key${i}`, `value${i}`));
      }

      await Promise.all(operations);

      // Verify all items were set
      for (let i = 0; i < 100; i++) {
        const value = await webStorage.getItem(`key${i}`);
        expect(value).toBe(`value${i}`);
      }
    });

    it('should handle rapid get/set operations', async () => {
      const key = 'rapid-test';

      for (let i = 0; i < 10; i++) {
        await webStorage.setItem(key, `value${i}`);
        const value = await webStorage.getItem(key);
        expect(value).toBe(`value${i}`);
      }
    });
  });
});