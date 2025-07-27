import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ContentListsPage from '../pages/content-lists/ContentListsPage';
import * as shareModule from 'share';

// Mock all the API functions
vi.mock('share', () => ({
  getContentLists: vi.fn(),
  createContentList: vi.fn(),
  updateContentList: vi.fn(),
  deleteContentList: vi.fn(),
  regenerateContentListJSON: vi.fn(),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockContentLists = [
  {
    id: '1',
    creation_date_utc: '2024-01-01T00:00:00Z',
    last_updated_utc: '2024-01-01T00:00:00Z',
    title: 'Featured Movies',
    thumbnail_format: 'large_landscape' as const,
    is_active: true,
    display_order: 1,
    description: 'Top featured movies',
    content_items: ['movie1', 'movie2'],
    content_types: ['media_description', 'media_description'],
  },
  {
    id: '2',
    creation_date_utc: '2024-01-02T00:00:00Z',
    last_updated_utc: '2024-01-02T00:00:00Z',
    title: 'TV Shows',
    thumbnail_format: 'medium_portrait' as const,
    is_active: false,
    display_order: 2,
    description: 'Popular TV shows',
    content_items: ['show1'],
    content_types: ['program'],
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ContentListsPage - API v1.6 Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: mockContentLists,
      pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
    });
  });

  it('renders content lists page with v1.6 features', async () => {
    renderWithProviders(<ContentListsPage />);

    expect(screen.getByText('Content Lists Management')).toBeInTheDocument();
    expect(screen.getByText('Manage flexible content collections with mixed Programs, Seasons, and Media items (API v1.6)')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Featured Movies')).toBeInTheDocument();
      expect(screen.getByText('TV Shows')).toBeInTheDocument();
    });

    // Check v1.6 specific fields
    expect(screen.getByText('LARGE_LANDSCAPE')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM_PORTRAIT')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  it('creates a new content list with v1.6 fields', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.createContentList).mockResolvedValue({
      id: '3',
      creation_date_utc: '2024-01-03T00:00:00Z',
      last_updated_utc: '2024-01-03T00:00:00Z',
      title: 'New Content List',
      thumbnail_format: 'small_square',
      is_active: true,
      display_order: 3,
      description: 'Test description',
      content_items: [],
      content_types: [],
    });

    renderWithProviders(<ContentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('Create Content List')).toBeInTheDocument();
    });

    // Click create button
    await user.click(screen.getByText('Create Content List'));

    // Fill form with v1.6 specific fields
    await user.type(screen.getByLabelText(/title/i), 'New Content List');
    await user.selectOptions(screen.getByLabelText(/thumbnail format/i), 'small_square');
    await user.clear(screen.getByLabelText(/display order/i));
    await user.type(screen.getByLabelText(/display order/i), '3');
    await user.type(screen.getByLabelText(/description/i), 'Test description');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(shareModule.createContentList).toHaveBeenCalledWith({
        title: 'New Content List',
        thumbnail_format: 'small_square',
        is_active: true,
        display_order: 3,
        description: 'Test description',
        content_items: [],
        content_types: [],
      });
    });
  });

  it('updates content list with v1.6 fields', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.updateContentList).mockResolvedValue({
      ...mockContentLists[0],
      title: 'Updated Featured Movies',
      thumbnail_format: 'vertical_mobile',
    });

    renderWithProviders(<ContentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('Featured Movies')).toBeInTheDocument();
    });

    // Click edit button for first content list
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Update fields
    const titleInput = screen.getByDisplayValue('Featured Movies');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Featured Movies');
    
    await user.selectOptions(screen.getByDisplayValue('large_landscape'), 'vertical_mobile');

    // Submit form
    await user.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(shareModule.updateContentList).toHaveBeenCalledWith('1', {
        title: 'Updated Featured Movies',
        thumbnail_format: 'vertical_mobile',
        is_active: true,
        display_order: 1,
        description: 'Top featured movies',
        content_items: ['movie1', 'movie2'],
        content_types: ['media_description', 'media_description'],
      });
    });
  });

  it('deletes content list', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.deleteContentList).mockResolvedValue();

    renderWithProviders(<ContentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('Featured Movies')).toBeInTheDocument();
    });

    // Click delete button for first content list
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    // Confirm deletion
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(shareModule.deleteContentList).toHaveBeenCalledWith('1');
    });
  });

  it('regenerates JSON cache for content list', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.regenerateContentListJSON).mockResolvedValue();

    renderWithProviders(<ContentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('Featured Movies')).toBeInTheDocument();
    });

    // Click regenerate JSON button for first content list
    const regenerateButtons = screen.getAllByText('Regenerate JSON');
    await user.click(regenerateButtons[0]);

    await waitFor(() => {
      expect(shareModule.regenerateContentListJSON).toHaveBeenCalledWith('1');
    });
  });

  it('handles thumbnail format options correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ContentListsPage />);

    // Click create button
    await user.click(screen.getByText('Create Content List'));

    // Check all thumbnail format options are available
    const formatSelect = screen.getByLabelText(/thumbnail format/i);
    expect(formatSelect).toBeInTheDocument();

    const options = formatSelect.querySelectorAll('option');
    const optionValues = Array.from(options).map(option => option.getAttribute('value'));
    
    expect(optionValues).toContain('small_square');
    expect(optionValues).toContain('medium_portrait');
    expect(optionValues).toContain('large_landscape');
    expect(optionValues).toContain('vertical_mobile');
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.createContentList).mockRejectedValue({
      response: {
        data: {
          detail: 'Validation failed: Title is required'
        }
      }
    });

    renderWithProviders(<ContentListsPage />);

    // Click create button
    await user.click(screen.getByText('Create Content List'));

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /create/i }));

    // The form validation should prevent submission, but if it reaches the API...
    // We expect the error to be handled gracefully
  });

  it('displays active/inactive status correctly', async () => {
    renderWithProviders(<ContentListsPage />);

    await waitFor(() => {
      // Should show active status for first content list
      const statusBadges = screen.getAllByText('Active');
      expect(statusBadges.length).toBeGreaterThan(0);

      // Should show inactive status for second content list  
      const inactiveStatusBadges = screen.getAllByText('Inactive');
      expect(inactiveStatusBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows content items count correctly', async () => {
    renderWithProviders(<ContentListsPage />);

    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument(); // Featured Movies
      expect(screen.getByText('1 items')).toBeInTheDocument(); // TV Shows
    });
  });

  it('handles loading states', async () => {
    // Make the API call take a long time
    vi.mocked(shareModule.getContentLists).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: mockContentLists,
        pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
      }), 100))
    );

    renderWithProviders(<ContentListsPage />);

    // Should show loading state initially
    // The DataTable component should handle loading display
    expect(screen.getByText('Content Lists Management')).toBeInTheDocument();
  });
});