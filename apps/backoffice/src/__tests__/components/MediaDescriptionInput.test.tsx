import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { MediaDescriptionInput } from '../../components/inputs/MediaDescriptionInput';

// Mock react-admin
const mockUseInput = vi.fn();
const mockUseDataProvider = vi.fn();

vi.mock('react-admin', () => ({
  ReferenceInput: ({ children }: any) => <div data-testid="reference-input">{children}</div>,
  AutocompleteInput: () => <div data-testid="autocomplete-input">AutocompleteInput</div>,
  TextInput: ({ label, helperText, placeholder }: any) => (
    <div data-testid="text-input">
      <label>{label}</label>
      <input placeholder={placeholder} />
      {helperText && <span>{helperText}</span>}
    </div>
  ),
  useInput: mockUseInput,
  useDataProvider: mockUseDataProvider,
  useGetOne: vi.fn(),
  useNotify: vi.fn(),
}));

// Mock Material UI
vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div data-testid="box">{children}</div>,
  Typography: ({ children, onClick }: any) => (
    <span data-testid="typography" onClick={onClick}>{children}</span>
  ),
  Chip: ({ label }: any) => <span data-testid="chip">{label}</span>,
  Alert: ({ children, severity }: any) => (
    <div data-testid={`alert-${severity}`}>{children}</div>
  ),
}));

describe('MediaDescriptionInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInput.mockReturnValue({
      field: { value: '' }
    });
    mockUseDataProvider.mockReturnValue({
      getOne: vi.fn()
    });
  });

  test('renders in reference mode by default', () => {
    render(
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description"
      />
    );

    expect(screen.getByTestId('reference-input')).toBeInTheDocument();
    expect(screen.getByTestId('autocomplete-input')).toBeInTheDocument();
    expect(screen.getByText('Enter UUID directly instead')).toBeInTheDocument();
  });

  test('switches to direct UUID entry mode when clicked', () => {
    render(
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description"
        allowDirectUUID={true}
      />
    );

    const switchLink = screen.getByText('Enter UUID directly instead');
    fireEvent.click(switchLink);

    expect(screen.getByTestId('text-input')).toBeInTheDocument();
    expect(screen.getByText('Media Description (Direct UUID Entry)')).toBeInTheDocument();
    expect(screen.getByText('Switch to search mode')).toBeInTheDocument();
  });

  test('switches back to reference mode', () => {
    render(
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description"
        allowDirectUUID={true}
      />
    );

    // Switch to direct mode
    const directLink = screen.getByText('Enter UUID directly instead');
    fireEvent.click(directLink);

    // Switch back to reference mode
    const referenceLink = screen.getByText('Switch to search mode');
    fireEvent.click(referenceLink);

    expect(screen.getByTestId('reference-input')).toBeInTheDocument();
    expect(screen.getByTestId('autocomplete-input')).toBeInTheDocument();
  });

  test('disables direct UUID entry when allowDirectUUID is false', () => {
    render(
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description"
        allowDirectUUID={false}
      />
    );

    expect(screen.queryByText('Enter UUID directly instead')).not.toBeInTheDocument();
  });

  test('applies correct placeholder in direct UUID mode', () => {
    render(
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description"
      />
    );

    const switchLink = screen.getByText('Enter UUID directly instead');
    fireEvent.click(switchLink);

    expect(screen.getByPlaceholderText('e.g. f3a43213-5c78-43c4-8635-1cc32c66ece0')).toBeInTheDocument();
  });

  test('shows helper text in direct UUID mode', () => {
    render(
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description"
      />
    );

    const switchLink = screen.getByText('Enter UUID directly instead');
    fireEvent.click(switchLink);

    expect(screen.getByText('Enter a valid MediaDescription UUID directly')).toBeInTheDocument();
  });
});