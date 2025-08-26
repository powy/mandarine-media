import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Always redirect to the content page (À la une)
    navigate('/content');
  }, [navigate]);

  // This will only render briefly before the redirect
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-kyool-blue">Redirection...</div>
    </div>
  );
};

export default WelcomeScreen;