import { useAuth } from 'share';

const WelcomeScreen: React.FC = () => {
  const { isAuthenticated, user, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-kyool-blue">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        {isAuthenticated ? (
          <div>
            <h1 className="text-3xl font-bold text-kyool-blue mb-4">
              Bienvenue, vous êtes connecté !
            </h1>
            {user && (
              <p className="text-lg text-gray-300">
                Bonjour {user.email}
              </p>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-kyool-blue mb-4">
              Vous n'êtes pas connecté
            </h1>
            <p className="text-lg text-gray-300">
              Veuillez vous connecter pour accéder à la plateforme.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;