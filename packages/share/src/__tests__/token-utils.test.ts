import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTokenExpired } from '../utils/token-utils';

describe('Token Utils', () => {
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      // Mock current time to a specific timestamp
      const mockNow = 1640995200000; // 2022-01-01 00:00:00 UTC
      Date.now = vi.fn(() => mockNow);

      // Create a token that expires in the future
      const futureExp = Math.floor(mockNow / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      // Mock current time to a specific timestamp
      const mockNow = 1640995200000; // 2022-01-01 00:00:00 UTC
      Date.now = vi.fn(() => mockNow);

      // Create a token that expired in the past
      const pastExp = Math.floor(mockNow / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for token expiring right now', () => {
      // Mock current time to a specific timestamp
      const mockNow = 1640995200000; // 2022-01-01 00:00:00 UTC
      Date.now = vi.fn(() => mockNow);

      // Create a token that expires exactly now
      const nowExp = Math.floor(mockNow / 1000);
      const payload = { exp: nowExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should handle token with millisecond precision correctly', () => {
      const mockNow = 1640995200500; // 2022-01-01 00:00:00.500 UTC
      Date.now = vi.fn(() => mockNow);

      // Token expires 1 second in the future
      const futureExp = Math.floor(mockNow / 1000) + 1;
      const payload = { exp: futureExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should return true for malformed JWT token', () => {
      const malformedToken = 'invalid.jwt.token';

      const result = isTokenExpired(malformedToken);

      expect(result).toBe(true);
    });

    it('should return true for JWT with invalid base64 payload', () => {
      const invalidBase64Token = 'header.invalid-base64-payload.signature';

      const result = isTokenExpired(invalidBase64Token);

      expect(result).toBe(true);
    });

    it('should return true for JWT with invalid JSON payload', () => {
      const invalidJSONPayload = btoa('{ invalid json }');
      const invalidJSONToken = `header.${invalidJSONPayload}.signature`;

      const result = isTokenExpired(invalidJSONToken);

      expect(result).toBe(true);
    });

    it('should return true for JWT missing exp claim', () => {
      const payload = { user_id: 123, iat: Math.floor(Date.now() / 1000) };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for JWT with null exp claim', () => {
      const payload = { exp: null, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for JWT with non-numeric exp claim', () => {
      const payload = { exp: 'invalid-exp', user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should handle JWT with only one or two parts', () => {
      const onePartToken = 'header';
      const twoPartToken = 'header.payload';

      expect(isTokenExpired(onePartToken)).toBe(true);
      expect(isTokenExpired(twoPartToken)).toBe(true);
    });

    it('should handle empty token', () => {
      const result = isTokenExpired('');

      expect(result).toBe(true);
    });

    it('should handle token with extra parts', () => {
      const mockNow = 1640995200000;
      Date.now = vi.fn(() => mockNow);

      const futureExp = Math.floor(mockNow / 1000) + 3600;
      const payload = { exp: futureExp, user_id: 123 };
      const tokenWithExtraParts = `${createMockJWT(payload)}.extrapart.anotherpart`;

      const result = isTokenExpired(tokenWithExtraParts);

      expect(result).toBe(false);
    });

    it('should handle very large expiration timestamps', () => {
      const mockNow = 1640995200000;
      Date.now = vi.fn(() => mockNow);

      // Very large future timestamp (year 2050)
      const veryFutureExp = Math.floor(new Date('2050-01-01').getTime() / 1000);
      const payload = { exp: veryFutureExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should handle very small expiration timestamps', () => {
      const mockNow = 1640995200000;
      Date.now = vi.fn(() => mockNow);

      // Very old timestamp (year 1970)
      const veryPastExp = 0;
      const payload = { exp: veryPastExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should handle negative expiration timestamps', () => {
      const payload = { exp: -1, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should handle floating point expiration timestamps', () => {
      const mockNow = 1640995200000;
      Date.now = vi.fn(() => mockNow);

      // Floating point exp (should be treated as integer)
      const floatExp = Math.floor(mockNow / 1000) + 3600.5;
      const payload = { exp: floatExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should be consistent across multiple calls with same token', () => {
      const mockNow = 1640995200000;
      Date.now = vi.fn(() => mockNow);

      const futureExp = Math.floor(mockNow / 1000) + 3600;
      const payload = { exp: futureExp, user_id: 123 };
      const token = createMockJWT(payload);

      const result1 = isTokenExpired(token);
      const result2 = isTokenExpired(token);
      const result3 = isTokenExpired(token);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should handle real-world JWT format', () => {
      const mockNow = 1640995200000;
      Date.now = vi.fn(() => mockNow);

      // Real-world-like JWT payload
      const futureExp = Math.floor(mockNow / 1000) + 3600;
      const payload = {
        sub: '1234567890',
        name: 'John Doe',
        iat: Math.floor(mockNow / 1000),
        exp: futureExp,
        aud: 'kyool-media',
        iss: 'kyool-auth-server'
      };
      const token = createMockJWT(payload);

      const result = isTokenExpired(token);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should not throw on extremely malformed inputs', () => {
      const malformedInputs = [
        null as any,
        undefined as any,
        123 as any,
        [] as any,
        {} as any,
        'ïñvàlíd¿¿¿',
        '...',
        'a.b.',
        '.b.c',
        'a..c',
      ];

      malformedInputs.forEach(input => {
        expect(() => isTokenExpired(input)).not.toThrow();
        expect(isTokenExpired(input)).toBe(true);
      });
    });

    it('should handle tokens with Unicode characters', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600, msg: '测试 🎉' };
      const unicodeToken = createMockJWT(payload);

      const result = isTokenExpired(unicodeToken);

      expect(result).toBe(false);
    });

    it('should be safe against injection attacks', () => {
      const maliciousPayloads = [
        '{"exp": 999999999999, "__proto__": {"isAdmin": true}}',
        '{"exp": 999999999999, "constructor": {"prototype": {"isAdmin": true}}}',
        '{"exp": eval("Math.floor(Date.now() / 1000) + 3600")}',
      ];

      maliciousPayloads.forEach(maliciousPayload => {
        const maliciousToken = `header.${btoa(maliciousPayload)}.signature`;
        expect(() => isTokenExpired(maliciousToken)).not.toThrow();
      });
    });
  });
});

// Helper function to create mock JWT tokens for testing
function createMockJWT(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}