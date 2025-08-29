import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ErrorState {
  originalError?: string;
  videoId?: string;
  timestamp?: string;
}

const ErrorScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const errorState = location.state as ErrorState | null;

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTryAgain = () => {
    if (errorState?.videoId) {
      navigate(`/video/${errorState.videoId}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  // Log error details for debugging
  React.useEffect(() => {
    if (errorState) {
      console.log('🔍 ErrorScreen: Received error state:', errorState);
    }
  }, [errorState]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-6xl font-bold text-red-500 mb-4">Erreur</h1>
        <h2 className="text-2xl font-semibold text-kyool-blue mb-4">
          {errorState?.videoId ? 'Vidéo non trouvée' : 'Page non trouvée'}
        </h2>
        <p className="text-gray-300 mb-8">
          {errorState?.videoId 
            ? `Impossible de charger la vidéo ${errorState.videoId}. Elle pourrait ne pas exister ou ne pas être disponible.`
            : 'Désolé, la page que vous recherchez n\'existe pas ou a été déplacée.'
          }
        </p>
        
        {/* Debug information in development */}
        {process.env.NODE_ENV === 'development' && errorState && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg text-left text-xs">
            <h3 className="text-red-400 font-semibold mb-2">Debug Info (dev only):</h3>
            <div className="text-gray-300 space-y-1">
              {errorState.originalError && (
                <div><span className="text-gray-500">Error:</span> {errorState.originalError}</div>
              )}
              {errorState.videoId && (
                <div><span className="text-gray-500">Video ID:</span> {errorState.videoId}</div>
              )}
              {errorState.timestamp && (
                <div><span className="text-gray-500">Time:</span> {errorState.timestamp}</div>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {errorState?.videoId && (
            <button
              onClick={handleTryAgain}
              className="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
            >
              Réessayer
            </button>
          )}
          
          <button
            onClick={handleGoHome}
            className="w-full bg-kyool-blue text-black px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition-colors"
          >
            Retour à l'accueil
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;