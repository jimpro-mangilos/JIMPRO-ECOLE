import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  Package,
  LayoutDashboard,
  Wallet,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Archive,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMenuConfig } from '../lib/hooks/useMenuConfig';

interface Stats {
  totalEleves: number;
  totalRecettes: number;
  paiementsEnAttente: number;
  fournituresDistribuees: number;
}

const MENU_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'dashboard': LayoutDashboard,
  'eleves': Users,
  'paiements': DollarSign,
  'finances': Wallet,
  'fournitures-eleves': Package,
  'fournitures-bureau': Briefcase,
  'stock-uniformes': Archive,
  'rapports': FileText,
  'tableau-bord-comptable': BarChart3,
  'configuration': Settings,
  'admin': Shield,
  'chat': MessageCircle,
};

const MENU_PATH_MAP: Record<string, string> = {
  'dashboard': '/',
  'eleves': '/eleves',
  'paiements': '/paiements',
  'finances': '/finances',
  'fournitures-eleves': '/fournitures-eleves',
  'fournitures-bureau': '/fournitures-bureau',
  'stock-uniformes': '/stock-uniformes',
  'rapports': '/rapports',
  'tableau-bord-comptable': '/tableau-bord-comptable',
  'configuration': '/configuration',
  'admin': '/admin',
  'chat': '/chat',
};

