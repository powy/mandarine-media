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
    expect(screen.getByTestId('resource-languages')).toBeInTheDocument();
    expect(screen.getByTestId('resource-programs')).toBeInTheDocument();
    expect(screen.getByTestId('resource-seasons')).toBeInTheDocument();
    expect(screen.getByTestId('resource-public-persons')).toBeInTheDocument();
    expect(screen.getByTestId('resource-pictures')).toBeInTheDocument();
    expect(screen.getByTestId('resource-territories')).toBeInTheDocument();
    expect(screen.getByTestId('resource-users')).toBeInTheDocument();
    expect(screen.getByTestId('resource-category-lists')).toBeInTheDocument();
    expect(screen.getByTestId('resource-content-lists')).toBeInTheDocument();
    expect(screen.getByTestId('resource-screen-descriptions')).toBeInTheDocument();
    expect(screen.getByTestId('resource-video-files')).toBeInTheDocument();
    expect(screen.getByTestId('resource-description-reports')).toBeInTheDocument();
  });
});