import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ScreenContentList, ScreenContentShow, ScreenContentCreate, ScreenContentEdit } from '../../components/resources/ScreenContents';

// Mock MUI components
vi.mock('@mui/material', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogActions: ({ children }: any) => <div data-testid="dialog-actions">{children}</div>,
  Typography: ({ children }: any) => <div data-testid="typography">{children}</div>,
  Box: ({ children }: any) => <div data-testid="box">{children}</div>,
}));

// Mock share package functions
vi.mock('share', () => ({
  getScreenDescriptionJSON: vi.fn().mockResolvedValue({}),
  regenerateScreenDescriptionJSON: vi.fn().mockResolvedValue({}),
  reorderScreenDescriptionLists: vi.fn().mockResolvedValue({}),
}));

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  BooleanField: ({ source }: any) => <div data-testid={`boolean-field-${source}`}>{source}</div>,
  FunctionField: ({ label, render }: any) => <div data-testid={`function-field-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{label}</div>,
  ArrayField: ({ source }: any) => <div data-testid={`array-field-${source}`}>{source}</div>,
  SingleFieldList: ({ children }: any) => <div data-testid="single-field-list">{children}</div>,
  ChipField: ({ source }: any) => <div data-testid={`chip-field-${source}`}>{source}</div>,
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  Create: ({ children }: any) => <div data-testid="create">{children}</div>,
  Edit: ({ children }: any) => <div data-testid="edit">{children}</div>,
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleForm: ({ children }: any) => <div data-testid="form">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
  NumberInput: ({ source, label }: any) => <div data-testid={`number-input-${source}`}>{label}</div>,
  BooleanInput: ({ source, label }: any) => <div data-testid={`boolean-input-${source}`}>{label}</div>,
  SelectInput: ({ source }: any) => <div data-testid={`select-input-${source}`}>{source}</div>,
  ArrayInput: ({ source, children }: any) => <div data-testid={`array-input-${source}`}>{children}</div>,
  SimpleFormIterator: ({ children }: any) => <div data-testid="form-iterator">{children}</div>,
  ReferenceInput: ({ source, children }: any) => (
    <div data-testid={`reference-input-${source}`}>
      {source}
      {children}
    </div>
  ),
  AutocompleteInput: ({ optionText }: any) => (
    <div data-testid="autocomplete-input">{optionText}</div>
  ),
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Toolbar: ({ children }: any) => <div data-testid="form-toolbar">{children}</div>,
  SaveButton: () => <div data-testid="save-button">Save</div>,
  Button: ({ label }: any) => <div data-testid={`button-${label?.toLowerCase()}`}>{label}</div>,
  ListButton: () => <div data-testid="list-button">List</div>,
  SearchInput: ({ source }: any) => <div data-testid={`search-input-${source}`}>{source}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  useRecordContext: () => ({ id: '123', title: 'Test Screen' }),
  useNotify: () => vi.fn(),
  useRefresh: () => vi.fn(),
  required: () => (value: any) => value ? undefined : 'Required',
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('ScreenContent Components', () => {
  const mockRecord = {
    id: '123',
    title: 'Home Screen',
    description: 'Main home screen with featured content',
    slug: 'home',
    is_active: true,
    display_order: 1,
    content_lists: ['list1', 'list2'],
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ScreenContentList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <ScreenContentList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-title')).toBeInTheDocument();
      expect(screen.getByTestId('field-slug')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('field-display_order')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders function fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('function-field-description')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-content-lists')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-json')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <ScreenContentList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <ScreenContentList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input-q')).toBeInTheDocument();
    });
  });

  describe('ScreenContentCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <ScreenContentCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required title field', () => {
      render(
        <MemoryRouter>
          <ScreenContentCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-title')).toBeInTheDocument();
    });

    test('includes description and slug fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-description')).toBeInTheDocument();
      expect(screen.getByTestId('input-slug')).toBeInTheDocument();
    });

    test('includes active status and display order fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('boolean-input-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-display_order')).toBeInTheDocument();
    });

    test('includes content lists array input', () => {
      render(
        <MemoryRouter>
          <ScreenContentCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('array-input-content_lists')).toBeInTheDocument();
    });

    test('renders form toolbar', () => {
      render(
        <MemoryRouter>
          <ScreenContentCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('form-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  describe('ScreenContentEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <ScreenContentEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required title field', () => {
      render(
        <MemoryRouter>
          <ScreenContentEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-title')).toBeInTheDocument();
    });

    test('includes all form fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-description')).toBeInTheDocument();
      expect(screen.getByTestId('input-slug')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-input-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-display_order')).toBeInTheDocument();
      expect(screen.getByTestId('array-input-content_lists')).toBeInTheDocument();
    });
  });

  describe('ScreenContentShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <ScreenContentShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-title')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByTestId('field-slug')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('field-display_order')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-content_lists')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('displays timestamp fields', () => {
      render(
        <MemoryRouter>
          <ScreenContentShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('date-field-last_updated_utc')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-json_last_updated')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <ScreenContentShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });
});