import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Please enter a valid email address');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');

// User validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
});

// Media validation schemas
export const mediaDescriptionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
  duration_minutes: z.number().min(0, 'Duration must be positive'),
  release_date: z.string().min(1, 'Release date is required'),
  genre: z.array(z.string()).min(1, 'At least one genre is required'),
  language: z.string().min(1, 'Language is required'),
  subtitle_languages: z.array(z.string()).optional(),
  content_rating: z.string().min(1, 'Content rating is required'),
  keywords: z.array(z.string()).optional(),
  file_number: z.string().min(1, 'File number is required'),
  media_type: z.string().min(1, 'Media type is required'),
  status: z.enum(['draft', 'published', 'archived']),
  is_featured: z.boolean().optional(),
  is_premium: z.boolean().optional(),
});

export const videoFileSchema = z.object({
  media_description_id: z.string().uuid('Invalid media description ID'),
  file_name: z.string().min(1, 'File name is required'),
  file_path: z.string().min(1, 'File path is required'),
  file_size_bytes: z.number().min(0, 'File size must be positive'),
  resolution: z.string().min(1, 'Resolution is required'),
  bitrate_kbps: z.number().min(0, 'Bitrate must be positive'),
  format: z.string().min(1, 'Format is required'),
  duration_seconds: z.number().min(0, 'Duration must be positive'),
  encoding_status: z.enum(['pending', 'processing', 'completed', 'failed']),
});

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const validatePassword = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

export const getValidationErrors = (schema: z.ZodSchema, data: any): Record<string, string> => {
  try {
    schema.parse(data);
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);
    }
    return { general: 'Validation error' };
  }
};

// File validation
export const validateVideoFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file.type.startsWith('video/')) {
    return { isValid: false, error: 'File must be a video' };
  }
  
  // 2GB limit
  const maxSize = 2 * 1024 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 2GB' };
  }
  
  return { isValid: true };
};

// URL validation
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// UUID validation
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Language validation schemas
export const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required'),
  sigle: z.string().min(1, 'Language code is required').max(20, 'Language code must be less than 20 characters'),
});

export const languageCreateSchema = languageSchema;

export const languageUpdateSchema = z.object({
  name: z.string().min(1, 'Language name is required').optional(),
  sigle: z.string().min(1, 'Language code is required').max(20, 'Language code must be less than 20 characters').optional(),
});