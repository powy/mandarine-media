import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'share';
import kyoolLogo from '../assets/kyool_black.svg';

const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigationItems = [
    { label: 'A la une', path: '/content' },
    { label: 'Films', path: '/films' },
    { label: 'Dramas', path: '/dramas' },
    { label: 'Tv-Shows', path: '/tv-shows' },
    { label: 'Autre', path: '/autre' }
  ];

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleUserClick = () => {
    if (isAuthenticated) {
      setShowUserMenu(!showUserMenu);
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowUserMenu(false);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Don't show header on login screen
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <header className="bg-black border-b border-gray-800">
      {/* First line: Logo, Search, User */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <img src={kyoolLogo} alt="KYOOL" className="h-8" />
        </button>

        {/* Search and User */}
        <div className="flex items-center gap-4">
          {/* Search button - not functional yet */}
          <button 
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Rechercher"
          >
            <svg className="w-5 h-5 text-kyool-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* User menu */}
          <div className="relative">
            <button 
              onClick={handleUserClick}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              aria-label="Compte utilisateur"
            >
              <svg className="w-5 h-5 text-kyool-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && isAuthenticated && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-sm text-kyool-blue">{user?.email}</p>
                </div>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full px-4 py-2 text-left text-sm text-kyool-blue hover:bg-gray-800 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second line: Navigation */}
      <nav className="border-t border-gray-800">
        <div className="flex items-center px-4 py-2 gap-6 overflow-x-auto">
          {navigationItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`whitespace-nowrap hover:text-white transition-colors text-sm font-medium py-1 ${
                location.pathname === item.path ? 'text-white' : 'text-kyool-blue'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-kyool-blue mb-4">
              Confirmer la déconnexion
            </h3>
            <p className="text-gray-300 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Déconnexion
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-700 text-kyool-blue px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;