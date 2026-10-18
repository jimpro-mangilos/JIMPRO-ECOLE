import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getDeviceId, getDeviceName, getDeviceUserAgent } from '../lib/device';
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

  // ── Gestion des appareils de confiance ─────────────────────────────────────
  const [deviceStatus, setDeviceStatus] = useState<string>('checking');

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('register_user_device', {
          p_device_id: getDeviceId(),
          p_device_name: getDeviceName(),
          p_user_agent: getDeviceUserAgent(),
        });
        if (cancelled) return;
        // Fail-open : si la table/fonction n'existe pas encore (migration non
        // appliquée) ou erreur réseau, on ne bloque pas l'application.
        setDeviceStatus(error || !data ? 'approved' : (data as string));
      } catch {
        if (!cancelled) setDeviceStatus('approved');
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile]);

  if (loading || deviceStatus === 'checking') {
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
          <h2 className="text-xl font-bold text-red-600 mb-3">Erreur Code 0x000000477833</h2>
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

  if (deviceStatus === 'pending') {
    return <DeviceGateScreen status="pending" />;
  }

  if (deviceStatus === 'blocked') {
    return <DeviceGateScreen status="blocked" />;
  }

  return <>{children}</>;
}

function DeviceGateScreen({ status }: { status: 'pending' | 'blocked' }) {
  const { signOut } = useAuth();
  const pending = status === 'pending';
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-md max-w-md w-full p-8 text-center">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${pending ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
          <span className="text-2xl">{pending ? '⏳' : '🚫'}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mt-4">
          {pending ? 'Appareil en attente d’approbation' : 'Appareil bloqué'}
        </h2>
        <p className="text-gray-600 mt-2 text-sm">
          {pending
            ? 'Ce nouvel appareil doit être approuvé par l’IT Manager avant de pouvoir accéder à votre compte.'
            : 'Cet appareil a été bloqué. Contactez l’IT Manager pour obtenir l’accès.'}
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Réessayer
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
