/**
 * Autorisation de SUPPRESSION : chaque action « supprimer » doit être validée par
 * un mot de passe (ré-authentification). Modal global + file d'attente module,
 * utilisable depuis n'importe quel fichier (pages ET hooks) via suppressionAuth().
 */
import { useEffect, useState } from 'react';
import { Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Pending {
  message: string;
  resolve: (ok: boolean) => void;
}
let _pending: Pending | null = null;
let _mounted = false;
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach(l => l()); }

/** Demande l'autorisation (modal + mot de passe). Repli : confirm() natif si pas monté. */
export function suppressionAuth(message: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!_mounted) return Promise.resolve(window.confirm(message));
  return new Promise<boolean>((resolve) => {
    _pending = { message, resolve };
    notify();
  });
}

function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(x => x + 1);
    _listeners.add(l);
    return () => { _listeners.delete(l); };
  }, []);
  return _pending;
}

export function SuppressionAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const pending = useStore();
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { _mounted = true; return () => { _mounted = false; }; }, []);

  const close = (ok: boolean) => {
    if (_pending) { _pending.resolve(ok); _pending = null; }
    setPwd(''); setError(''); setBusy(false);
    notify();
  };

  const autoriser = async () => {
    const email = user?.email || userProfile?.email || '';
    if (!email || !pwd) { setError('Saisissez votre mot de passe.'); return; }
    setBusy(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (err) { setError('Mot de passe incorrect.'); setBusy(false); return; }
      close(true);
    } catch {
      setError('Erreur de vérification.');
      setBusy(false);
    }
  };

  return (
    <>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border-b border-red-100">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-700">Autorisation requise</h3>
                <p className="text-xs text-red-500">Action de suppression — cette opération est irréversible.</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 mb-4">{pending.message}</p>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe pour autoriser</label>
              <input
                type="password"
                autoFocus
                value={pwd}
                onChange={e => { setPwd(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') autoriser(); }}
                placeholder="Votre mot de passe"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400"
              />
              {error && <p className="mt-2 text-xs text-red-600 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" />{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => close(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200" disabled={busy}>
                  Annuler
                </button>
                <button onClick={autoriser} disabled={busy || !pwd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Autoriser la suppression
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
