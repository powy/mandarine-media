import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useConfirmPasswordReset } from 'share';
import kyoolLogo from '../assets/kyool_black.svg';

const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate: confirmReset, isPending, isSuccess, error } = useConfirmPasswordReset();

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Redirect to login after successful reset
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);
    setErrorMessage('');

    // Client-side validation
    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('Les mots de passe ne correspondent pas');
      setShowError(true);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Le mot de passe doit contenir au moins 8 caractères');
      setShowError(true);
      return;
    }

    if (!token) {
      setErrorMessage('Token de réinitialisation manquant');
      setShowError(true);
      return;
    }

    confirmReset({
      token,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
  };

  if (!token) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={kyoolLogo} alt="KYOOL" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-kyool-blue">
            Nouveau mot de passe
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Choisissez un nouveau mot de passe pour votre compte
          </p>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <div className="bg-kyool-blue/20 border border-kyool-blue text-kyool-blue p-4 rounded-lg mb-6">
            <p className="font-medium mb-2">Mot de passe réinitialisé avec succès!</p>
            <p className="text-sm">Redirection vers la page de connexion...</p>
          </div>
        )}

        {/* Error Message */}
        {(showError || error) && (
          <div className="text-red-500 text-sm mb-4 text-center bg-red-500/10 border border-red-500 p-4 rounded-lg">
            {errorMessage || 'Le lien de réinitialisation est invalide ou a expiré'}
          </div>
        )}

        {/* Form */}
        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-kyool-blue mb-2"
              >
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-kyool-blue focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="text-gray-400 text-xs mt-1">
                Minimum 8 caractères
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="newPasswordConfirm"
                className="block text-sm font-medium text-kyool-blue mb-2"
              >
                Confirmez le nouveau mot de passe
              </label>
              <input
                type="password"
                id="newPasswordConfirm"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-kyool-blue focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-kyool-blue text-black py-3 rounded-lg font-medium hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Enregistrement...' : 'Définir le nouveau mot de passe'}
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-kyool-blue hover:text-kyool-blue/80 text-sm"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
