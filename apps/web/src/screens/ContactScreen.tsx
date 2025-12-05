import { FC, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useSendContact, useAuth } from 'share';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactScreen: FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const { mutate: sendContact, isPending, error, isSuccess } = useSendContact();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: TEMPORARILY DISABLED FOR TESTING - RE-ENABLE FOR PRODUCTION
    // if (!turnstileToken) {
    //   return;
    // }

    sendContact({
      ...formData,
      turnstileToken: turnstileToken || 'test-token', // Fallback for testing without CAPTCHA
      user_id: user?.id
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1920px] m-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-kyool-blue mb-8">
            Contactez-nous
          </h1>

          {isSuccess && (
            <div className="bg-kyool-green/20 border border-kyool-green text-kyool-green p-4 rounded-lg mb-6">
              Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
              Erreur lors de l'envoi. Veuillez réessayer.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-kyool-blue mb-2">
                Nom
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-kyool-blue"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-kyool-blue mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-kyool-blue"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-kyool-blue mb-2">
                Sujet
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-kyool-blue"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-kyool-blue mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-kyool-blue resize-none"
              />
            </div>

            <div>
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                theme="dark"
                size="compact"
                appearance="interaction-only"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-kyool-blue text-black py-3 rounded-lg font-medium hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactScreen;
