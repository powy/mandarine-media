// Mock share package for testing without monorepo dependency issues

// Mock API client
export const initApiClient = (config: any) => {
  console.log('Mock API client initialized with config:', config);
};

// Mock API responses
const mockResponse = (data: any) => Promise.resolve(data);
const mockError = (message: string) => Promise.reject(new Error(message));

// Auth API Mock
export const authApi = {
  getCurrentUser: () => mockResponse({
    id: 1,
    email: 'demo@kyool.com',
    full_name: 'Demo User',
    is_admin: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
};

// Media API Mock
export const mediaApi = {
  getMediaDescriptions: (filters?: any) => mockResponse({
    data: [
      {
        id: '1',
        file_number: 1,
        episode_title: 'Sample Episode',
        media_type: 'video',
        creation_date_utc: new Date().toISOString()
      }
    ],
    pagination: { total: 1, page: 1, limit: 10, total_pages: 1 }
  }),
  
  getFeaturedMedia: (skip?: number, limit?: number) => mockResponse([
    {
      id: '1',
      episode_title: 'Featured Content',
      media_type: 'video',
      is_featured: true
    }
  ]),
  
  getTrendingMedia: (skip?: number, limit?: number) => mockResponse([
    {
      id: '2',
      episode_title: 'Trending Content',
      media_type: 'video',
      is_trending: true
    }
  ]),
  
  getVideoFiles: (filters?: any) => mockResponse({
    data: [
      {
        id: '1',
        file_name: 'sample_video.mp4',
        upload_status: 'upload_completed',
        encoding_status: 'ready'
      }
    ],
    pagination: { total: 1, page: 1, limit: 10, total_pages: 1 }
  }),
  
  getUnlinkedVideoFiles: (skip?: number, limit?: number) => mockResponse([]),
  
  getDescriptionReports: (skip?: number, limit?: number) => mockResponse({
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 }
  }),
};

// Users API Mock
export const usersApi = {
  getUsers: (filters?: any) => mockResponse({
    data: [
      {
        id: 1,
        email: 'demo@kyool.com',
        full_name: 'Demo User',
        is_admin: true,
        is_active: true
      }
    ],
    pagination: { total: 1, page: 1, limit: 10, total_pages: 1 }
  }),
};

// Generic mock for other APIs
const createMockApi = (entityName: string) => ({
  getAll: (params?: any) => mockResponse([
    {
      id: '1',
      name: `Sample ${entityName}`,
      created_at: new Date().toISOString()
    }
  ]),
  getById: (id: string) => mockResponse({
    id,
    name: `Sample ${entityName}`,
    created_at: new Date().toISOString()
  })
});

const createMockListApi = (entityName: string) => ({
  [`get${entityName}`]: (filters?: any) => mockResponse({
    data: [
      {
        id: '1',
        name: `Sample ${entityName}`,
        created_at: new Date().toISOString()
      }
    ],
    pagination: { total: 1, page: 1, limit: 10, total_pages: 1 }
  })
});

// Export all mock APIs
export const personsApi = {
  getPublicPersons: (filters?: any) => mockResponse({
    data: [
      {
        id: '1',
        stage_name_roman: 'John Doe',
        profession_list: ['actor'],
        created_at: new Date().toISOString()
      }
    ],
    pagination: { total: 1, page: 1, limit: 10, total_pages: 1 }
  }),
};

export const programsApi = createMockApi('Program');
export const seasonsApi = createMockApi('Season');
export const countriesApi = createMockApi('Country');
export const territoriesApi = createMockApi('Territory');
export const languagesApi = createMockApi('Language');
export const picturesApi = createMockApi('Picture');

export const categoryListsApi = {
  getCategoryLists: (params?: any) => mockResponse({
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 }
  }),
};

export const contentListsApi = {
  getContentLists: (filters?: any) => mockResponse({
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 }
  }),
};

export const screenDescriptionsApi = {
  getScreenDescriptions: (filters?: any) => mockResponse({
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 }
  }),
};

// Legacy support for v1.8 compatibility
export const screenContentsApi = {
  getScreenContents: (filters?: any) => mockResponse({
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 }
  }),
};

export const videoFileReportsApi = {
  getReports: (params?: any) => mockResponse({
    data: [],
    pagination: { total: 0, page: 1, limit: 10, total_pages: 0 }
  }),
};

// Individual function exports for direct imports
export const getContentLists = contentListsApi.getContentLists;
export const getScreenDescriptions = screenDescriptionsApi.getScreenDescriptions;
export const getScreenContents = screenContentsApi.getScreenContents; // Legacy v1.8 support

// Mock useAuth hook
export const useAuth = () => ({
  isAuthenticated: true,
  isLoadingUser: false,
  user: {
    id: 1,
    email: 'demo@kyool.com',
    full_name: 'Demo User',
    is_admin: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  logout: async () => {
    console.log('Mock logout called');
  }
});