import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PictureList, PictureShow, PictureCreate, PictureEdit } from '../../components/resources/Pictures';

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  ImageField: ({ source }: any) => <div data-testid={`image-field-${source}`}>{source}</div>,
  UrlField: ({ source }: any) => <div data-testid={`url-field-${source}`}>{source}</div>,
  FunctionField: ({ label }: any) => <div data-testid="function-field">{label}</div>,
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
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Toolbar: ({ children }: any) => <div data-testid="form-toolbar">{children}</div>,
  SaveButton: () => <div data-testid="save-button">Save</div>,
  Button: ({ label }: any) => <div data-testid={`button-${label?.toLowerCase()}`}>{label}</div>,
  ListButton: ({ label }: any) => <div data-testid="list-button">{label}</div>,
  SearchInput: ({ placeholder }: any) => <input data-testid="search-input" placeholder={placeholder} />,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  required: vi.fn(() => (value: any) => value ? undefined : 'Required'),
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Picture Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PictureList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <PictureList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('image-field-image_url')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('function-field')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders dimensions function field', () => {
      render(
        <MemoryRouter>
          <PictureList />
        </MemoryRouter>
      );

      expect(screen.getByText('Dimensions')).toBeInTheDocument();
    });

    test('does not render file size field', () => {
      render(
        <MemoryRouter>
          <PictureList />
        </MemoryRouter>
      );

      // Should not have any reference to file size
      expect(screen.queryByText('Size')).not.toBeInTheDocument();
      expect(screen.queryByText('File Size')).not.toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <PictureList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });
  });

  describe('PictureCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <PictureCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
      expect(screen.getByTestId('input-image_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-large_image_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-small_image_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('input-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-width')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-height')).toBeInTheDocument();
    });

    test('does not render file_size_bytes input', () => {
      render(
        <MemoryRouter>
          <PictureCreate />
        </MemoryRouter>
      );

      // Should not have file_size_bytes input
      expect(screen.queryByTestId('number-input-file_size_bytes')).not.toBeInTheDocument();
      expect(screen.queryByText('File Size (bytes)')).not.toBeInTheDocument();
    });


  });

  describe('PictureEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <PictureEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
      expect(screen.getByTestId('input-image_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-large_image_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-small_image_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('input-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-width')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-height')).toBeInTheDocument();
    });

    test('does not render file_size_bytes input', () => {
      render(
        <MemoryRouter>
          <PictureEdit />
        </MemoryRouter>
      );

      // Should not have file_size_bytes input
      expect(screen.queryByTestId('number-input-file_size_bytes')).not.toBeInTheDocument();
      expect(screen.queryByText('File Size (bytes)')).not.toBeInTheDocument();
    });

  });

  describe('PictureShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <PictureShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('image-field-image_url')).toBeInTheDocument();
      expect(screen.getByTestId('url-field-image_url')).toBeInTheDocument();
      expect(screen.getByTestId('url-field-large_image_url')).toBeInTheDocument();
      expect(screen.getByTestId('url-field-small_image_url')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('field-width')).toBeInTheDocument();
      expect(screen.getByTestId('field-height')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('does not render file_size_bytes field', () => {
      render(
        <MemoryRouter>
          <PictureShow />
        </MemoryRouter>
      );

      // Should not have file_size_bytes field
      expect(screen.queryByTestId('field-file_size_bytes')).not.toBeInTheDocument();
      expect(screen.queryByText('File Size (bytes)')).not.toBeInTheDocument();
    });


  });
});