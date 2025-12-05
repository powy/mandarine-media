import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { useRegister } from 'share';
import kyoolLogo from '../assets/kyool_black.svg';

const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate: register, isPending, isSuccess, error } = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);
    setErrorMessage('');

    // Client-side validation
    if (email !== emailConfirm) {
      setErrorMessage('Les adresses email ne correspondent pas');
      setShowError(true);
      return;
    }

    if (!turnstileToken) {
      setErrorMessage('Veuillez valider le captcha');
      setShowError(true);
      return;
    }

    register(
      {
        email,
        email_confirm: emailConfirm,
        turnstileToken,
      },
      {
        onError: (err: any) => {
          // Parse backend error messages
          const detail = err?.response?.data?.detail || 'Une erreur est survenue. Veuillez réessayer.';
          setErrorMessage(detail);
          setShowError(true);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={kyoolLogo} alt="KYOOL" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-kyool-blue">
            Créer un compte
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Entrez votre adresse email pour créer votre compte
          </p>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <div className="bg-kyool-blue/20 border border-kyool-blue text-kyool-blue p-4 rounded-lg mb-6">
            Compte créé avec succès! Un email vous a été envoyé pour définir votre mot de passe.
          </div>
        )}

        {/* Error Message */}
        {(showError || error) && (
          <div className="text-red-500 text-sm mb-4 text-center">
            {errorMessage || 'Une erreur est survenue. Veuillez réessayer.'}
          </div>
        )}

        {/* Form */}
        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-kyool-blue mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-kyool-blue focus:border-transparent"
                placeholder="votre.email@exemple.com"
              />
            </div>

            {/* Email Confirmation Field */}
            <div>
              <label
                htmlFor="emailConfirm"
                className="block text-sm font-medium text-kyool-blue mb-2"
              >
                Confirmez votre email
              </label>
              <input
                type="email"
                id="emailConfirm"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-kyool-blue focus:border-transparent"
                placeholder="votre.email@exemple.com"
              />
            </div>

            {/* Captcha */}
            <div>
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                theme="dark"
                size="compact"
                appearance="interaction-only"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || !turnstileToken}
              className="w-full bg-kyool-blue text-black py-3 rounded-lg font-medium hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Création en cours...' : 'Créer le compte'}
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <span className="text-gray-400 text-sm">Vous avez déjà un compte? </span>
          <Link
            to="/login"
            className="text-kyool-blue hover:text-kyool-blue/80 text-sm font-medium"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
