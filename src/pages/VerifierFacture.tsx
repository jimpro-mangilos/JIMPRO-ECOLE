import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, ShieldCheck, ShieldX, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FactureInfo {
  trouve: boolean;
  numero_recu?: string;
  eleve?: string;
  matricule?: string;
  postnom?: string;
  prenom?: string;
  classe?: string;
  montant_paye?: number;
  type_paiement?: string;
  statut?: string;
  est_encaisse?: boolean;
  date_encaissement?: string | null;
  annee_scolaire?: string | null;
  nom_comptable?: string;
  ecole_nom?: string;
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMontant(n?: number): string {
  if (n == null) return '—';
  return `${Number(n).toLocaleString('fr-FR')} FC`;
}

export default function VerifierFacture() {
  const { numero } = useParams<{ numero: string }>();
  const [state, setState] = useState<'loading' | 'found' | 'notfound' | 'error'>('loading');
  const [facture, setFacture] = useState<FactureInfo | null>(null);

  useEffect(() => {
    if (!numero) { setState('error'); return; }
    const numeroClean = numero.trim().toUpperCase();
    let cancelled = false;
    (async () => {
      try {
        // 1) RPC public (fonction SECURITY DEFINER) si dispo
        let data: FactureInfo | null = null;
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc('verifier_facture', { p_numero: numeroClean });
        if (!rpcError && rpcData) {
          data = rpcData as FactureInfo;
        } else {
          // 2) Fallback : requête directe (fonctionne si l'utilisateur est connecté)
          const { data: direct } = await (supabase as any)
            .from('paiements')
            .select('numero_recu, nom_eleve, matricule, postnom, prenom, classe, montant_paye, type_paiement, statut, est_encaisse, date_encaissement, annee_scolaire, nom_comptable')
            .ilike('numero_recu', numeroClean)
            .maybeSingle();
          if (direct) {
            const { data: ecole } = await (supabase as any).from('ecoles').select('nom').eq('id', direct.ecole_id).maybeSingle();
            data = { trouve: true, ...direct, ecole_nom: ecole?.nom };
          }
        }
        if (cancelled) return;
        if (data?.trouve) { setFacture(data); setState('found'); }
        else if (data && !data.trouve) setState('notfound');
        else setState('notfound');
      } catch (e: any) {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [numero]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700"><Search className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vérification d'un reçu</h1>
            <p className="text-sm text-gray-500">Reçu n° {numero}</p>
          </div>
        </div>

        {state === 'loading' && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Vérification en cours...
          </div>
        )}

        {state === 'found' && facture && (
          <div>
            <div className={`flex items-center gap-2 p-3 rounded-xl mb-5 ${facture.statut === 'annule' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {facture.statut === 'annule' ? <ShieldX className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              <span className="font-bold">
                {facture.statut === 'annule' ? 'Reçu ANNULÉ' : 'Reçu VALIDE — encaissé'}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="École" value={facture.ecole_nom || '—'} />
              <Row label="Élève" value={`${facture.eleve || ''} ${facture.postnom || ''} ${facture.prenom || ''}`.trim() || '—'} />
              <Row label="Matricule" value={facture.matricule || '—'} />
              <Row label="Classe" value={facture.classe || '—'} />
              <Row label="Type de paiement" value={facture.type_paiement || '—'} />
              <Row label="Montant" value={formatMontant(facture.montant_paye)} />
              <Row label="Date d'encaissement" value={formatDate(facture.date_encaissement)} />
              <Row label="Année scolaire" value={facture.annee_scolaire || '—'} />
              <Row label="Encaissé par" value={facture.nom_comptable || '—'} />
            </dl>
          </div>
        )}

        {state === 'notfound' && (
          <div className="text-center py-8">
            <ShieldX className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Reçu introuvable</h2>
            <p className="text-gray-500 text-sm">Aucun reçu ne correspond au numéro « {numero} ». Vérifiez le numéro imprimé sur la facture.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-8">
            <ShieldX className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Erreur de vérification</h2>
            <p className="text-gray-500 text-sm">Impossible de vérifier ce reçu pour le moment. Réessayez plus tard.</p>
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center mt-6">JIMPRO — Système de Gestion Scolaire</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="font-semibold text-gray-800 text-right break-all">{value}</dd>
    </div>
  );
}