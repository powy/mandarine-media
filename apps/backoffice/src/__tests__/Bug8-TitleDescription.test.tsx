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
          episode_title: 'Backend Title', // Backend returns episode_title
          descriptive_summary_text: 'Backend Description', // Backend returns descriptive_summary_text
          duration_seconds: 7200, // Backend returns duration in seconds
          content_status: 'published', // Backend returns content_status
          file_number: 123456,
          media_type: 'video',
          original_language: 'Korean', // Backend returns original_language
          is_premium_content: true, // Backend returns is_premium_content
          is_featured: false,
          subtitle_languages_available: ['English', 'Korean'], // Backend field name
          seo_keywords: ['action', 'drama'], // Backend field name
          view_count: 100,
          like_count: 50,
          share_count: 25,
          production_year: 2024,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    }),
    createMediaDescription: vi.fn().mockResolvedValue({ id: '2', episode_title: 'New Title' }),
    updateMediaDescription: vi.fn().mockResolvedValue({ id: '1', episode_title: 'Updated Title' }),
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

describe('Bug 8: Title and Description Display/Edit Fix', () => {
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

  it('should display title and description in the data table from backend fields', async () => {
    render(<App />);
    
    // Navigate to Media Descriptions
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /media descriptions/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /media descriptions/i }));
    
    // Wait for data to load and check if title is displayed
    await waitFor(() => {
      expect(screen.getByText('Backend Title')).toBeInTheDocument();
    });
    
    // Should show the title from episode_title field
    expect(screen.getByText('Backend Title')).toBeInTheDocument();
    
    // Should show status from content_status field
    expect(screen.getByText('published')).toBeInTheDocument();
    
    // Should show duration converted from seconds to minutes
    expect(screen.getByText('120 min')).toBeInTheDocument();
    
    // Should show language from original_language field
    expect(screen.getByText('Korean')).toBeInTheDocument();
  });

  it('should populate form fields correctly when editing with backend field names', async () => {
    render(<App />);
    
    // Navigate to Media Descriptions
    fireEvent.click(screen.getByRole('button', { name: /media descriptions/i }));
    
    // Wait for data and click edit
    await waitFor(() => {
      expect(screen.getByText('Backend Title')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Edit'));
    
    // Wait for edit form to load
    await waitFor(() => {
      expect(screen.getByText('Edit Media Description')).toBeInTheDocument();
    });
    
    // Check that title field is populated from episode_title
    const titleInput = screen.getByDisplayValue('Backend Title');
    expect(titleInput).toBeInTheDocument();
    
    // Check that description field is populated from descriptive_summary_text
    const descriptionInput = screen.getByDisplayValue('Backend Description');
    expect(descriptionInput).toBeInTheDocument();
    
    // Check that duration is converted from seconds to minutes (7200 seconds = 120 minutes)
    const durationInput = screen.getByDisplayValue('120');
    expect(durationInput).toBeInTheDocument();
    
    // Check that file number is populated (use more specific selector)
    const fileNumberInputs = screen.getAllByDisplayValue('123456');
    expect(fileNumberInputs.length).toBeGreaterThan(0);
    
    // Check that language is populated from original_language
    const languageSelect = screen.getByDisplayValue('Korean');
    expect(languageSelect).toBeInTheDocument();
    
    // Check that status is populated from content_status
    const statusSelect = screen.getByDisplayValue('published');
    expect(statusSelect).toBeInTheDocument();
    
    // Check that is_premium checkbox reflects is_premium_content
    const premiumCheckbox = screen.getByLabelText('Premium content');
    expect(premiumCheckbox).toBeChecked();
  });

  it('should save edited title and description with correct API mapping', async () => {
    const { mediaApi } = await import('shared');
    
    render(<App />);
    
    // Navigate and edit
    fireEvent.click(screen.getByRole('button', { name: /media descriptions/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Backend Title')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Edit'));
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Backend Title')).toBeInTheDocument();
    });
    
    // Change title and description
    const titleInput = screen.getByDisplayValue('Backend Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    
    const descriptionInput = screen.getByDisplayValue('Backend Description');
    fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });
    
    // Save
    fireEvent.click(screen.getByText('Save'));
    
    // Should call API with correct backend field names
    await waitFor(() => {
      expect(mediaApi.updateMediaDescription).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          episode_title: 'Updated Title',
          descriptive_summary_text: 'Updated Description'
        })
      );
    });
  });
});