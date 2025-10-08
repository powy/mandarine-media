import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

// Mock the hooks
vi.mock('./hooks/useUploaderTasks', async () => {
  const actual = await vi.importActual('./hooks/useUploaderTasks')
  return {
    ...actual,
    useUploaderHealth: vi.fn(),
  }
})

import { useUploaderHealth } from './hooks/useUploaderTasks'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders app header with title', () => {
    useUploaderHealth.mockReturnValue({
      data: null,
      error: null,
      isLoading: true
    })

    const wrapper = createWrapper()
    render(<App />, { wrapper })

    expect(screen.getByText('Kyool Media Uploader')).toBeInTheDocument()
    expect(screen.getByText('Browser Interface')).toBeInTheDocument()
  })

  it('shows connecting status when loading', () => {
    useUploaderHealth.mockReturnValue({
      data: null,
      error: null,
      isLoading: true
    })

    const wrapper = createWrapper()
    render(<App />, { wrapper })

    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('shows server connected status when health data is available', () => {
    useUploaderHealth.mockReturnValue({
      data: {
        uptime: 3661,
        tasks: { total: 5, running: 2, pending: 1 }
      },
      error: null,
      isLoading: false
    })

    const wrapper = createWrapper()
    render(<App />, { wrapper })

    expect(screen.getByText('Server Connected')).toBeInTheDocument()
    expect(screen.getByText(/Uptime: 1h 1m/)).toBeInTheDocument()
    expect(screen.getByText(/Server is healthy with 5 total tasks/)).toBeInTheDocument()
  })

  it('shows server disconnected status when there is an error', () => {
    useUploaderHealth.mockReturnValue({
      data: null,
      error: new Error('Connection failed'),
      isLoading: false
    })

    const wrapper = createWrapper()
    render(<App />, { wrapper })

    expect(screen.getByText('Server Disconnected')).toBeInTheDocument()
    expect(screen.getByText('Server Connection Failed')).toBeInTheDocument()
    expect(screen.getByText(/Could not connect to the media uploader server/)).toBeInTheDocument()
  })

  it('renders retry connection button when disconnected', () => {
    useUploaderHealth.mockReturnValue({
      data: null,
      error: new Error('Connection failed'),
      isLoading: false
    })

    const wrapper = createWrapper()
    render(<App />, { wrapper })

    expect(screen.getByText('Retry Connection')).toBeInTheDocument()
  })
})