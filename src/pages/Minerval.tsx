import { useEffect, useState } from 'react';
import { Plus, Search, DollarSign, CheckCircle, AlertCircle, Loader2, Printer, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { montantEnLettres } from '../utils/numberToWords';
import { sendNotifications } from '../services/notificationService';
import { printReceipt } from '../utils/receiptGenerator';

interface Paiement {
  id: string;
  numero_recu: string;
  eleve_id: string;
  nom_eleve: string;
  matricule: string;
  postnom: string;
  prenom: string;
  classe: string;
  sexe: string;
  section: string;
  option: string | null;
  telephone: string;
  domicile: string;
  lieu_naissance: string | null;
  date_naissance: string | null;
  responsable: string | null;
  photo_url: string | null;
  type_paiement: string;
  description: string | null;
  montant_paye: number;
  montant_en_lettre: string;
  mode_paiement: string;
  date_paiement: string;
  comptable_id: string;
  nom_comptable: string;
  est_encaisse: boolean;
  date_encaissement: string | null;
  encaisseur_id?: string;
  nom_encaisseur?: string | null;
  annee_scolaire: string | null;
  motif_id: string | null;
  motif_libelle: string;
  created_at: string;
}

interface EleveInfo {
  id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  section: string;
  option: string | null;
  classe: string | null;
  responsable: string;
  telephone: string;
  domicile: string;
  lieu_naissance: string;
  date_naissance: string;
  photo_url?: string | null;
}

interface MotifPaiement {
  id: string;
  libelle: string;
  description: string | null;
  is_active: boolean;
}

export default function Minerval() {
  const { user, profile, canEncaisser, isItManager, isPromoteur, isCoordonnateur, isSecretary } = useAuth();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [motifs, setMotifs] = useState<MotifPaiement[]>([]);
  const [minervalTypeId, setMinervalTypeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchingEleve, setSearchingEleve] = useState(false);
  const [eleveFound, setEleveFound] = useState<EleveInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    matricule: '',
    montant_paye: '',
    mode_paiement: 'especes',
    encaisser: false,
    motif_id: '',
    annee_scolaire: '',
  });

  const canManagePayments = profile?.role?.nom === 'admin' ||
                           profile?.role?.nom === 'it_manager' ||
                           profile?.role?.nom === 'comptable' ||
                           profile?.role?.nom === 'secretaire';

  useEffect(() => {
    loadMinervalType();
    loadMotifs();
  }, []);

  useEffect(() => {
    if (minervalTypeId) {
      loadPaiements();
    }
  }, [minervalTypeId]);

  const loadMinervalType = async () => {
    try {
      const { data, error } = await supabase
        .from('types_paiement')
        .select('id')
        .eq('libelle', 'Minerval')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setMinervalTypeId(data?.id || null);
    } catch (error) {
      console.error('Erreur lors du chargement du type Minerval:', error);
    }
  };

  const loadPaiements = async () => {
    if (!minervalTypeId) return;

    try {
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('type_paiement', minervalTypeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaiements(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMotifs = async () => {
    try {
      const { data, error } = await supabase
        .from('motifs_paiement')
        .select('*')
        .eq('is_active', true)
        .order('libelle');

      if (error) throw error;
      setMotifs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des motifs:', error);
    }
  };

  const searchEleve = async (matricule: string) => {
    if (!matricule.trim()) {
      setEleveFound(null);
      return;
    }

    setSearchingEleve(true);
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('*')
        .eq('matricule', matricule.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEleveFound(data);
      } else {
        setEleveFound(null);
        setMessage({ type: 'error', text: 'Aucun élève trouvé avec ce matricule' });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la recherche de l\'élève' });
    } finally {
      setSearchingEleve(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManagePayments) {
      setMessage({ type: 'error', text: 'Vous n\'avez pas les permissions nécessaires' });
      return;
    }

    if (!eleveFound) {
      setMessage({ type: 'error', text: 'Veuillez d\'abord rechercher un élève' });
      return;
    }

    const montant = parseFloat(formData.montant_paye);
    if (isNaN(montant) || montant <= 0) {
      setMessage({ type: 'error', text: 'Veuillez entrer un montant valide' });
      return;
    }

    if (montant > 10000000) {
      setMessage({ type: 'error', text: 'Le montant ne peut pas dépasser 10,000,000 FC' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const montantEnLettre = montantEnLettres(montant);
      const nomEleve = `${eleveFound.nom} ${eleveFound.postnom} ${eleveFound.prenom}`;
      const classe = eleveFound.classe ||
                    (eleveFound.option ? `${eleveFound.section} - ${eleveFound.option}` : eleveFound.section);

      const motifSelectionne = motifs.find(m => m.id === formData.motif_id);
      const motifLibelle = motifSelectionne?.libelle || 'Minerval';

      const paiementData = {
        eleve_id: eleveFound.id,
        nom_eleve: eleveFound.nom,
        matricule: eleveFound.matricule,
        postnom: eleveFound.postnom,
        prenom: eleveFound.prenom,
        classe: classe,
        sexe: eleveFound.sexe,
        section: eleveFound.section,
        option: eleveFound.option || null,
        telephone: eleveFound.telephone,
        domicile: eleveFound.domicile,
        lieu_naissance: eleveFound.lieu_naissance || null,
        date_naissance: eleveFound.date_naissance || null,
        responsable: eleveFound.responsable || null,
        photo_url: eleveFound.photo_url || null,
        type_paiement: minervalTypeId!,
        description: 'Paiement frais scolaires (Minerval)',
        montant_paye: montant,
        montant_en_lettre: montantEnLettre,
        mode_paiement: formData.mode_paiement,
        date_paiement: new Date().toISOString().split('T')[0],
        comptable_id: user?.id,
        nom_comptable: `${profile?.nom || ''} ${profile?.prenom || ''}`.trim(),
        est_encaisse: formData.encaisser,
        date_encaissement: formData.encaisser ? new Date().toISOString() : null,
        encaisseur_id: formData.encaisser ? user?.id : null,
        nom_encaisseur: formData.encaisser ? `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() : null,
        motif_id: formData.motif_id || null,
        motif_libelle: motifLibelle,
        annee_scolaire: formData.annee_scolaire || null,
      };

      const { data, error } = await supabase
        .from('paiements')
        .insert([paiementData])
        .select()
        .single();

      if (error) throw error;

      if (formData.encaisser && data) {
        await sendNotifications({
          paiementId: data.id,
          nomEleve: nomEleve,
          montantPaye: montant,
          montantEnLettre: montantEnLettre,
          numeroRecu: data.numero_recu,
          telephone: eleveFound.telephone,
        });
      }

      await supabase.from('user_activity_logs').insert({
        user_id: user?.id,
        action: 'Paiement minerval créé',
        details: {
          paiement_id: data.id,
          numero_recu: data.numero_recu,
          eleve: nomEleve,
          montant: montant,
          encaisse: formData.encaisser,
        },
      });

      setMessage({
        type: 'success',
        text: `Paiement enregistré avec succès! Reçu N°: ${data.numero_recu}`
      });

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        loadPaiements();
      }, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement du paiement' });
    } finally {
      setSubmitting(false);
    }
  };

  const canEncaisserMontant = (montant: number): boolean => {
    if (montant === 0) {
      return isItManager() || isPromoteur() || isCoordonnateur() || isSecretary();
    }
    return canEncaisser();
  };

  const handleEncaisser = async (paiement: Paiement) => {
    if (!canManagePayments) {
      setMessage({ type: 'error', text: 'Vous n\'avez pas les permissions nécessaires' });
      return;
    }

    if (!canEncaisserMontant(paiement.montant_paye)) {
      if (paiement.montant_paye === 0) {
        setMessage({ type: 'error', text: 'Seuls le Promoteur, le Coordonnateur, le Secrétaire et l\'IT Manager peuvent encaisser les paiements à montant 0' });
      } else {
        setMessage({ type: 'error', text: 'Seuls les administrateurs, comptables, Promoteur et IT_MANAGER peuvent encaisser les paiements' });
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('paiements')
        .update({
          est_encaisse: true,
          date_encaissement: new Date().toISOString(),
          encaisseur_id: user?.id,
          nom_encaisseur: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        })
        .eq('id', paiement.id);

      if (error) throw error;

      const { data: eleveData } = await supabase
        .from('eleves')
        .select('telephone')
        .eq('id', paiement.eleve_id)
        .single();

      if (eleveData) {
        await sendNotifications({
          paiementId: paiement.id,
          nomEleve: paiement.nom_eleve,
          montantPaye: paiement.montant_paye,
          montantEnLettre: paiement.montant_en_lettre,
          numeroRecu: paiement.numero_recu,
          telephone: eleveData.telephone,
        });
      }

      await supabase.from('user_activity_logs').insert({
        user_id: user?.id,
        action: 'Paiement encaissé',
        details: {
          paiement_id: paiement.id,
          numero_recu: paiement.numero_recu,
          eleve: paiement.nom_eleve,
        },
      });

      setMessage({ type: 'success', text: 'Paiement encaissé avec succès!' });
      loadPaiements();
    } catch (error) {
      console.error('Erreur:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'encaissement' });
    }
  };

  const handlePrintReceipt = async (paiement: Paiement) => {
    try {
      await printReceipt({
        numero_recu: paiement.numero_recu,
        nom_eleve: paiement.nom_eleve,
        classe: paiement.classe,
        montant_paye: paiement.montant_paye,
        montant_en_lettre: paiement.montant_en_lettre,
        mode_paiement: paiement.mode_paiement,
        date_paiement: paiement.date_paiement,
        date_encaissement: paiement.date_encaissement || paiement.created_at,
        nom_comptable: paiement.nom_comptable,
        nom_encaisseur: paiement.nom_encaisseur,
        type_paiement: paiement.type_paiement,
      });

      setMessage({ type: 'success', text: 'Reçu généré avec succès!' });
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la génération du reçu' });
    }
  };

  const resetForm = () => {
    setFormData({
      matricule: '',
      montant_paye: '',
      mode_paiement: 'especes',
      encaisser: false,
      motif_id: '',
      annee_scolaire: '',
    });
    setEleveFound(null);
    setMessage(null);
  };

  const filteredPaiements = paiements.filter((p) =>
    p.nom_eleve.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero_recu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalEncaisse: paiements
      .filter(p => p.est_encaisse)
      .reduce((acc, p) => acc + p.montant_paye, 0),
    totalEnAttente: paiements
      .filter(p => !p.est_encaisse)
      .reduce((acc, p) => acc + p.montant_paye, 0),
    nombreEncaisses: paiements.filter(p => p.est_encaisse).length,
    nombreEnAttente: paiements.filter(p => !p.est_encaisse).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion du Minerval</h1>
          <p className="text-gray-600 mt-1">Suivi des paiements des frais scolaires</p>
        </div>
        {canManagePayments && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nouveau Paiement
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Montant Encaissé</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.totalEncaisse.toLocaleString()} FC
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.nombreEncaisses} paiements</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Attente</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {stats.totalEnAttente.toLocaleString()} FC
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.nombreEnAttente} paiements</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Collecté</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {(stats.totalEncaisse + stats.totalEnAttente).toLocaleString()} FC
              </p>
              <p className="text-xs text-gray-500 mt-1">{paiements.length} paiements</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux d'Encaissement</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {paiements.length > 0
                  ? Math.round((stats.nombreEncaisses / paiements.length) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.nombreEncaisses}/{paiements.length}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom d'élève ou numéro de reçu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">N° Reçu</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Élève</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Classe</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Montant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Comptable</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td></tr>
              ) : filteredPaiements.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">Aucun paiement trouvé</td></tr>
              ) : (
                filteredPaiements.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-blue-600">{p.numero_recu}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{p.nom_eleve}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.classe}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {p.montant_paye.toLocaleString()} FC
                      </div>
                      <div className="text-xs text-gray-500">{p.montant_en_lettre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {p.mode_paiement === 'especes' ? 'Espèces' :
                       p.mode_paiement === 'mobile_money' ? 'Mobile Money' :
                       p.mode_paiement === 'virement' ? 'Virement' : 'Chèque'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>
                        <div>{p.nom_comptable}</div>
                        {p.est_encaisse && p.nom_encaisseur && p.nom_encaisseur !== p.nom_comptable && (
                          <div className="text-xs text-green-600 mt-1">
                            Encaissé par: {p.nom_encaisseur}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.est_encaisse ? (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Encaissé
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {!p.est_encaisse && canManagePayments && canEncaisserMontant(p.montant_paye) && (
                          <button
                            onClick={() => handleEncaisser(p)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Encaisser"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {p.est_encaisse && (
                          <button
                            onClick={() => handlePrintReceipt(p)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Imprimer le reçu"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Enregistrer un Paiement Minerval</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Rechercher l'Élève
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Matricule de l'élève *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Entrer le matricule pour rechercher"
                      value={formData.matricule}
                      onChange={(e) => {
                        setFormData({ ...formData, matricule: e.target.value });
                        setEleveFound(null);
                      }}
                      onBlur={(e) => searchEleve(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    {searchingEleve && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    )}
                    {eleveFound && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  {eleveFound && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-900">
                        {eleveFound.nom} {eleveFound.postnom} {eleveFound.prenom}
                      </p>
                      <p className="text-sm text-green-700">
                        Classe: {eleveFound.classe ||
                               (eleveFound.option ? `${eleveFound.section} - ${eleveFound.option}` : eleveFound.section)}
                      </p>
                      <p className="text-sm text-green-700">
                        Responsable: {eleveFound.responsable} - {eleveFound.telephone}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Informations de Paiement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-green-900 mb-2">
                      Montant Payé (FC) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10000000"
                      step="0.01"
                      placeholder="Ex: 50000"
                      value={formData.montant_paye}
                      onChange={(e) => setFormData({ ...formData, montant_paye: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {formData.montant_paye && parseFloat(formData.montant_paye) > 0 && (
                      <p className="mt-2 text-sm text-green-700 italic">
                        En lettres: {montantEnLettres(parseFloat(formData.montant_paye))}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-green-900 mb-2">
                      Mode de Paiement *
                    </label>
                    <select
                      value={formData.mode_paiement}
                      onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="especes">Espèces</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="virement">Virement Bancaire</option>
                      <option value="cheque">Chèque</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-green-900 mb-2">
                      Motif de Paiement
                    </label>
                    <select
                      value={formData.motif_id}
                      onChange={(e) => setFormData({ ...formData, motif_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Sélectionner un motif (optionnel)</option>
                      {motifs.map((motif) => (
                        <option key={motif.id} value={motif.id}>
                          {motif.libelle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-green-900 mb-2">
                      Année Scolaire
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2023-2024"
                      value={formData.annee_scolaire}
                      onChange={(e) => setFormData({ ...formData, annee_scolaire: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-3">Comptable</h3>
                <div className="bg-white p-3 rounded-lg border border-yellow-300">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.nom} {profile?.prenom}
                  </p>
                  <p className="text-xs text-gray-600">
                    Rôle: {profile?.role?.nom}
                  </p>
                </div>

                {canEncaisser() && (
                  <div className="mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.encaisser}
                        onChange={(e) => setFormData({ ...formData, encaisser: e.target.checked })}
                        className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        Encaisser le paiement immédiatement et envoyer les notifications
                      </span>
                    </label>
                    <p className="text-xs text-gray-600 ml-8 mt-1">
                      Un SMS et un email seront envoyés au responsable si vous cochez cette case
                    </p>
                  </div>
                )}
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting || !eleveFound}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Enregistrer le Paiement
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
