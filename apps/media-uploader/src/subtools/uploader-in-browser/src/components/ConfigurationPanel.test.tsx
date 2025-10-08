import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigurationPanel } from './ConfigurationPanel'

// Mock localStorage
const mockStorage: { [key: string]: string } = {}

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    }),
  },
  writable: true,
})

describe('ConfigurationPanel', () => {
  const mockOnConfigChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  })

  it('renders configuration panel with title', () => {
    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    expect(screen.getByText('Configuration')).toBeInTheDocument()
    expect(screen.getByLabelText('Configuration File Path')).toBeInTheDocument()
    expect(screen.getByLabelText('Folder Path')).toBeInTheDocument()
  })

  it('renders input fields with placeholders', () => {
    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    const configInput = screen.getByPlaceholderText(/Path to config.ini file/)
    const folderInput = screen.getByPlaceholderText(/Path to media folder/)

    expect(configInput).toBeInTheDocument()
    expect(folderInput).toBeInTheDocument()
  })

  it('calls onConfigChange when config path changes', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    const configInput = screen.getByLabelText('Configuration File Path')
    await user.type(configInput, '/path/to/config.ini')

    expect(mockOnConfigChange).toHaveBeenCalledWith('/path/to/config.ini', '')
  })

  it('calls onConfigChange when folder path changes', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    const folderInput = screen.getByLabelText('Folder Path')
    await user.type(folderInput, '/path/to/folder')

    expect(mockOnConfigChange).toHaveBeenCalledWith('', '/path/to/folder')
  })

  it('persists values in localStorage', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    const configInput = screen.getByLabelText('Configuration File Path')
    const folderInput = screen.getByLabelText('Folder Path')

    await user.type(configInput, '/test/config.ini')
    await user.type(folderInput, '/test/folder')

    expect(localStorage.setItem).toHaveBeenCalledWith('uploader-config-path', '/test/config.ini')
    expect(localStorage.setItem).toHaveBeenCalledWith('uploader-folder-path', '/test/folder')
  })

  it('loads values from localStorage on mount', () => {
    mockStorage['uploader-config-path'] = '/saved/config.ini'
    mockStorage['uploader-folder-path'] = '/saved/folder'

    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    const configInput = screen.getByLabelText('Configuration File Path') as HTMLInputElement
    const folderInput = screen.getByLabelText('Folder Path') as HTMLInputElement

    expect(configInput.value).toBe('/saved/config.ini')
    expect(folderInput.value).toBe('/saved/folder')
  })

  it('renders browse buttons', () => {
    render(<ConfigurationPanel onConfigChange={mockOnConfigChange} />)

    const browseButtons = screen.getAllByTitle(/Browse for/)
    expect(browseButtons).toHaveLength(2)
  })
})