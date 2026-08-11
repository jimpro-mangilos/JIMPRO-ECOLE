import { useEffect, useState } from 'react';
import { X, User, MapPin, Phone, Calendar, Printer, Plus, DollarSign, Loader2, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { calculateAge, formatCurrency, formatDate } from '../utils/calculations';
import { generateElevePaymentHistoryPDF } from '../utils/pdfGenerator';
import UniformeFormModal from './UniformeFormModal';
import { useAuth } from '../contexts/AuthContext';

type Eleve = Database['public']['Tables']['eleves']['Row'];

interface Paiement {
  id: string;
  numero_recu: string;
  matricule: string;
  nom_eleve: string;
  montant_paye: number;
  montant_en_lettre: string;
  mode_paiement: string;
  date_paiement: string;
  type_paiement: string;
  description: string | null;
  motif_libelle: string;
  annee_scolaire: string | null;
}

interface Uniforme {
  id: string;
  type_uniforme_libelle: string;
  quantite: number;
  annee_scolaire: string | null;
  date_distribution: string;
  nom_comptable: string;
  notes: string | null;
}

interface EleveDetailsModalProps {
  eleve: Eleve;
  onClose: () => void;
  onPaymentAdded: () => void;
  onOpenPaymentForm?: () => void;
}

export default function EleveDetailsModal({ eleve, onClose, onPaymentAdded, onOpenPaymentForm }: EleveDetailsModalProps) {
  const { canCreatePaiement, currentSchoolId } = useAuth();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [uniformes, setUniformes] = useState<Uniforme[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUniformes, setLoadingUniformes] = useState(true);
  const [showUniformeForm, setShowUniformeForm] = useState(false);

  useEffect(() => {
    loadPaiements();
    loadUniformes();
  }, [eleve.id]);

  const loadPaiements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('ecole_id', currentSchoolId)
        .eq('eleve_id', eleve.id)
        .order('date_paiement', { ascending: false });

      if (error) throw error;
      setPaiements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUniformes = async () => {
    try {
      setLoadingUniformes(true);
      const { data, error } = await supabase
        .from('gestion_uniformes')
        .select('id, type_uniforme_libelle, quantite, annee_scolaire, date_distribution, nom_comptable, notes')
        .eq('ecole_id', currentSchoolId)
        .eq('eleve_id', eleve.id)
        .order('date_distribution', { ascending: false });

      if (error) throw error;
      setUniformes(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des uniformes:', error);
    } finally {
      setLoadingUniformes(false);
    }
  };

  const handleUniformeSuccess = () => {
    loadUniformes();
    loadPaiements();
    onPaymentAdded();
  };

  const totalPaye = paiements.reduce((sum, p) => sum + Number(p.montant_paye), 0);
  const totalArticles = uniformes.reduce((sum, u) => sum + u.quantite, 0);

  const handlePrintHistory = () => {
    generateElevePaymentHistoryPDF(eleve as any, paiements as any);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Détails de l'Élève</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Student info */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {(eleve as any).photo_url
                  ? <img src={(eleve as any).photo_url} alt="Photo" className="w-full h-full object-cover" />
                  : <>{eleve.prenom.charAt(0)}{eleve.nom.charAt(0)}</>
                }
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {eleve.nom} {eleve.postnom} {eleve.prenom}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Matricule:</span>
                    <span>{eleve.matricule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      eleve.sexe === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{formatDate(eleve.date_naissance)} ({calculateAge(eleve.date_naissance)} ans)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{eleve.lieu_naissance}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-medium">Section:</span>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-600 font-medium">
                      {eleve.section}
                    </span>
                  </div>
                  {eleve.option && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="font-medium">Option:</span>
                      <span>{eleve.option}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Responsable:</span>
                    <span>{eleve.responsable}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>{eleve.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Domicile:</span>
                    <span>{eleve.domicile}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Résumé Financier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Payé</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaye)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Nombre de Paiements</p>
                <p className="text-xl font-bold text-blue-600">{paiements.length}</p>
              </div>
              <div className="bg-teal-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Fournitures distribuées</p>
                <p className="text-xl font-bold text-teal-600">{totalArticles}</p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900">Historique des Paiements</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintHistory}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={paiements.length === 0}
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
                {canCreatePaiement() && (
                  <button
                    onClick={onOpenPaymentForm}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un Paiement
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Chargement des paiements...
              </div>
            ) : paiements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucun paiement enregistré pour cet élève</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Reçu</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Motif</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Montant</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Année</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paiements.map((paiement) => (
                      <tr key={paiement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{paiement.numero_recu}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(paiement.date_paiement)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{paiement.type_paiement}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{paiement.motif_libelle || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">{formatCurrency(Number(paiement.montant_paye))}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{paiement.mode_paiement}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{paiement.annee_scolaire || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Uniforme History */}
          <div className="bg-white border-2 border-teal-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Fournitures Élèves — Historique</h3>
              </div>
              <button
                onClick={() => setShowUniformeForm(true)}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Distribuer une fourniture
              </button>
            </div>

            {loadingUniformes ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-500" />
                Chargement des uniformes...
              </div>
            ) : uniformes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-teal-400" />
                <p>Aucune fourniture distribuée à cet élève</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-teal-50 border-b border-teal-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-700 uppercase">Article</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-700 uppercase">Qté</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-700 uppercase">Année</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-700 uppercase">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-700 uppercase">Comptable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uniformes.map((uniforme) => (
                      <tr key={uniforme.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(uniforme.date_distribution)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-800 text-sm font-medium rounded-full">
                            <Package className="w-3.5 h-3.5" />
                            {uniforme.type_uniforme_libelle}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{uniforme.quantite}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{uniforme.annee_scolaire || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 italic">{uniforme.notes || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{uniforme.nom_comptable || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>

      {showUniformeForm && (
        <UniformeFormModal
          isOpen={showUniformeForm}
          onClose={() => setShowUniformeForm(false)}
          onSuccess={handleUniformeSuccess}
          eleve={eleve}
        />
      )}
    </div>
  );
}
