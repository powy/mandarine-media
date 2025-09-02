import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ContentListList, ContentListShow } from '../../components/resources/ContentLists';

// Mock the share package
const mockGetContentListJSON = vi.fn();
const mockRegenerateContentListJSON = vi.fn();
const mockAutoGenerateContentLists = vi.fn();
const mockUpdateDynamicContentLists = vi.fn();

vi.mock('share', () => ({
  getContentListJSON: mockGetContentListJSON,
  regenerateContentListJSON: mockRegenerateContentListJSON,
  autoGenerateContentLists: mockAutoGenerateContentLists,
  updateDynamicContentLists: mockUpdateDynamicContentLists,
}));

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  BooleanField: ({ source }: any) => <div data-testid={`boolean-field-${source}`}>{source}</div>,
  FunctionField: ({ label, render }: any) => (
    <div data-testid="function-field" onClick={() => render && render({ id: '123', title: 'Test' })}>
      {label}
    </div>
  ),
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  ListButton: ({ label }: any) => <div data-testid="list-button">{label}</div>,
  Button: ({ onClick, label, children }: any) => (
    <button data-testid={`button-${label?.toLowerCase().replace(/\\s+/g, '-')}`} onClick={onClick}>
      {label || children}
    </button>
  ),
  ArrayField: ({ source }: any) => <div data-testid={`array-field-${source}`}>{source}</div>,
  SingleFieldList: ({ children }: any) => <div data-testid="single-field-list">{children}</div>,
  ChipField: ({ source }: any) => <div data-testid={`chip-field-${source}`}>{source}</div>,
  useRecordContext: vi.fn(),
  useNotify: vi.fn(),
  useRefresh: vi.fn(),
  SearchInput: ({ placeholder }: any) => <input data-testid="search-input" placeholder={placeholder} />,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
}));

// Mock Material-UI
vi.mock('@mui/material', () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogActions: ({ children }: any) => <div data-testid="dialog-actions">{children}</div>,
  Box: ({ children }: any) => <div data-testid="box">{children}</div>,
  Typography: ({ children }: any) => <div data-testid="typography">{children}</div>,
}));

describe('ContentLists Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ContentListList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <ContentListList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-title')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('field-display_order')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <ContentListList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('filter-button')).toBeInTheDocument();
      expect(screen.getByTestId('create-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByTestId('button-auto-generate-lists')).toBeInTheDocument();
      expect(screen.getByTestId('button-update-dynamic-lists')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <ContentListList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search content lists...')).toBeInTheDocument();
    });
  });

  describe('ContentListShow', () => {
    test('renders show structure correctly', () => {
      render(
        <MemoryRouter>
          <ContentListShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-title')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('field-display_order')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-content_items')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-last_updated_utc')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-json_last_updated')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <ContentListShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('list-button')).toBeInTheDocument();
      expect(screen.getByTestId('button-view-json')).toBeInTheDocument();
      expect(screen.getByTestId('button-regenerate-json')).toBeInTheDocument();
    });

    test('view JSON button opens dialog', async () => {
      const mockJsonData = { content: 'test json data' };
      mockGetContentListJSON.mockResolvedValue(mockJsonData);

      render(
        <MemoryRouter>
          <ContentListShow />
        </MemoryRouter>
      );

      const viewJsonButton = screen.getByTestId('button-view-json');
      fireEvent.click(viewJsonButton);

      await waitFor(() => {
        expect(mockGetContentListJSON).toHaveBeenCalledWith('123');
      });

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      });
    });

    test('regenerate JSON button calls API and shows notification', async () => {
      mockRegenerateContentListJSON.mockResolvedValue(undefined);

      render(
        <MemoryRouter>
          <ContentListShow />
        </MemoryRouter>
      );

      const regenerateButton = screen.getByTestId('button-regenerate-json');
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(mockRegenerateContentListJSON).toHaveBeenCalledWith('123');
        expect(mockNotify).toHaveBeenCalledWith('JSON cache regenerated successfully', { type: 'success' });
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    test('handles JSON API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch JSON';
      mockGetContentListJSON.mockRejectedValue(new Error(errorMessage));

      render(
        <MemoryRouter>
          <ContentListShow />
        </MemoryRouter>
      );

      const viewJsonButton = screen.getByTestId('button-view-json');
      fireEvent.click(viewJsonButton);

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith(`Error fetching JSON: ${errorMessage}`, { type: 'error' });
      });
    });

    test('handles regenerate JSON API errors gracefully', async () => {
      const errorMessage = 'Failed to regenerate JSON';
      mockRegenerateContentListJSON.mockRejectedValue(new Error(errorMessage));

      render(
        <MemoryRouter>
          <ContentListShow />
        </MemoryRouter>
      );

      const regenerateButton = screen.getByTestId('button-regenerate-json');
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith(`Error regenerating JSON: ${errorMessage}`, { type: 'error' });
      });
    });
  });

});