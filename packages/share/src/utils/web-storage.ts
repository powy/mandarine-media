import { IAuthStorage, ISecureStorage } from './storage';

export class WebAuthStorage implements IAuthStorage, ISecureStorage {
  private authKeys = ['access_token', 'refresh_token', 'user_data'];

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to store ${key} in localStorage:`, error);
      throw new Error(`Failed to store ${key}: ${error}`);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
      throw new Error(`Failed to remove ${key}: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      // Only clear auth-related keys to avoid affecting other app data
      this.authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  // For web, secure storage is the same as regular storage
  // In production, consider using more sophisticated encryption
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      // In the future, we could add encryption here
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to securely store ${key}:`, error);
      throw new Error(`Failed to securely store ${key}: ${error}`);
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      // In the future, we could add decryption here
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get secure ${key}:`, error);
      return null;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove secure ${key}:`, error);
      throw new Error(`Failed to remove secure ${key}: ${error}`);
    }
  }

  // Utility method to check if localStorage is available
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}