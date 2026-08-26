import {
  LayoutDashboard,
  Users,
  Wallet,
  Package,
  Briefcase,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  Archive,
  MessageCircle,
  BookOpen,
  UserCog,
  UserCheck,
} from 'lucide-react';

export const MENU_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
  'portail-professeur': BookOpen,
  'gestion-cours': BookOpen,
  'gestion-devoirs': FileText,
  'personnel': UserCog,
  'pointage': UserCheck,
  'recouvrement': UserCheck,
};

export const MENU_PATH_MAP: Record<string, string> = {
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
  'portail-professeur': '/portail-professeur',
  'gestion-cours': '/gestion-cours',
  'gestion-devoirs': '/gestion-devoirs',
  'personnel': '/personnel',
  'pointage': '/pointage',
  'recouvrement': '/recouvrement',
};

export const QUICK_ACCESS_COLORS: Record<string, { bg: string; hover: string; icon: string; border: string }> = {
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

export const DEFAULT_QUICK_ACCESS_COLOR = { bg: 'bg-gray-50', hover: 'hover:bg-gray-100 hover:border-gray-300', icon: 'text-gray-600', border: 'border-gray-100' };

export const TAILLES_UNIFORME = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];