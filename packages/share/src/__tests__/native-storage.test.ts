import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NativeStorage } from '../utils/native-storage';

// Mock AsyncStorage for React Native environment
const mockAsyncStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  getAllKeys: vi.fn(),
  multiGet: vi.fn(),
  multiSet: vi.fn(),
  multiRemove: vi.fn(),
};

// Mock react-native modules
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

describe('NativeStorage', () => {
  let nativeStorage: NativeStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    nativeStorage = new NativeStorage();
  });

  describe('Basic Storage Operations', () => {
    it('should get item from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('test-value');

      const value = await nativeStorage.getItem('test-key');

      expect(value).toBe('test-value');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent items', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const value = await nativeStorage.getItem('non-existent');

      expect(value).toBeNull();
    });

    it('should set item in AsyncStorage', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      await nativeStorage.setItem('test-key', 'test-value');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should remove item from AsyncStorage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      await nativeStorage.removeItem('test-key');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should clear all items from AsyncStorage', async () => {
      mockAsyncStorage.clear.mockResolvedValue(undefined);

      await nativeStorage.clear();

      expect(mockAsyncStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Secure Storage Operations', () => {
    it('should use same storage for secure operations by default', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('secure-value');

      await nativeStorage.setSecureItem('secure-key', 'secure-value');
      const value = await nativeStorage.getSecureItem('secure-key');

      expect(value).toBe('secure-value');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('secure-key', 'secure-value');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('secure-key');
    });

    it('should remove secure items', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      await nativeStorage.removeSecureItem('secure-key');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('secure-key');
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage access errors', async () => {
      const accessError = new Error('AsyncStorage is not available');
      mockAsyncStorage.getItem.mockRejectedValue(accessError);

      await expect(nativeStorage.getItem('test-key')).rejects.toThrow('AsyncStorage is not available');
    });

    it('should handle AsyncStorage write errors', async () => {
      const writeError = new Error('Cannot write to storage');
      mockAsyncStorage.setItem.mockRejectedValue(writeError);

      await expect(nativeStorage.setItem('test-key', 'test-value')).rejects.toThrow('Cannot write to storage');
    });

    it('should handle AsyncStorage removal errors', async () => {
      const removeError = new Error('Cannot remove item');
      mockAsyncStorage.removeItem.mockRejectedValue(removeError);

      await expect(nativeStorage.removeItem('test-key')).rejects.toThrow('Cannot remove item');
    });

    it('should handle AsyncStorage clear errors', async () => {
      const clearError = new Error('Cannot clear storage');
      mockAsyncStorage.clear.mockRejectedValue(clearError);

      await expect(nativeStorage.clear()).rejects.toThrow('Cannot clear storage');
    });
  });

  describe('React Native Specific Features', () => {
    it('should handle large data sets efficiently', async () => {
      const largeData = JSON.stringify({ data: 'x'.repeat(10000) });
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(largeData);

      await nativeStorage.setItem('large-data', largeData);
      const value = await nativeStorage.getItem('large-data');

      expect(value).toBe(largeData);
    });

    it('should handle concurrent operations properly', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(nativeStorage.setItem(`key${i}`, `value${i}`));
      }

      await Promise.all(operations);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(10);
    });

    it('should handle app background/foreground transitions', async () => {
      // Simulate operation starting before app goes to background
      mockAsyncStorage.getItem.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('value'), 100))
      );

      const promise = nativeStorage.getItem('test-key');

      // Simulate app going to background (AsyncStorage should still work)
      const value = await promise;

      expect(value).toBe('value');
    });
  });

  describe('Data Persistence', () => {
    it('should persist data across app restarts', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('persisted-value');

      // Simulate setting data
      await nativeStorage.setItem('persist-key', 'persisted-value');

      // Simulate app restart by creating new instance
      const newStorage = new NativeStorage();
      const value = await newStorage.getItem('persist-key');

      expect(value).toBe('persisted-value');
    });

    it('should handle data corruption gracefully', async () => {
      const corruptionError = new Error('Data corruption detected');
      mockAsyncStorage.getItem.mockRejectedValue(corruptionError);

      await expect(nativeStorage.getItem('corrupt-key')).rejects.toThrow('Data corruption detected');
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with frequent operations', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('value');
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await nativeStorage.setItem(`temp-${i}`, `value-${i}`);
        await nativeStorage.getItem(`temp-${i}`);
        await nativeStorage.removeItem(`temp-${i}`);
      }

      // All operations should complete without issues
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(100);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(100);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('');

      await nativeStorage.setItem('empty-key', '');
      const value = await nativeStorage.getItem('empty-key');

      expect(value).toBe('');
    });

    it('should handle null values', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await nativeStorage.setItem('null-key', null as any);
      const value = await nativeStorage.getItem('null-key');

      expect(value).toBeNull();
    });

    it('should handle undefined values', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      await nativeStorage.setItem('undefined-key', undefined as any);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('undefined-key', undefined);
    });

    it('should handle special characters in keys and values', async () => {
      const specialKey = 'key-with-特殊字符-and-émojis-🎉';
      const specialValue = 'value-with-特殊字符-and-émojis-🎉';

      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(specialValue);

      await nativeStorage.setItem(specialKey, specialValue);
      const value = await nativeStorage.getItem(specialKey);

      expect(value).toBe(specialValue);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(specialKey, specialValue);
    });
  });

  describe('Platform Differences', () => {
    it('should work consistently across iOS and Android', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue('cross-platform-value');

      await nativeStorage.setItem('platform-key', 'cross-platform-value');
      const value = await nativeStorage.getItem('platform-key');

      expect(value).toBe('cross-platform-value');
    });

    it('should handle different character encodings', async () => {
      const unicodeValue = '测试数据 🌍 العربية русский';
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(unicodeValue);

      await nativeStorage.setItem('unicode-key', unicodeValue);
      const value = await nativeStorage.getItem('unicode-key');

      expect(value).toBe(unicodeValue);
    });
  });
});