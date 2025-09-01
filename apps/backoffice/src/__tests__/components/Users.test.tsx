import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { UserList, UserShow, UserCreate, UserEdit } from '../../components/resources/Users';

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children, filters, actions }: any) => (
    <div data-testid="list">
      {actions}
      {Array.isArray(filters) ? filters.map((filter, index) => (
        <div key={index}>{filter}</div>
      )) : filters}
      {children}
    </div>
  ),
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  BooleanField: ({ source }: any) => <div data-testid={`boolean-field-${source}`}>{source}</div>,
  EmailField: ({ source }: any) => <div data-testid={`email-field-${source}`}>{source}</div>,
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  Create: ({ children }: any) => <div data-testid="create">{children}</div>,
  Edit: ({ children }: any) => <div data-testid="edit">{children}</div>,
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleForm: ({ children }: any) => <div data-testid="form">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
  BooleanInput: ({ source, label }: any) => <div data-testid={`boolean-input-${source}`}>{label}</div>,
  PasswordInput: ({ source, label }: any) => <div data-testid={`password-input-${source}`}>{label}</div>,
  SelectInput: ({ source, label, optionText }: any) => <div data-testid={`select-input${source ? `-${source}` : ''}`}>{label || optionText}</div>,
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Toolbar: ({ children }: any) => <div data-testid="form-toolbar">{children}</div>,
  SaveButton: () => <div data-testid="save-button">Save</div>,
  Button: ({ label }: any) => <div data-testid={`button-${label?.toLowerCase()}`}>{label}</div>,
  ListButton: () => <div data-testid="list-button">List</div>,
  SearchInput: ({ source, placeholder }: any) => <div data-testid={`search-input-${source}`}>{placeholder}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  required: () => (value: any) => value ? undefined : 'Required',
  email: () => (value: any) => value && !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : undefined,
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('User Components', () => {
  const mockRecord = {
    id: '123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UserList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <UserList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <UserList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('email-field-email')).toBeInTheDocument();
      expect(screen.getByTestId('field-first_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-last_name')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <UserList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <UserList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input-q')).toBeInTheDocument();
    });
  });

  describe('UserCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <UserCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required email field', () => {
      render(
        <MemoryRouter>
          <UserCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-email')).toBeInTheDocument();
    });

    test('includes name fields', () => {
      render(
        <MemoryRouter>
          <UserCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-first_name')).toBeInTheDocument();
      expect(screen.getByTestId('input-last_name')).toBeInTheDocument();
    });

    test('includes password field', () => {
      render(
        <MemoryRouter>
          <UserCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('password-input-password')).toBeInTheDocument();
    });

    test('includes active status field', () => {
      render(
        <MemoryRouter>
          <UserCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('boolean-input-is_active')).toBeInTheDocument();
    });

    test('renders form toolbar', () => {
      render(
        <MemoryRouter>
          <UserCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('form-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  describe('UserEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <UserEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required email field', () => {
      render(
        <MemoryRouter>
          <UserEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-email')).toBeInTheDocument();
    });

    test('includes name fields', () => {
      render(
        <MemoryRouter>
          <UserEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-first_name')).toBeInTheDocument();
      expect(screen.getByTestId('input-last_name')).toBeInTheDocument();
    });

    test('includes active status field', () => {
      render(
        <MemoryRouter>
          <UserEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('boolean-input-is_active')).toBeInTheDocument();
    });
  });

  describe('UserShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <UserShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <UserShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('email-field-email')).toBeInTheDocument();
      expect(screen.getByTestId('field-first_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-last_name')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_active')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <UserShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });
});