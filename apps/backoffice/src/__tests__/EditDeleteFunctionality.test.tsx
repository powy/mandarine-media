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
          media_type: 'video',
          status: 'draft',
          view_count: 100,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    }),
    createMediaDescription: vi.fn().mockResolvedValue({
      id: '2',
      title: 'New Media',
      media_type: 'video',
      status: 'draft'
    }),
    updateMediaDescription: vi.fn().mockResolvedValue({
      id: '1',
      title: 'Updated Media',
      media_type: 'video',
      status: 'published'
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

describe('Edit/Delete Functionality', () => {
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

  it('should render media list with edit and delete buttons', async () => {
    render(<App />);
    
    // Wait for login and media load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /media descriptions/i })).toBeInTheDocument();
    });

    // Click on Media Descriptions in sidebar
    fireEvent.click(screen.getByRole('button', { name: /media descriptions/i }));
    
    // Wait for media data to load
    await waitFor(() => {
      expect(screen.getByText('Test Media')).toBeInTheDocument();
    });

    // Check that Edit and Delete buttons exist
    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');
    
    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should show create form when Add New Media is clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /media descriptions/i })).toHaveLength(2);
    });

    const mediaButtons = screen.getAllByRole('button', { name: /media descriptions/i });
    fireEvent.click(mediaButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Media')).toBeInTheDocument();
    });

    // Click Add New Media
    fireEvent.click(screen.getByText('Add New Media'));

    // Should show create form
    await waitFor(() => {
      expect(screen.getByText('Create Media Description')).toBeInTheDocument();
    });

    // Check for the required buttons
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    // No delete button for create mode
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('should show edit form when Edit button is clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /media descriptions/i })).toHaveLength(2);
    });

    const mediaButtons = screen.getAllByRole('button', { name: /media descriptions/i });
    fireEvent.click(mediaButtons[0]);
    
    // Wait for either media table or directly for edit buttons (more flexible)
    await waitFor(() => {
      const editButtons = screen.queryAllByText('Edit');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    // Click Edit button
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Should show edit form
    await waitFor(() => {
      expect(screen.getByText('Edit Media Description')).toBeInTheDocument();
    });

    // Check for all required buttons
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should show delete confirmation dialog when Delete is clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /media descriptions/i })).toHaveLength(2);
    });

    const mediaButtons = screen.getAllByRole('button', { name: /media descriptions/i });
    fireEvent.click(mediaButtons[0]);
    
    // Wait for Delete buttons to appear
    await waitFor(() => {
      const deleteButtons = screen.queryAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    // Click Delete button in the table
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Media Description')).toBeInTheDocument();
    });

    expect(screen.getByText('Are you sure you want to delete "Test Media"?')).toBeInTheDocument();
  });

  it('should save form data when Save button is clicked', async () => {
    const { mediaApi } = await import('shared');
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /media descriptions/i })).toHaveLength(2);
    });

    const mediaButtons = screen.getAllByRole('button', { name: /media descriptions/i });
    fireEvent.click(mediaButtons[0]);

    // Wait for Add New Media button and click it
    await waitFor(() => {
      expect(screen.getByText('Add New Media')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add New Media'));

    await waitFor(() => {
      expect(screen.getByText('Create Media Description')).toBeInTheDocument();
    });

    // Fill out form
    const titleInput = screen.getByPlaceholderText('Enter media title');
    fireEvent.change(titleInput, { target: { value: 'New Test Media' } });

    // Click Save
    fireEvent.click(screen.getByText('Save'));

    // Should call create API
    await waitFor(() => {
      expect(mediaApi.createMediaDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Test Media'
        })
      );
    });
  });
});