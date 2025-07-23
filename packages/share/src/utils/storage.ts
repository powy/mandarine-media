// Storage abstraction interface
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Storage instance - must be initialized by platform
let storageInstance: Storage | null = null;

export const initStorage = (storage: Storage): void => {
  storageInstance = storage;
};

export const getStorage = (): Storage => {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initStorage() first.');
  }
  return storageInstance;
};

// Token storage helpers
export const TOKEN_KEY = 'access_token';

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