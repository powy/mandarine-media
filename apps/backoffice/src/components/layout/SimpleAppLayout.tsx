import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SimpleAppLayoutProps {
  activeSection: string;
  onSectionChange?: (section: string) => void;
  children: React.ReactNode;
}

export default function SimpleAppLayout({ activeSection, onSectionChange, children }: SimpleAppLayoutProps) {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    // Display & Organization
    { id: 'content-lists', label: 'Content Lists' },
    { id: 'screen-contents', label: 'Screen Contents' },
    { id: 'category-lists', label: 'Category Lists' },
    // Content Management
    { id: 'programs', label: 'Programs' },
    { id: 'seasons', label: 'Seasons' },
    { id: 'media', label: 'Media Descriptions' },
    { id: 'videos', label: 'Video Files' },
    { id: 'pictures', label: 'Pictures' },
    // Reports
    { id: 'description-reports', label: 'Description Reports' },
    // Details
    { id: 'languages', label: 'Languages' },
    { id: 'persons', label: 'Public Persons' },
    { id: 'countries', label: 'Countries' },
    { id: 'territories', label: 'Territories' },
    // User & Business
    { id: 'users', label: 'Users' },
    // Reports & Monitoring
    { id: 'video-file-reports', label: 'Video File Reports' },
  ];

  const handleNavigation = (itemId: string) => {
    // Use React Router navigation
    navigate(`/${itemId}`);
    // Also call the callback if provided (for backward compatibility)
    if (onSectionChange) {
      onSectionChange(itemId);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '20px',
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#3b82f6' 
          }}>
            Kyool Backoffice
          </h1>
          <p style={{ 
            margin: '4px 0 0 0', 
            fontSize: '14px', 
            color: '#9ca3af' 
          }}>
            Admin Panel
          </p>
        </div>

        <nav style={{ marginTop: '20px' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                margin: '4px 0',
                backgroundColor: activeSection === item.id ? '#3b82f6' : 'transparent',
                color: activeSection === item.id ? 'white' : '#d1d5db',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#d1d5db';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        padding: '24px',
        backgroundColor: 'white',
        margin: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
}