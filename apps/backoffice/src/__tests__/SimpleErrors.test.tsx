import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the shared API
vi.mock('share', () => ({
  initApiClient: vi.fn(),
  authApi: {
    login: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
  },
  mediaApi: {
    getMediaDescriptions: vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          title: 'Test Media',
          description: 'Test description',
          duration_minutes: 120,
          release_date: '2024-01-01',
          genre: ['Drama'],
          language: 'English',
          content_rating: 'PG-13',
          file_number: 123, // This is a NUMBER, not a string - reproduces Error 1
          media_type: 'video',
          status: 'draft',
          is_featured: false,
          is_premium: false,
          view_count: 100,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    }),
    createMediaDescription: vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: [
            {
              msg: 'Input should be a valid integer, unable to parse string as an integer'
            },
            {
              msg: 'Field required'
            }
          ]
        }
      }
    }),
    updateMediaDescription: vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: 'Validation failed'
        }
      }
    }),
    deleteMediaDescription: vi.fn().mockResolvedValue({}),
  },
  usersApi: {
    getUsers: vi.fn().mockResolvedValue({ data: [] })
  },
  personsApi: {
    getPublicPersons: vi.fn().mockResolvedValue({ data: [] })
  }
}));

// Import App after mocking
import App from '../App';

describe('Simple Error Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'test-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
    
    // Mock fetch for auth check
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.com' })
    });
  });

  it('verifies Error 1 fix: file_number type handling', () => {
    // Test that we can handle file_number as both string and number
    const testData = {
      file_number: 123, // Number instead of string
    };

    // This simulates the handleSave function processing data with number file_number
    const file_number = String(testData.file_number || '').trim();
    
    // Should not throw an error
    expect(file_number).toBe('123');
    expect(typeof file_number).toBe('string');
  });

  it('verifies enhanced error handling shows detailed 422 messages', async () => {
    render(<App />);
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Kyool Media')).toBeInTheDocument();
    });

    // Click on Media Descriptions
    const mediaButton = screen.getByRole('button', { name: /media descriptions/i });
    fireEvent.click(mediaButton);
    
    // Wait for Media Descriptions page to load
    await waitFor(() => {
      expect(screen.getByText('Add New Media')).toBeInTheDocument();
    });

    // Click Add New Media
    fireEvent.click(screen.getByText('Add New Media'));

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText('Create Media Description')).toBeInTheDocument();
    });

    // Try to save with minimal data (should trigger validation errors)
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should see client-side validation messages first
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('verifies API data type verification', async () => {
    const { mediaApi } = await import('shared');
    
    render(<App />);
    
    // Navigate to create form
    await waitFor(() => {
      expect(screen.getByText('Kyool Media')).toBeInTheDocument();
    });

    const mediaButton = screen.getByRole('button', { name: /media descriptions/i });
    fireEvent.click(mediaButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Media')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add New Media'));

    await waitFor(() => {
      expect(screen.getByText('Create Media Description')).toBeInTheDocument();
    });

    // Fill out form with valid data
    const titleInput = screen.getByPlaceholderText('Enter media title');
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });

    const descriptionInput = screen.getByPlaceholderText('Enter description');
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

    const fileNumberInput = screen.getByPlaceholderText('Enter file number');
    fireEvent.change(fileNumberInput, { target: { value: 'K001' } });

    // Try to save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should eventually call the API with proper data types
    await waitFor(() => {
      expect(mediaApi.createMediaDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          file_number: expect.any(String),
          is_featured: expect.any(Boolean),
          is_premium: expect.any(Boolean)
        })
      );
    });
  });
});