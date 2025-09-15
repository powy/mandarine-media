import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
  mediaDescriptionSchema,
  videoFileSchema,
  languageSchema,
  validateEmail,
  validatePassword,
  getValidationErrors,
  validateVideoFile,
  validateUrl,
  validateUUID,
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com',
        '',
        'user@.com',
        'user@com',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate correct passwords', () => {
      const validPasswords = [
        'password123',
        'secure_password',
        'MySecretPass1',
        'a'.repeat(8), // exactly 8 characters
        'a'.repeat(50), // middle length
        'a'.repeat(100), // exactly 100 characters
      ];

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    it('should reject invalid passwords', () => {
      const invalidPasswords = [
        '',
        'short',
        'a'.repeat(7), // too short
        'a'.repeat(101), // too long
      ];

      invalidPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false);
        expect(() => passwordSchema.parse(password)).toThrow();
      });
    });
  });

  describe('Login Schema Validation', () => {
    it('should validate correct login data', () => {
      const validLoginData = [
        {
          email: 'user@example.com',
          password: 'password123',
        },
        {
          email: 'test@domain.co.uk',
          password: 'secure_password',
        },
      ];

      validLoginData.forEach(data => {
        expect(() => loginSchema.parse(data)).not.toThrow();
      });
    });

    it('should reject invalid login data', () => {
      const invalidLoginData = [
        {
          email: 'invalid-email',
          password: 'password123',
        },
        {
          email: 'user@example.com',
          password: 'short',
        },
        {
          email: '',
          password: '',
        },
        {}, // missing fields
      ];

      invalidLoginData.forEach(data => {
        expect(() => loginSchema.parse(data)).toThrow();
      });
    });
  });

  describe('Register Schema Validation', () => {
    it('should validate correct registration data', () => {
      const validRegisterData = [
        {
          email: 'user@example.com',
          password: 'password123',
          full_name: 'John Doe',
        },
        {
          email: 'test@domain.co.uk',
          password: 'secure_password',
          full_name: 'Jane Smith',
        },
      ];

      validRegisterData.forEach(data => {
        expect(() => registerSchema.parse(data)).not.toThrow();
      });
    });

    it('should reject invalid registration data', () => {
      const invalidRegisterData = [
        {
          email: 'invalid-email',
          password: 'password123',
          full_name: 'John Doe',
        },
        {
          email: 'user@example.com',
          password: 'short',
          full_name: 'John Doe',
        },
        {
          email: 'user@example.com',
          password: 'password123',
          full_name: 'A', // too short
        },
        {
          email: 'user@example.com',
          password: 'password123',
          full_name: '', // empty
        },
      ];

      invalidRegisterData.forEach(data => {
        expect(() => registerSchema.parse(data)).toThrow();
      });
    });
  });

  describe('Media Description Schema Validation', () => {
    it('should validate correct media description data', () => {
      const validMediaData = {
        title: 'Test Movie',
        description: 'A great test movie for our platform',
        duration_minutes: 120,
        release_date: '2024-01-01',
        genre: ['Action', 'Drama'],
        language: 'English',
        subtitle_languages: ['Spanish', 'French'],
        content_rating: 'PG-13',
        keywords: ['action', 'drama', 'test'],
        file_number: 'FILE-001',
        media_type: 'movie',
        status: 'published' as const,
        is_featured: true,
        is_premium: false,
      };

      expect(() => mediaDescriptionSchema.parse(validMediaData)).not.toThrow();
    });

    it('should reject invalid media description data', () => {
      const invalidMediaData = [
        {}, // missing required fields
        {
          title: '', // empty title
          description: 'A great test movie',
          duration_minutes: 120,
          release_date: '2024-01-01',
          genre: ['Action'],
          language: 'English',
          content_rating: 'PG-13',
          file_number: 'FILE-001',
          media_type: 'movie',
          status: 'published',
        },
        {
          title: 'Test Movie',
          description: 'A great test movie',
          duration_minutes: -10, // negative duration
          release_date: '2024-01-01',
          genre: ['Action'],
          language: 'English',
          content_rating: 'PG-13',
          file_number: 'FILE-001',
          media_type: 'movie',
          status: 'published',
        },
        {
          title: 'Test Movie',
          description: 'A great test movie',
          duration_minutes: 120,
          release_date: '2024-01-01',
          genre: [], // empty genre array
          language: 'English',
          content_rating: 'PG-13',
          file_number: 'FILE-001',
          media_type: 'movie',
          status: 'published',
        },
      ];

      invalidMediaData.forEach(data => {
        expect(() => mediaDescriptionSchema.parse(data)).toThrow();
      });
    });
  });

  describe('Video File Schema Validation', () => {
    it('should validate correct video file data', () => {
      const validVideoFileData = {
        media_description_id: '550e8400-e29b-41d4-a716-446655440000',
        file_name: 'movie.mp4',
        file_path: '/videos/movie.mp4',
        file_size_bytes: 1073741824, // 1GB
        resolution: '1920x1080',
        bitrate_kbps: 5000,
        format: 'mp4',
        duration_seconds: 7200, // 2 hours
        encoding_status: 'completed' as const,
      };

      expect(() => videoFileSchema.parse(validVideoFileData)).not.toThrow();
    });

    it('should reject invalid video file data', () => {
      const invalidVideoFileData = [
        {
          media_description_id: 'invalid-uuid',
          file_name: 'movie.mp4',
          file_path: '/videos/movie.mp4',
          file_size_bytes: 1073741824,
          resolution: '1920x1080',
          bitrate_kbps: 5000,
          format: 'mp4',
          duration_seconds: 7200,
          encoding_status: 'completed',
        },
        {
          media_description_id: '550e8400-e29b-41d4-a716-446655440000',
          file_name: '', // empty file name
          file_path: '/videos/movie.mp4',
          file_size_bytes: 1073741824,
          resolution: '1920x1080',
          bitrate_kbps: 5000,
          format: 'mp4',
          duration_seconds: 7200,
          encoding_status: 'completed',
        },
        {
          media_description_id: '550e8400-e29b-41d4-a716-446655440000',
          file_name: 'movie.mp4',
          file_path: '/videos/movie.mp4',
          file_size_bytes: -100, // negative file size
          resolution: '1920x1080',
          bitrate_kbps: 5000,
          format: 'mp4',
          duration_seconds: 7200,
          encoding_status: 'completed',
        },
      ];

      invalidVideoFileData.forEach(data => {
        expect(() => videoFileSchema.parse(data)).toThrow();
      });
    });
  });

  describe('Language Schema Validation', () => {
    it('should validate correct language data', () => {
      const validLanguageData = [
        { name: 'English', sigle: 'en' },
        { name: 'Spanish', sigle: 'es' },
        { name: 'French', sigle: 'fr-FR' },
      ];

      validLanguageData.forEach(data => {
        expect(() => languageSchema.parse(data)).not.toThrow();
      });
    });

    it('should reject invalid language data', () => {
      const invalidLanguageData = [
        { name: '', sigle: 'en' }, // empty name
        { name: 'English', sigle: '' }, // empty code
        { name: 'English', sigle: 'a'.repeat(21) }, // code too long
        {}, // missing fields
      ];

      invalidLanguageData.forEach(data => {
        expect(() => languageSchema.parse(data)).toThrow();
      });
    });
  });

  describe('Validation Error Handling', () => {
    it('should return empty object for valid data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const errors = getValidationErrors(loginSchema, validData);

      expect(errors).toEqual({});
    });

    it('should return error messages for invalid data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'short',
      };

      const errors = getValidationErrors(loginSchema, invalidData);

      expect(errors).toHaveProperty('email');
      expect(errors).toHaveProperty('password');
      expect(errors.email).toContain('valid email');
      expect(errors.password).toContain('8 characters');
    });

    it('should handle nested validation errors', () => {
      const invalidMediaData = {
        title: '',
        genre: [],
        duration_minutes: -5,
      };

      const errors = getValidationErrors(mediaDescriptionSchema, invalidMediaData);

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should handle non-Zod errors gracefully', () => {
      const invalidSchema = {
        parse: () => { throw new Error('Custom error'); }
      } as any;

      const errors = getValidationErrors(invalidSchema, {});

      expect(errors).toEqual({ general: 'Validation error' });
    });
  });

  describe('File Validation', () => {
    it('should validate video files correctly', () => {
      // Create a mock file object
      const validVideoFile = {
        type: 'video/mp4',
        size: 100 * 1024 * 1024, // 100MB
      } as File;

      const result = validateVideoFile(validVideoFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-video files', () => {
      const textFile = {
        type: 'text/plain',
        size: 1024,
      } as File;

      const result = validateVideoFile(textFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('video');
    });

    it('should reject files that are too large', () => {
      const largeVideoFile = {
        type: 'video/mp4',
        size: 3 * 1024 * 1024 * 1024, // 3GB
      } as File;

      const result = validateVideoFile(largeVideoFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2GB');
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.example.com/v1/users',
        'ftp://files.example.com',
      ];

      validUrls.forEach(url => {
        expect(validateUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://',
        '',
        'example.com', // missing protocol
        // Note: javascript: URLs are technically valid URLs but dangerous
      ];

      invalidUrls.forEach(url => {
        expect(validateUrl(url)).toBe(false);
      });
    });
  });

  describe('UUID Validation', () => {
    it('should validate correct UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUuids.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716-44665544000', // too short
        '550e8400-e29b-41d4-a716-4466554400000', // too long
        '550e8400-e29b-41d4-a716-44665544000g', // invalid character
        '', // empty
        '550e8400-e29b-41d4-a716', // incomplete
      ];

      invalidUuids.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle extremely long inputs', () => {
      const longString = 'a'.repeat(10000);

      expect(validateEmail(longString)).toBe(false);
      expect(validatePassword(longString)).toBe(false);
    });

    it('should handle special characters safely', () => {
      const specialInputs = [
        '<script>alert("xss")</script>',
        'user@example.com; DROP TABLE users;',
        '../../etc/passwd',
        '${7*7}',
        'user@example.com\x00',
      ];

      specialInputs.forEach(input => {
        expect(() => {
          validateEmail(input);
          validatePassword(input);
          validateUrl(input);
          validateUUID(input);
        }).not.toThrow();
      });
    });

    it('should handle null and undefined inputs', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validatePassword(null as any)).toBe(false);
      expect(validatePassword(undefined as any)).toBe(false);
      expect(validateUrl(null as any)).toBe(false);
      expect(validateUrl(undefined as any)).toBe(false);
      expect(validateUUID(null as any)).toBe(false);
      expect(validateUUID(undefined as any)).toBe(false);
    });

    it('should handle non-string inputs', () => {
      const nonStringInputs = [123, {}, [], true, false];

      nonStringInputs.forEach(input => {
        expect(validateEmail(input as any)).toBe(false);
        expect(validatePassword(input as any)).toBe(false);
        expect(validateUrl(input as any)).toBe(false);
        expect(validateUUID(input as any)).toBe(false);
      });
    });
  });
});