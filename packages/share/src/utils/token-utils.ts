// Utility functions for token management to avoid circular dependencies

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if exp exists and is a number
    if (!payload.exp || typeof payload.exp !== 'number') {
      return true;
    }
    // Use <= to include tokens expiring exactly now
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true; // Assume expired if we can't parse
  }
};