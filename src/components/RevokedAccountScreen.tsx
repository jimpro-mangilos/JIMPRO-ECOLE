import { useEffect } from 'react';
import { Hourglass, LogOut, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function RevokedAccountScreen() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-8 py-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4 ring-4 ring-white/20">
            <Hourglass className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Accès en attente</h1>
          <p className="text-blue-100 text-sm">Votre compte est en cours de validation</p>
        </div>

        <div className="px-8 py-8 space-y-6">
          <div className="text-center">
            <p className="text-gray-700 text-base leading-relaxed">
              Veuillez patienter qu'un rôle vous soit attribué par l'administrateur.
            </p>
            <p className="text-gray-500 text-sm mt-3">
              Vous recevrez automatiquement l'accès aux fonctionnalités dès que votre rôle sera défini.
            </p>
          </div>

          {profile && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{profile.email}</span>
              </div>
              {(profile.nom || profile.prenom) && (
                <div className="text-sm text-gray-500 pl-7">
                  {profile.prenom} {profile.nom}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Vérification automatique toutes les 30 secondes</span>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Besoin d'aide ? Contactez l'administrateur de votre établissement.
          </p>
        </div>
      </div>
    </div>
  );
}
