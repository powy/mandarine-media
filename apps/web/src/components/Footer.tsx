import { useLocation, Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();

  // Don't show footer on login screen
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <footer className="bg-black border-t border-gray-800 py-8">
      <div className="max-w-[1920px] m-auto px-4">
        <div className="flex flex-col items-center gap-4">

          {/* Row 1: Mentions légales - Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <Link to="/legal/cgv" className="text-kyool-blue hover:text-white transition-colors">
              Conditions Générales de Vente
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/privacy" className="text-kyool-blue hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/cookies" className="text-kyool-blue hover:text-white transition-colors">
              Politique des cookies
            </Link>
          </div>

          {/* Row 2: Copyright, Contact, Mentions légales */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-gray-400">© 2025 KYOOL</span>
            <span className="text-gray-600">|</span>
            <Link to="/contact" className="text-kyool-blue hover:text-white transition-colors">
              contact
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/mentions" className="text-kyool-blue hover:text-white transition-colors">
              Mentions légales
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;