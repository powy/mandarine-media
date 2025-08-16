import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ErrorScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-kyool-blue mb-4">
          Page non trouvée
        </h2>
        <p className="text-gray-300 mb-8">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        
        <div className="space-y-4">
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