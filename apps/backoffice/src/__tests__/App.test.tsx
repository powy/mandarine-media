import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';

// Mock the share package
vi.mock('share', () => ({
  // Mock auth API
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
  },
  // Mock other APIs
  countriesApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  mediaApi: { getMediaDescriptions: vi.fn(), getMediaDescription: vi.fn() },
  languagesApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  // ... more mocks would be added for all APIs
}));

// Mock react-admin
vi.mock('react-admin', () => ({
  Admin: ({ children }: any) => <div data-testid="admin">{children}</div>,
  Resource: ({ name }: any) => <div data-testid={`resource-${name}`}>{name}</div>,
  Layout: ({ children }: any) => <div data-testid="layout">{children}</div>,
  AppBar: ({ children }: any) => <div data-testid="appbar">{children}</div>,
  Menu: ({ children }: any) => <div data-testid="menu">{children}</div>,
  MenuItemLink: ({ primaryText }: any) => <div data-testid="menu-item">{primaryText}</div>,
  useSidebarState: () => [false],
  SearchInput: ({ source }: any) => <div data-testid={`search-input-${source}`}>{source}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  ReferenceInput: ({ source, reference }: any) => <div data-testid={`reference-input-${source}`}>{reference}</div>,
  SelectInput: ({ source }: any) => <div data-testid={`select-input-${source}`}>{source}</div>,
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  Create: ({ children }: any) => <div data-testid="create">{children}</div>,
  Edit: ({ children }: any) => <div data-testid="edit">{children}</div>,
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleForm: ({ children }: any) => <div data-testid="form">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source }: any) => <div data-testid={`input-${source}`}>{source}</div>,
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Filter: ({ children }: any) => <div data-testid="filter">{children}</div>,
  required: () => (value: any) => value ? undefined : 'Required',
}));

describe('App Component', () => {
  let history: any;

  beforeEach(() => {
    history = createMemoryHistory();
  });

  test('renders the main app structure', () => {
    render(
      <Router location={history.location} navigator={history}>
        <App />
      </Router>
    );

    expect(screen.getByTestId('admin')).toBeInTheDocument();
  });

  test('includes all required resources', () => {
    render(
      <Router location={history.location} navigator={history}>
        <App />
      </Router>
    );

    // Check for core resources
    expect(screen.getByTestId('resource-media-descriptions')).toBeInTheDocument();
    expect(screen.getByTestId('resource-countries')).toBeInTheDocument();
    expect(screen.getByTestId('resource-territories')).toBeInTheDocument();
    expect(screen.getByTestId('resource-languages')).toBeInTheDocument();
    expect(screen.getByTestId('resource-audience-categories')).toBeInTheDocument();
    expect(screen.getByTestId('resource-subscription-plans')).toBeInTheDocument();
    expect(screen.getByTestId('resource-themes')).toBeInTheDocument();
    expect(screen.getByTestId('resource-media-themes')).toBeInTheDocument();
    expect(screen.getByTestId('resource-programs')).toBeInTheDocument();
    expect(screen.getByTestId('resource-seasons')).toBeInTheDocument();
    expect(screen.getByTestId('resource-public-persons')).toBeInTheDocument();
    expect(screen.getByTestId('resource-pictures')).toBeInTheDocument();
    expect(screen.getByTestId('resource-users')).toBeInTheDocument();
    expect(screen.getByTestId('resource-content-lists')).toBeInTheDocument();
    expect(screen.getByTestId('resource-screen-descriptions')).toBeInTheDocument();
    expect(screen.getByTestId('resource-video-files')).toBeInTheDocument();
  });
});