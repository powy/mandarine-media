// Basic storage abstraction interface (backward compatibility)
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Enhanced storage interfaces for auth system
export interface IAuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ISecureStorage extends IAuthStorage {
  setSecureItem(key: string, value: string): Promise<void>;
  getSecureItem(key: string): Promise<string | null>;
  removeSecureItem(key: string): Promise<void>;
}

// Storage instances - must be initialized by platform
let storageInstance: Storage | null = null;
let authStorageInstance: IAuthStorage & ISecureStorage | null = null;

// Legacy storage initialization (backward compatibility)
export const initStorage = (storage: Storage): void => {
  storageInstance = storage;
};

export const getStorage = (): Storage => {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initStorage() first.');
  }
  return storageInstance;
};

// Enhanced auth storage initialization
export const initAuthStorage = (storage: IAuthStorage & ISecureStorage): void => {
  authStorageInstance = storage;
};

export const getAuthStorage = (): IAuthStorage & ISecureStorage => {
  if (!authStorageInstance) {
    throw new Error('Auth storage not initialized. Call initAuthStorage() first.');
  }
  return authStorageInstance;
};

// Token storage constants
export const TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user_data';

// Legacy token storage helpers (backward compatibility)
export const tokenStorage = {
  async getToken(): Promise<string | null> {
    return getStorage().getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    return getStorage().setItem(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    return getStorage().removeItem(TOKEN_KEY);
  },
};

// Enhanced auth token storage helpers
export const authTokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await getAuthStorage().getItem(TOKEN_KEY);
    } catch {
      // Fallback to legacy storage if auth storage not initialized
      try {
        return await getStorage().getItem(TOKEN_KEY);
      } catch {
        // Final fallback to localStorage directly (for testing/legacy environments)
        try {
          return localStorage.getItem(TOKEN_KEY);
        } catch {
          return null;
        }
      }
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      await getAuthStorage().setItem(TOKEN_KEY, token);
    } catch {
      // Fallback to legacy storage if auth storage not initialized
      try {
        await getStorage().setItem(TOKEN_KEY, token);
      } catch {
        // Final fallback to localStorage directly (for testing/legacy environments)
        try {
          localStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
          throw new Error(`Failed to store access token: ${error}`);
        }
      }
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await getAuthStorage().getSecureItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await getAuthStorage().setSecureItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.warn('Failed to store refresh token securely:', error);
      throw new Error('Secure storage required for refresh token');
    }
  },

  async getUser(): Promise<string | null> {
    try {
      return await getAuthStorage().getItem(USER_KEY);
    } catch {
      // Fallback to legacy storage if auth storage not initialized
      try {
        return await getStorage().getItem(USER_KEY);
      } catch {
        // Final fallback to localStorage directly
        try {
          return localStorage.getItem(USER_KEY);
        } catch {
          return null;
        }
      }
    }
  },

  async setUser(user: string): Promise<void> {
    try {
      await getAuthStorage().setItem(USER_KEY, user);
    } catch {
      // Fallback to legacy storage if auth storage not initialized
      try {
        await getStorage().setItem(USER_KEY, user);
      } catch {
        // Final fallback to localStorage directly
        try {
          localStorage.setItem(USER_KEY, user);
        } catch {
          console.warn('Failed to store user data');
        }
      }
    }
  },

  async clearAll(): Promise<void> {
    try {
      await getAuthStorage().clear();
    } catch {
      // Fallback to manual cleanup using legacy storage
      try {
        await getStorage().removeItem(TOKEN_KEY);
      } catch {
        // Final fallback to direct localStorage cleanup
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } catch (error) {
          console.warn('Failed to clear tokens:', error);
        }
      }
    }
  },
};