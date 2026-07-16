import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Users, CheckCircle, Clock, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Comptable {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface StatistiquesComptable {
  comptable_id: string;
  nom_comptable: string;
  total_paiements: number;
  total_encaisse: number;
  total_non_encaisse: number;
  nombre_transactions: number;
  nombre_encaisses: number;
  nombre_non_encaisses: number;
  dernier_paiement: string | null;
}

interface Transaction {
  id: string;
  numero_recu: string;
  nom_eleve: string;
  classe: string;
  type_paiement: string;
  montant_paye: number;
  mode_paiement: string;
  date_paiement: string;
  est_encaisse: boolean;
  date_encaissement: string | null;
}

interface StatsMois {
  jour: number;
  mois_actuel: number;
  mois_precedent: number;
  difference: number;
  pourcentage: number;
}

interface TypePaiement {
  id: string;
  libelle: string;
}

export default function TableauBordComptable() {
  const { profile } = useAuth();
  const [comptables, setComptables] = useState<Comptable[]>([]);
  const [comptableSelectionne, setComptableSelectionne] = useState<string>('');
  const [statistiques, setStatistiques] = useState<StatistiquesComptable | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsNonEncaissees, setTransactionsNonEncaissees] = useState<Transaction[]>([]);
  const [statsMois, setStatsMois] = useState<StatsMois | null>(null);
  const [typesPaiement, setTypesPaiement] = useState<TypePaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetchComptables();
    fetchTypesPaiement();
  }, []);

  useEffect(() => {
    if (comptableSelectionne) {
      loadAllStats(comptableSelectionne);
    }
  }, [comptableSelectionne]);

  useEffect(() => {
    if (!comptableSelectionne) return;

    const channel = supabase
      .channel('tableau-bord-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, () => {
        loadAllStats(comptableSelectionne);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [comptableSelectionne]);

  const loadAllStats = async (comptableId: string) => {
    setLoadingStats(true);
    try {
      await Promise.all([
        fetchStatistiquesComptable(comptableId),
        fetchTransactions(comptableId),
        fetchStatsMensuel(comptableId),
      ]);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchComptables = async () => {
    try {
      setLoading(true);

      const { data: paiementsEncaisses, error: errorPaiements } = await supabase
        .from('paiements')
        .select('encaisseur_id, nom_encaisseur')
        .eq('est_encaisse', true)
        .neq('statut', 'annule')
        .not('encaisseur_id', 'is', null);

      if (errorPaiements) throw errorPaiements;

      const encaisseurIds = Array.from(
        new Set(
          (paiementsEncaisses || [])
            .map((p) => p.encaisseur_id)
            .filter((id): id is string => !!id)
        )
      );

      const nomsParId = new Map<string, string>();
      (paiementsEncaisses || []).forEach((p) => {
        if (p.encaisseur_id && p.nom_encaisseur && !nomsParId.has(p.encaisseur_id)) {
          nomsParId.set(p.encaisseur_id, p.nom_encaisseur);
        }
      });

      let encaisseursList: Comptable[] = [];

      if (encaisseurIds.length > 0) {
        const { data: profilsData, error: errorProfils } = await supabase
          .from('profiles')
          .select('id, nom, prenom, email')
          .in('id', encaisseurIds);

        if (errorProfils) throw errorProfils;

        const profilsMap = new Map((profilsData || []).map((p) => [p.id, p]));

        encaisseursList = encaisseurIds.map((id) => {
          const profil = profilsMap.get(id);
          if (profil) {
            return {
              id: profil.id,
              nom: profil.nom,
              prenom: profil.prenom,
              email: profil.email,
            };
          }
          const nomHistorique = nomsParId.get(id) || 'Compte supprimé';
          const [prenom, ...nomParts] = nomHistorique.split(' ');
          return {
            id,
            nom: nomParts.join(' ') || nomHistorique,
            prenom: prenom || '',
            email: 'Compte supprimé',
          };
        });
      }

      encaisseursList.sort((a, b) => {
        const nomA = `${a.nom} ${a.prenom}`.toLowerCase();
        const nomB = `${b.nom} ${b.prenom}`.toLowerCase();
        return nomA.localeCompare(nomB);
      });

      setComptables(encaisseursList);

      if (encaisseursList.length > 0) {
        setComptableSelectionne(encaisseursList[0].id);
      } else {
        setComptableSelectionne('');
        setStatistiques(null);
        setTransactions([]);
        setTransactionsNonEncaissees([]);
        setStatsMois(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistiquesComptable = async (comptableId: string) => {
    try {
      const { data: paiements, error } = await supabase
        .from('paiements')
        .select('montant_paye, est_encaisse, created_at, nom_encaisseur, statut')
        .eq('encaisseur_id', comptableId);

      if (error) throw error;

      const paiementsData = paiements || [];
      const paiementsActifs = paiementsData.filter(p => p.statut !== 'annule');
      const encaisses = paiementsActifs.filter(p => p.est_encaisse);
      const nonEncaisses = paiementsActifs.filter(p => !p.est_encaisse);

      const selectedComptable = comptables.find(c => c.id === comptableId);
      const nomComptable = selectedComptable
        ? `${selectedComptable.prenom} ${selectedComptable.nom}`
        : paiementsData[0]?.nom_encaisseur || '';

      const stats: StatistiquesComptable = {
        comptable_id: comptableId,
        nom_comptable: nomComptable,
        total_paiements: paiementsActifs.reduce((sum, p) => sum + p.montant_paye, 0),
        total_encaisse: encaisses.reduce((sum, p) => sum + p.montant_paye, 0),
        total_non_encaisse: nonEncaisses.reduce((sum, p) => sum + p.montant_paye, 0),
        nombre_transactions: paiementsActifs.length,
        nombre_encaisses: encaisses.length,
        nombre_non_encaisses: nonEncaisses.length,
        dernier_paiement: paiementsData.length > 0
          ? [...paiementsData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null,
      };

      setStatistiques(stats);
    } catch (error) {
      console.error('Erreur fetchStatistiquesComptable:', error);
    }
  };

  const fetchTransactions = async (comptableId: string) => {
    try {
      const { data: encaisses, error: errorEncaisses } = await supabase
        .from('paiements')
        .select('id, numero_recu, nom_eleve, classe, type_paiement, montant_paye, mode_paiement, date_paiement, est_encaisse, date_encaissement')
        .eq('encaisseur_id', comptableId)
        .eq('est_encaisse', true)
        .neq('statut', 'annule')
        .order('date_encaissement', { ascending: false });

      if (errorEncaisses) throw errorEncaisses;

      const { data: nonEncaisses, error: errorNonEncaisses } = await supabase
        .from('paiements')
        .select('id, numero_recu, nom_eleve, classe, type_paiement, montant_paye, mode_paiement, date_paiement, est_encaisse, date_encaissement')
        .eq('encaisseur_id', comptableId)
        .eq('est_encaisse', false)
        .neq('statut', 'annule')
        .order('created_at', { ascending: false });

      if (errorNonEncaisses) throw errorNonEncaisses;

      setTransactions(encaisses || []);
      setTransactionsNonEncaissees(nonEncaisses || []);
    } catch (error) {
      console.error('Erreur fetchTransactions:', error);
    }
  };

  const fetchStatsMensuel = async (comptableId: string) => {
    try {
      const maintenant = new Date();
      const debutMoisActuel = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
      const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
      const finMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth(), 0, 23, 59, 59);
      const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());

      const [jourRes, moisActuelRes, moisPrecedentRes] = await Promise.all([
        supabase
          .from('paiements')
          .select('montant_paye')
          .eq('encaisseur_id', comptableId)
          .eq('est_encaisse', true)
          .gte('date_encaissement', debutJour.toISOString()),
        supabase
          .from('paiements')
          .select('montant_paye')
          .eq('encaisseur_id', comptableId)
          .eq('est_encaisse', true)
          .gte('date_encaissement', debutMoisActuel.toISOString()),
        supabase
          .from('paiements')
          .select('montant_paye')
          .eq('encaisseur_id', comptableId)
          .eq('est_encaisse', true)
          .gte('date_encaissement', debutMoisPrecedent.toISOString())
          .lte('date_encaissement', finMoisPrecedent.toISOString()),
      ]);

      if (jourRes.error) throw jourRes.error;
      if (moisActuelRes.error) throw moisActuelRes.error;
      if (moisPrecedentRes.error) throw moisPrecedentRes.error;

      const totalJour = (jourRes.data || []).reduce((sum, p) => sum + p.montant_paye, 0);
      const totalMoisActuel = (moisActuelRes.data || []).reduce((sum, p) => sum + p.montant_paye, 0);
      const totalMoisPrecedent = (moisPrecedentRes.data || []).reduce((sum, p) => sum + p.montant_paye, 0);
      const difference = totalMoisActuel - totalMoisPrecedent;
      const pourcentage = totalMoisPrecedent > 0 ? (difference / totalMoisPrecedent) * 100 : (totalMoisActuel > 0 ? 100 : 0);

      setStatsMois({
        jour: totalJour,
        mois_actuel: totalMoisActuel,
        mois_precedent: totalMoisPrecedent,
        difference,
        pourcentage,
      });
    } catch (error) {
      console.error('Erreur fetchStatsMensuel:', error);
    }
  };

  const fetchTypesPaiement = async () => {
    try {
      const { data, error } = await supabase
        .from('types_paiement')
        .select('id, libelle')
        .eq('is_active', true);

      if (error) throw error;
      setTypesPaiement(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types de paiement:', error);
    }
  };

  const getTypePaiementLabel = (typeId: string): string => {
    return typesPaiement.find(t => t.id === typeId)?.libelle || 'N/A';
  };

  const modesPaiementLabels: { [key: string]: string } = {
    especes: 'Espèces',
    mobile_money: 'Mobile Money',
    virement: 'Virement',
    cheque: 'Chèque',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (comptables.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">Aucun utilisateur n'a encore encaissé de paiement</p>
      </div>
    );
  }

  const selectedComptableInfo = comptables.find(c => c.id === comptableSelectionne);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Comptable</h1>
          {selectedComptableInfo && (
            <p className="text-gray-600 mt-1">
              {selectedComptableInfo.prenom} {selectedComptableInfo.nom} — {selectedComptableInfo.email}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {loadingStats && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
          <Users className="w-6 h-6 text-gray-500" />
          <select
            value={comptableSelectionne}
            onChange={(e) => setComptableSelectionne(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {comptables.map((comptable) => (
              <option key={comptable.id} value={comptable.id}>
                {comptable.prenom} {comptable.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statistiques && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{statistiques.nombre_transactions}</p>
                  <p className="text-xs text-gray-500 mt-1">Paiements actifs</p>
                </div>
                <DollarSign className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Encaissé</p>
                  <p className="text-2xl font-bold text-green-600">{statistiques.total_encaisse.toLocaleString('fr-FR')} FC</p>
                  <p className="text-xs text-gray-500 mt-1">{statistiques.nombre_encaisses} paiements</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Attente</p>
                  <p className="text-2xl font-bold text-orange-600">{statistiques.total_non_encaisse.toLocaleString('fr-FR')} FC</p>
                  <p className="text-xs text-gray-500 mt-1">{statistiques.nombre_non_encaisses} paiements</p>
                </div>
                <Clock className="w-12 h-12 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Global</p>
                  <p className="text-2xl font-bold text-blue-600">{statistiques.total_paiements.toLocaleString('fr-FR')} FC</p>
                  {statistiques.dernier_paiement && (
                    <p className="text-xs text-gray-500 mt-1">
                      Dernier: {new Date(statistiques.dernier_paiement).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <DollarSign className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>

          {statsMois && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Statistiques Temporelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium mb-1">Encaissé Aujourd'hui</p>
                  <p className="text-2xl font-bold text-yellow-700">{statsMois.jour.toLocaleString('fr-FR')} FC</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-1">Mois en Cours</p>
                  <p className="text-2xl font-bold text-blue-700">{statsMois.mois_actuel.toLocaleString('fr-FR')} FC</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-800 font-medium mb-1">Mois Précédent</p>
                  <p className="text-2xl font-bold text-gray-700">{statsMois.mois_precedent.toLocaleString('fr-FR')} FC</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('fr-FR', { month: 'long' })}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${statsMois.difference >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'} p-4 rounded-lg border`}>
                  <p className={`text-sm font-medium mb-1 ${statsMois.difference >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    Évolution
                  </p>
                  <div className="flex items-center gap-2">
                    {statsMois.difference >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <p className={`text-xl font-bold ${statsMois.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {statsMois.difference >= 0 ? '+' : ''}{statsMois.difference.toLocaleString('fr-FR')} FC
                      </p>
                      <p className={`text-xs ${statsMois.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {statsMois.mois_precedent === 0
                          ? (statsMois.mois_actuel > 0 ? 'Nouveau mois' : 'Aucune donnée')
                          : `${statsMois.difference >= 0 ? '+' : ''}${statsMois.pourcentage.toFixed(1)}%`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Paiements Non Encaissés</h3>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  {transactionsNonEncaissees.length}
                </span>
              </div>
              <div className="overflow-x-auto max-h-96">
                {transactionsNonEncaissees.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">Aucun paiement non encaissé</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">N° Reçu</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactionsNonEncaissees.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{transaction.numero_recu}</td>
                          <td className="px-3 py-2 text-sm">
                            <div>{transaction.nom_eleve}</div>
                            <div className="text-xs text-gray-500">{transaction.classe}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">{getTypePaiementLabel(transaction.type_paiement)}</td>
                          <td className="px-3 py-2 text-sm font-semibold text-orange-600">{transaction.montant_paye.toLocaleString('fr-FR')} FC</td>
                          <td className="px-3 py-2 text-sm">{new Date(transaction.date_paiement).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Paiements Encaissés</h3>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {transactions.length}
                </span>
              </div>
              <div className="overflow-x-auto max-h-96">
                {transactions.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">Aucun paiement encaissé</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">N° Reçu</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Encais.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{transaction.numero_recu}</td>
                          <td className="px-3 py-2 text-sm">
                            <div>{transaction.nom_eleve}</div>
                            <div className="text-xs text-gray-500">{transaction.classe}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">{getTypePaiementLabel(transaction.type_paiement)}</td>
                          <td className="px-3 py-2 text-sm font-semibold text-green-600">{transaction.montant_paye.toLocaleString('fr-FR')} FC</td>
                          <td className="px-3 py-2 text-sm">{modesPaiementLabels[transaction.mode_paiement] || transaction.mode_paiement}</td>
                          <td className="px-3 py-2 text-sm">
                            {transaction.date_encaissement ? new Date(transaction.date_encaissement).toLocaleDateString('fr-FR') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!statistiques && !loadingStats && comptableSelectionne && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Aucune donnée disponible pour ce comptable
        </div>
      )}
    </div>
  );
}
