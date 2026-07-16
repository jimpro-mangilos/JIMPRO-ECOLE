import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RevokedAccountScreen from './RevokedAccountScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAdminOrCoord?: boolean;
  requirePermission?: string;
}

const UNIFORME_ALLOWED_PATHS = ['/eleves', '/fournitures-eleves', '/stock-uniformes', '/profile'];

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireAdminOrCoord = false,
  requirePermission
}: ProtectedRouteProps) {
  const { user, profile, loading, isItManager, isGestionnaireUniforme, isRevoque } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur Code 0x000000477833</h2>
          <p className="text-gray-600">
            oups! Votre licence a éxpiré. Veuillez contacter l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  if (isRevoque()) {
    return <RevokedAccountScreen />;
  }

  if (isGestionnaireUniforme() && !UNIFORME_ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/eleves" replace />;
  }

  if (requireAdmin && profile.role?.nom !== 'admin' && !isItManager()) {
    return <Navigate to="/" replace />;
  }

  if (requireAdminOrCoord && profile.role?.nom !== 'admin' && profile.role?.nom !== 'coordonnateur' && !isItManager()) {
    return <Navigate to="/" replace />;
  }

  if (requirePermission && !isItManager() && !profile.role?.permissions?.all && !profile.role?.permissions?.[requirePermission]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
