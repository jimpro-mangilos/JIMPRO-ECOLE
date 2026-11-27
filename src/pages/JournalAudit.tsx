import { useState } from 'react';
import { Search, RefreshCw, History, PlusCircle, Pencil, Trash2, FileSearch } from 'lucide-react';
import { useAuditLogs, type AuditLog } from '../lib/hooks/useAuditLogs';
import { formatDateTime } from '../utils/calculations';

const ACTION_STYLES: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
};

// Résumé lisible d'une entrée d'audit (champs dénormalisés des paiements / compte_courant / eleves)
function summarize(entry: AuditLog): { recu: string | null; matricule: string | null; nom: string | null; motif: string | null; montant: number | null; statut: string | null } | null {
  const d = entry.action === 'DELETE' ? entry.old_data : (entry.new_data || entry.old_data);
  if (!d) return null;
  const nomParts = [d.nom_eleve, d.postnom, d.prenom, d.nom, d.beneficiaire].filter(Boolean);
  const nom = nomParts.length > 0 ? nomParts.join(' ') : null;
  return {
    recu: d.numero_recu ?? null,
    matricule: d.matricule ?? null,
    nom,
    motif: d.motif_libelle ?? d.libelle ?? d.motif ?? null,
    montant: d.montant_paye ?? d.montant_chiffre ?? null,
    statut: d.statut ?? null,
  };
}

export default function JournalAudit() {
  const [tableName, setTableName] = useState('paiements');
  const [action, setAction] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { logs, nameMap, isLoading, isFetching } = useAuditLogs({ tableName, action, search });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="w-6 h-6 text-indigo-600" /> Journal d'audit</h1>
          <p className="text-sm text-gray-500 mt-1">Traçabilité des créations, modifications et suppressions (paiements, finances, élèves).</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Rechercher (n° reçu, matricule, nom…)</label>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 focus-within:ring-2 focus-within:ring-indigo-500">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ex: RECU-2026-13941"
                className="flex-1 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Table</label>
            <select value={tableName} onChange={(e) => setTableName(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="all">Toutes</option>
              <option value="paiements">Paiements</option>
              <option value="compte_courant">Finances (compte courant)</option>
              <option value="eleves">Élèves</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="all">Toutes</option>
              <option value="INSERT">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"><FileSearch className="w-4 h-4" /> Filtrer</button>
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setTableName('all'); setAction('all'); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Réinitialiser</button>
        </form>
      </div>

      {/* Résultats */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-16 text-center text-gray-400"><div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-16 text-center text-gray-400">Aucune entrée trouvée (seuls admin et IT Manager voient ce journal).</div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Détails</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Auteur</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((entry) => {
                const s = summarize(entry);
                const isStatusChange = entry.action === 'UPDATE' && entry.old_data?.statut && entry.new_data?.statut && entry.old_data.statut !== entry.new_data.statut;
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/50 align-top">
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(entry.changed_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ACTION_STYLES[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.action === 'INSERT' ? <PlusCircle className="w-3 h-3" /> : entry.action === 'UPDATE' ? <Pencil className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{entry.table_name}</p>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {s?.recu && <p className="font-mono text-gray-900 font-medium">{s.recu}</p>}
                      {s?.matricule && <p className="font-mono text-xs text-gray-500">{s.matricule}</p>}
                      {s?.nom && <p className="text-gray-700">{s.nom}</p>}
                      {s?.motif && <p className="text-xs text-gray-500">Motif : {s.motif}</p>}
                      {s?.montant != null && <p className="text-xs text-gray-500">{Number(s.montant).toLocaleString('fr-FR')} FC</p>}
                      {!s && <p className="text-xs text-gray-400 italic">—</p>}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {entry.action === 'DELETE' ? (
                        <span className="text-red-600 font-medium">Supprimé définitivement</span>
                      ) : isStatusChange ? (
                        <span className="text-xs">
                          <span className="text-gray-500">{entry.old_data?.statut}</span>
                          <span className="mx-1 text-gray-400">→</span>
                          <span className={`font-semibold ${entry.new_data?.statut === 'annule' ? 'text-red-600' : 'text-green-600'}`}>{entry.new_data?.statut}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">{s?.statut || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{entry.changed_by ? (nameMap.get(entry.changed_by) || entry.changed_by.slice(0, 8)) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {isFetching && !isLoading && <div className="px-4 py-2 text-xs text-gray-400 text-right">Actualisation…</div>}
      </div>
    </div>
  );
}
