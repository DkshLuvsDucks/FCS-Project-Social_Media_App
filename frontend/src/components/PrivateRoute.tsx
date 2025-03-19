import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  requireAdmin?: boolean; // Optional prop to check for admin role
  children?: React.ReactNode; // Add children prop
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requireAdmin, children }) => {
  const { user } = useAuth();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if admin access is required and user is not an admin
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" />;
  }

  // Render the child routes or the children prop
  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute; 