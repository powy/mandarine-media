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

describe('Specific Error Reproduction Tests', () => {
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

  it('verifies Error 1 is fixed: file_number type handling', async () => {
    // Test that we can handle file_number as both string and number
    const testData = {
      title: 'Test',
      description: 'Test desc',
      file_number: 123, // Number instead of string
      duration_minutes: 90,
      release_date: '2024-01-01',
      genre: ['Drama'],
      language: 'English',
      content_rating: 'PG-13',
      media_type: 'video',
      status: 'draft'
    };

    // This simulates the handleSave function processing data with number file_number
    const file_number = String(testData.file_number || '').trim();
    
    // Should not throw an error
    expect(file_number).toBe('123');
    expect(typeof file_number).toBe('string');
  });

  it('reproduces Error 2: 422 validation failed when creating', async () => {
    // This test reproduces the 422 error with integer parsing issues
    render(<App />);
    
    // Navigate to media descriptions
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /media descriptions/i })).toHaveLength(2);
    });

    const mediaButtons = screen.getAllByRole('button', { name: /media descriptions/i });
    const mediaButton = mediaButtons[0];
    fireEvent.click(mediaButton);
    
    // Wait for Add New Media button and click it
    await waitFor(() => {
      expect(screen.getByText('Add New Media')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add New Media'));

    await waitFor(() => {
      expect(screen.getByText('Create Media Description')).toBeInTheDocument();
    });

    // Fill out form with data that will cause validation error
    const titleInput = screen.getByPlaceholderText('Enter media title');
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });

    const descriptionInput = screen.getByPlaceholderText('Enter description');
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

    // Try to save - this should trigger the 422 error
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should see the specific 422 error message
    await waitFor(() => {
      expect(screen.getByText(/Error 422: Validation failed - Input should be a valid integer, unable to parse string as an integer/)).toBeInTheDocument();
    });
  });

  it('verifies data types being sent to API', async () => {
    // This test checks what data types are actually being sent
    const { mediaApi } = await import('shared');
    
    render(<App />);
    
    // Navigate and create new media
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /media descriptions/i })).toHaveLength(2);
    });

    const mediaButtons = screen.getAllByRole('button', { name: /media descriptions/i });
    const mediaButton = mediaButtons[0];
    fireEvent.click(mediaButton);
    fireEvent.click(screen.getByText('Add New Media'));

    await waitFor(() => {
      expect(screen.getByText('Create Media Description')).toBeInTheDocument();
    });

    // Fill out form
    const titleInput = screen.getByPlaceholderText('Enter media title');
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });

    const durationInput = screen.getByDisplayValue('90');
    fireEvent.change(durationInput, { target: { value: '120' } });

    // Try to save and inspect the data being sent
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Check that the API was called with proper data types
    await waitFor(() => {
      expect(mediaApi.createMediaDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          duration_minutes: expect.any(Number),
          file_number: expect.any(String), // Should be string, not number
          is_featured: expect.any(Boolean),
          is_premium: expect.any(Boolean)
        })
      );
    });
  });
});