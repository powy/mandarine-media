import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from 'share';

const PrivateRoutes = () => {
  const { isAuthenticated, initialCheckComplete } = useAuth();
  if (!initialCheckComplete) {
    return null;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoutes;
