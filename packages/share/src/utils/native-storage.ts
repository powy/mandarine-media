import { IAuthStorage, ISecureStorage } from './storage';

// These imports need to be optional for environments where they're not available
// The actual implementation will need these peer dependencies to be installed

export class NativeAuthStorage implements IAuthStorage, ISecureStorage {
  private AsyncStorage: any;
  private Keychain: any;
  private authKeys = ['access_token', 'refresh_token', 'user_data'];

  constructor(AsyncStorage: any, Keychain?: any) {
    this.AsyncStorage = AsyncStorage;
    this.Keychain = Keychain;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get ${key} from AsyncStorage:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to store ${key} in AsyncStorage:`, error);
      throw new Error(`Failed to store ${key}: ${error}`);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from AsyncStorage:`, error);
      throw new Error(`Failed to remove ${key}: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      // Use multiRemove for better performance on React Native
      await this.AsyncStorage.multiRemove(this.authKeys);
      
      // Also clear secure storage if available
      if (this.Keychain) {
        try {
          await this.Keychain.resetInternetCredentials('kyool_auth');
        } catch (error) {
          console.warn('Failed to clear secure storage:', error);
        }
      }
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
      
      // Fallback to individual removal
      for (const key of this.authKeys) {
        try {
          await this.AsyncStorage.removeItem(key);
        } catch (individualError) {
          console.error(`Failed to remove ${key} individually:`, individualError);
          throw new Error(`Critical: Could not clear ${key} from storage`);
        }
      }
    }
  }

  // Secure storage using Keychain/Keystore
  async setSecureItem(key: string, value: string): Promise<void> {
    if (!this.Keychain) {
      console.warn('Keychain not available, falling back to AsyncStorage');
      return this.setItem(key, value);
    }

    try {
      await this.Keychain.setInternetCredentials('kyool_auth', key, value, {
        accessControl: this.Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        accessible: this.Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error(`Failed to securely store ${key}:`, error);
      
      // Fallback to AsyncStorage if Keychain fails
      console.warn('Falling back to AsyncStorage for secure item');
      return this.setItem(key, value);
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    if (!this.Keychain) {
      console.warn('Keychain not available, falling back to AsyncStorage');
      return this.getItem(key);
    }

    try {
      const credentials = await this.Keychain.getInternetCredentials('kyool_auth');
      if (credentials && credentials.username === key) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to get secure ${key}:`, error);
      
      // Fallback to AsyncStorage if Keychain fails
      return this.getItem(key);
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    if (!this.Keychain) {
      console.warn('Keychain not available, falling back to AsyncStorage');
      return this.removeItem(key);
    }

    try {
      // Note: Keychain doesn't support removing individual keys easily,
      // so we reset the entire service. In a real app, you might want to
      // implement a more sophisticated key management system.
      await this.Keychain.resetInternetCredentials('kyool_auth');
    } catch (error) {
      console.warn(`Failed to remove secure ${key}:`, error);
      
      // Fallback to AsyncStorage removal
      return this.removeItem(key);
    }
  }

  // Utility method to check if dependencies are available
  static isAsyncStorageAvailable(AsyncStorage: any): boolean {
    return AsyncStorage && typeof AsyncStorage.getItem === 'function';
  }

  static isKeychainAvailable(Keychain: any): boolean {
    return Keychain && typeof Keychain.setInternetCredentials === 'function';
  }
}