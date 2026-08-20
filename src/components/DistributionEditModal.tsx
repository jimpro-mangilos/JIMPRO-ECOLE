import { useEffect, useState } from 'react';
import { X, Package, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TAILLES_UNIFORME } from '../lib/constants';

interface DistributionEditModalProps {
  distribution: {
    id: string;
    nom_eleve: string;
    postnom: string;
    prenom: string;
    matricule: string;
    type_uniforme_libelle: string;
    taille: string | null;
    quantite: number;
    annee_scolaire: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function DistributionEditModal({ distribution, onClose, onSuccess }: DistributionEditModalProps) {
  const { currentSchoolId } = useAuth();
  const [tailles, setTailles] = useState<string[]>(TAILLES_UNIFORME);
  const [taille, setTaille] = useState(distribution.taille || 'M');
  const [quantite, setQuantite] = useState(String(distribution.quantite));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tailles_uniforme')
        .select('libelle')
        .eq('ecole_id', currentSchoolId)
        .eq('is_active', true)
        .order('ordre');
      if (data && data.length) setTailles(data.map((t: any) => t.libelle));
      else setTailles(TAILLES_UNIFORME);
    })();
  }, [currentSchoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantite, 10);
    if (!qty || qty < 1) {
      alert('Veuillez saisir une quantité valide (au moins 1).');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('modifier_distribution_uniforme', {
        p_id: distribution.id,
        p_taille: taille,
        p_quantite: qty,
      });
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erreur lors de la modification : ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Modifier la distribution</h2>
              <p className="text-sm text-gray-500">
                {distribution.nom_eleve} {distribution.postnom} {distribution.prenom} — {distribution.matricule}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Article concerné (lecture seule) */}
          <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-lg">
            <Package className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-teal-900">{distribution.type_uniforme_libelle}</div>
              <div className="text-xs text-teal-700">Année scolaire : {distribution.annee_scolaire || '—'}</div>
            </div>
          </div>

          {/* Taille */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Taille *
            </label>
            <select
              value={taille}
              onChange={(e) => setTaille(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tailles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Quantité *
            </label>
            <input
              type="number"
              min="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Note explicative */}
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            En changeant la taille, l'article de l'ancienne taille est restitué au stock
            et la nouvelle taille est déduite (échange / remplacement).
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
