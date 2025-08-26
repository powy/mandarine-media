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
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
      expect(screen.getByTestId('image-field-photo_url')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-created_at')).toBeInTheDocument();
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

      expect(screen.getByTestId('filter-button')).toBeInTheDocument();
      expect(screen.getByTestId('create-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <PictureList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search pictures...')).toBeInTheDocument();
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
      expect(screen.getByTestId('input-photo_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('input-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('input-description')).toBeInTheDocument();
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

    test('includes description field', () => {
      render(
        <MemoryRouter>
          <PictureCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-description')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    test('renders form toolbar', () => {
      render(
        <MemoryRouter>
          <PictureCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('form-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('button-cancel')).toBeInTheDocument();
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
      expect(screen.getByTestId('input-photo_url')).toBeInTheDocument();
      expect(screen.getByTestId('input-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('input-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('input-description')).toBeInTheDocument();
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

    test('includes description field', () => {
      render(
        <MemoryRouter>
          <PictureEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-description')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
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
      expect(screen.getByTestId('image-field-photo_url')).toBeInTheDocument();
      expect(screen.getByTestId('url-field-photo_url')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-alt_text')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByTestId('field-width')).toBeInTheDocument();
      expect(screen.getByTestId('field-height')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-created_at')).toBeInTheDocument();
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

    test('includes description field', () => {
      render(
        <MemoryRouter>
          <PictureShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <PictureShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('list-button')).toBeInTheDocument();
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
    });
  });
});