import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { authApi, initApiClient, usersApi } from 'share';
import SimpleAppLayout from './components/layout/SimpleAppLayout';
import PersonsManagementPage from './pages/persons/PersonsManagementPage';
import CategoryListsPage from './pages/category-lists/CategoryListsPage';
import UsersManagementPage from './pages/users/UsersManagementPage';
import ProgramsManagementPage from './pages/programs/ProgramsManagementPage';
import ContentListsPage from './pages/content-lists/ContentListsPage';
import ScreenContentsPage from './pages/screen-contents/ScreenContentsPage';
import { MediaListPage } from './pages/media/MediaListPage';
import { VideoFileListPage } from './pages/video-files/VideoFileListPage';
import { LanguagesPage } from './pages/languages/LanguagesPage';
import { CountriesPage } from './pages/countries/CountriesPage';
import { TerritoriesPage } from './pages/territories/TerritoriesPage';
import { PicturesPage } from './pages/pictures/PicturesPage';
import { SeasonsPage } from './pages/seasons/SeasonsPage';
import { Dashboard } from './pages/Dashboard';
import DescriptionReportsPage from './pages/description-reports/DescriptionReportsPage';
import VideoFileReportsPage from './pages/video-file-reports/VideoFileReportsPage';

// Initialize API client
initApiClient({ 
  baseURL: 'http://localhost:8000',
  onAuthError: () => {
    localStorage.removeItem('access_token');
    window.location.reload();
  }
});

// Placeholder components for sections not yet extracted
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <h1 style={{ color: '#6b7280', marginBottom: '16px' }}>{title}</h1>
      <p style={{ color: '#9ca3af' }}>
        This section is still using the legacy monolithic component.
        <br />
        It will be refactored in the next phase.
      </p>
    </div>
  );
}

// Component to handle the routing and layout
function AppWithRouter() {
  const location = useLocation();
  
  // Determine active section based on current path
  const getActiveSectionFromPath = (pathname: string): string => {
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/persons')) return 'persons';
    if (pathname.startsWith('/category-lists')) return 'category-lists';
    if (pathname.startsWith('/media')) return 'media';
    if (pathname.startsWith('/videos')) return 'videos';
    if (pathname.startsWith('/video-reports')) return 'video-reports';
    if (pathname.startsWith('/users')) return 'users';
    if (pathname.startsWith('/programs')) return 'programs';
    if (pathname.startsWith('/seasons')) return 'seasons';
    if (pathname.startsWith('/languages')) return 'languages';
    if (pathname.startsWith('/countries')) return 'countries';
    if (pathname.startsWith('/territories')) return 'territories';
    if (pathname.startsWith('/pictures')) return 'pictures';
    if (pathname.startsWith('/content-lists')) return 'content-lists';
    if (pathname.startsWith('/screen-contents')) return 'screen-contents';
    return 'dashboard';
  };

  const activeSection = getActiveSectionFromPath(location.pathname);

  return (
    <SimpleAppLayout 
      activeSection={activeSection} 
      onSectionChange={() => {}} // Will be handled by navigation
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h1 style={{ 
          margin: 0, 
          color: '#1f2937',
          fontSize: '24px'
        }}>
          Kyool Media Backoffice
        </h1>
        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            window.location.reload();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>
      
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/persons" element={<PersonsManagementPage />} />
        <Route path="/category-lists" element={<CategoryListsPage />} />
        <Route path="/users" element={<UsersManagementPage />} />
        <Route path="/programs" element={<ProgramsManagementPage />} />
        <Route path="/seasons" element={<SeasonsPage />} />
        <Route path="/media" element={<MediaListPage />} />
        <Route path="/videos" element={<VideoFileListPage />} />
        <Route path="/video-reports" element={<VideoFileReportsPage />} />
        <Route path="/languages" element={<LanguagesPage />} />
        <Route path="/countries" element={<CountriesPage />} />
        <Route path="/territories" element={<TerritoriesPage />} />
        <Route path="/pictures" element={<PicturesPage />} />
        <Route path="/description-reports" element={<DescriptionReportsPage />} />
        <Route path="/content-lists" element={<ContentListsPage />} />
        <Route path="/screen-contents" element={<ScreenContentsPage />} />
      </Routes>
    </SimpleAppLayout>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      checkUserRole();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkUserRole = async () => {
    try {
      const currentUser = await usersApi.getCurrentUser();
      if (currentUser.is_admin) {
        setUserRole('admin');
        setIsAuthenticated(true);
      } else {
        setLoginError('Access denied. Administrator privileges required for backoffice access.');
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error('Failed to verify user role:', error);
      localStorage.removeItem('access_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await authApi.login(loginData);
      localStorage.setItem('access_token', response.access_token);
      await checkUserRole();
    } catch (error: any) {
      setLoginError(error.response?.data?.detail || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            marginBottom: '24px',
            color: '#1f2937',
            fontSize: '28px'
          }}>
            Kyool Backoffice
          </h1>
          
          {loginError && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: 'bold',
                color: '#374151'
              }}>
                Email
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="admin@kyool.com"
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: 'bold',
                color: '#374151'
              }}>
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          </form>
          
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px', 
            fontSize: '12px', 
            color: '#6c757d' 
          }}>
            <strong>Test credentials:</strong><br />
            Email: admin@kyool.com<br />
            Password: admin123
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <Router>
        <AppWithRouter />
      </Router>
    </>
  );
}

export default App;