const QUICK_ACCESS_COLORS: Record<string, { bg: string; hover: string; icon: string; border: string }> = {
  'eleves': { bg: 'bg-blue-50', hover: 'hover:bg-blue-100 hover:border-blue-300', icon: 'text-blue-600', border: 'border-blue-100' },
  'paiements': { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100 hover:border-emerald-300', icon: 'text-emerald-600', border: 'border-emerald-100' },
  'finances': { bg: 'bg-amber-50', hover: 'hover:bg-amber-100 hover:border-amber-300', icon: 'text-amber-600', border: 'border-amber-100' },
  'fournitures-eleves': { bg: 'bg-teal-50', hover: 'hover:bg-teal-100 hover:border-teal-300', icon: 'text-teal-600', border: 'border-teal-100' },
  'fournitures-bureau': { bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100 hover:border-cyan-300', icon: 'text-cyan-600', border: 'border-cyan-100' },
  'stock-uniformes': { bg: 'bg-slate-50', hover: 'hover:bg-slate-100 hover:border-slate-300', icon: 'text-slate-600', border: 'border-slate-100' },
  'rapports': { bg: 'bg-rose-50', hover: 'hover:bg-rose-100 hover:border-rose-300', icon: 'text-rose-600', border: 'border-rose-100' },
  'tableau-bord-comptable': { bg: 'bg-sky-50', hover: 'hover:bg-sky-100 hover:border-sky-300', icon: 'text-sky-600', border: 'border-sky-100' },
  'configuration': { bg: 'bg-gray-50', hover: 'hover:bg-gray-100 hover:border-gray-300', icon: 'text-gray-600', border: 'border-gray-100' },
  'admin': { bg: 'bg-red-50', hover: 'hover:bg-red-100 hover:border-red-300', icon: 'text-red-600', border: 'border-red-100' },
  'chat': { bg: 'bg-green-50', hover: 'hover:bg-green-100 hover:border-green-300', icon: 'text-green-600', border: 'border-green-100' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', hover: 'hover:bg-gray-100 hover:border-gray-300', icon: 'text-gray-600', border: 'border-gray-100' };

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, isAdmin, isItManager } = useAuth();
  const { menuItems: menuConfig, loading: menuLoading } = useMenuConfig(profile?.role_id);
  const [stats, setStats] = useState<Stats>({
    totalEleves: 0,
    totalRecettes: 0,
    paiementsEnAttente: 0,
    fournituresDistribuees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const canSeeRecettes = isAdmin() || isItManager();

  useEffect(() => {
    loadStats();
    loadRecentActivities();
  }, []);

  const loadStats = async () => {
    try {
      const [elevesResult, minervalResult, compteCourantResult, fournituresResult] = await Promise.all([
        supabase.from('eleves').select('*', { count: 'exact', head: true }),
        supabase.from('minerval').select('montant_total, montant_paye'),
        supabase.from('compte_courant').select('montant_chiffre, type_operation'),
        supabase.from('gestion_fournitures').select('eps, pull'),
      ]);

      const totalEleves = elevesResult.count || 0;

      const paiementsEnAttente = minervalResult.data?.reduce((acc, curr) => {
        const solde = (curr.montant_total || 0) - (curr.montant_paye || 0);
        return acc + (solde > 0 ? 1 : 0);
      }, 0) || 0;

      const totalRecettes = compteCourantResult.data?.reduce((acc, curr) => {
        if (curr.type_operation === 'recette') {
          return acc + (curr.montant_chiffre || 0);
        }
        return acc;
      }, 0) || 0;

      const fournituresDistribuees = fournituresResult.data?.reduce((acc, curr) => {
        return acc + (curr.eps || curr.pull ? 1 : 0);
      }, 0) || 0;

      setStats({
        totalEleves,
        totalRecettes,
        paiementsEnAttente,
        fournituresDistribuees,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*, profiles:user_id(nom, prenom)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentActivities(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Eleves',
      value: stats.totalEleves,
      icon: Users,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    ...(canSeeRecettes ? [{
      title: 'Recettes Totales',
      value: `${stats.totalRecettes.toLocaleString()} FC`,
      icon: DollarSign,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    }] : []),
    {
      title: 'Paiements en Attente',
      value: stats.paiementsEnAttente,
      icon: TrendingUp,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Fournitures Distribuees',
      value: stats.fournituresDistribuees,
      icon: Package,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
    },
  ];

  const quickAccessItems = menuConfig
    .filter((item) => {
      if (isItManager()) return true;
      return item.is_visible;
    })
    .filter((item) => item.menu_key !== 'dashboard')
    .map((item) => ({
      key: item.menu_key,
      path: MENU_PATH_MAP[item.menu_key] || '/',
      icon: MENU_ICON_MAP[item.menu_key] || LayoutDashboard,
      label: item.label,
      colors: QUICK_ACCESS_COLORS[item.menu_key] || DEFAULT_COLOR,
    }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre etablissement scolaire</p>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${canSeeRecettes ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Bienvenue sur JIMPRO</h2>
        <p className="text-blue-100 mb-4">
          Systeme de gestion scolaire moderne et complet pour votre etablissement
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/eleves')}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Voir les Eleves
          </button>
          <button
            onClick={() => navigate('/paiements')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors"
          >
            Voir les Paiements
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Activites Recentes</h3>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune activite recente</p>
            ) : (
              recentActivities.map((activity, index) => {
                const getColorClass = (action: string) => {
                  if (action.toLowerCase().includes('eleve') || action.toLowerCase().includes('inscri')) return 'bg-blue-500';
                  if (action.toLowerCase().includes('paiement') || action.toLowerCase().includes('encaiss')) return 'bg-green-500';
                  if (action.toLowerCase().includes('fourniture')) return 'bg-teal-500';
                  return 'bg-gray-400';
                };

                const timeAgo = new Date(activity.created_at).toLocaleString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={index} className="flex items-center gap-3 pb-3 border-b last:border-b-0">
                    <div className={`w-2 h-2 ${getColorClass(activity.action)} rounded-full flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                      <p className="text-xs text-gray-500">{timeAgo}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Access - role-based */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Acces Rapide</h3>
          {menuLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 ${item.colors.border} ${item.colors.bg} ${item.colors.hover} transition-all duration-200 group`}
                  >
                    <Icon className={`w-6 h-6 ${item.colors.icon} transition-transform duration-200 group-hover:scale-110`} />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
