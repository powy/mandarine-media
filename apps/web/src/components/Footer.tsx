import { useLocation } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();

  // Don't show footer on login screen
  if (location.pathname === '/login') {
    return null;
  }

  const handleBugReport = () => {
    const subject = encodeURIComponent('bug report web');
    const mailtoLink = `mailto:thierry@kftv.fr?subject=${subject}`;
    window.location.href = mailtoLink;
  };

  return (
    <footer className="bg-black border-t border-gray-800 py-3">
      <div className="px-4">
        <button
          onClick={handleBugReport}
          className="text-xs text-kyool-blue hover:text-white transition-colors underline"
        >
          bug report
        </button>
      </div>
    </footer>
  );
};

export default Footer;