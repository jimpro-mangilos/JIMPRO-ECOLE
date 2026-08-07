import { useState } from 'react';
import MultiSelectFilter from '../components/MultiSelectFilter';
import { Plus, Search, CreditCard as Edit, Trash2, Eye, Users, User, RefreshCw, Loader2, FileDown, CheckCircle, XCircle, Contact } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { calculateAverageAge } from '../utils/calculations';
import EleveDetailsModal from '../components/EleveDetailsModal';
import PaymentFormModal from '../components/PaymentFormModal';
import { useEleves } from '../lib/hooks/useEleves';
import { useSections, useOptions, useClasses } from '../lib/hooks/useReferenceData';
import { generateElevesReport } from '../utils/pdfGenerator';
import { generateCartesEtudiants } from '../utils/carteEtudiantGenerator';
import { useLogo } from '../contexts/LogoContext';
import { useAuth } from '../contexts/AuthContext';

type Eleve = Database['public']['Tables']['eleves']['Row'];

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
function getCurrentMoisMinerval() { return MOIS_FR[new Date().getMonth()]; }

// ─── Filters State ────────────────────────────────────────────────────────────
function useEleveFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string[]>([]);
  const [selectedClasse, setSelectedClasse] = useState<string[]>([]);
  const [filterOrdre, setFilterOrdre] = useState<'' | 'en_ordre' | 'pas_en_ordre'>('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [sortAlpha, setSortAlpha] = useState<'' | 'asc' | 'desc'>('');
  return { searchTerm, setSearchTerm, selectedSection, setSelectedSection, selectedOption, setSelectedOption, selectedClasse, setSelectedClasse, filterOrdre, setFilterOrdre, filterDateDebut, setFilterDateDebut, filterDateFin, setFilterDateFin, sortAlpha, setSortAlpha };
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function Eleves() {
  const { isReadOnly, isItManager } = useAuth();
  const { logoUrl } = useLogo();
  const filters = useEleveFilters();
  const { data: sections = [] } = useSections();
  const { data: options = [] } = useOptions();
  const { data: classes = [] } = useClasses();

  const {
    eleves, loading, paidEleveIds,
    showModal, setShowModal,
    selectedEleve, setSelectedEleve,
    formData, setFormData,
    autoGenerateMatricule, setAutoGenerateMatricule,
    generatingMatricule,
    selectedIds, bulkDeleting,
    openCreate, openEdit,
    handleGenerateMatricule, handleSectionChange,
    submitEleve, deleteEleve,
    toggleSelectOne, toggleSelectAll, bulkDelete,
    invalidateEleves,
  } = useEleves(filters);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const sectionList = sections as { id: string; nom: string }[];
  const optionList = options as { id: string; nom: string; section_id: string }[];
  const classeList = classes as { id: string; nom: string; section_id: string; option_id: string | null }[];

  // ─── Section Stats ───────────────────────────────────────────────────────
  function getSectionStats(sectionName: string) {
    const sectionEleves = sectionName === '' ? eleves : eleves.filter(e => e.section.toLowerCase() === sectionName.toLowerCase());
    const total = sectionEleves.length;
    const garcons = sectionEleves.filter(e => e.sexe.toUpperCase() === 'M').length;
    const filles = sectionEleves.filter(e => e.sexe.toUpperCase() === 'F').length;
    const enOrdre = sectionEleves.filter(e => paidEleveIds.has(e.id)).length;
    const pasEnOrdre = total - enOrdre;
    const ages = sectionEleves.filter(e => e.date_naissance).map(e => e.date_naissance);
    const avgAge = calculateAverageAge(ages);
    return { total, garcons, filles, enOrdre, pasEnOrdre, avgAge };
  }

  // ─── Form handlers ────────────────────────────────────────────────────────
  const handleOpenForm = () => openCreate();

  const handleEditClick = (eleve: Eleve) => {
    openEdit(eleve);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitEleve(classeList);
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const handleViewDetails = (eleve: Eleve) => {
    setSelectedEleve(eleve);
    setShowDetailsModal(true);
  };

  const handlePayment = (eleve: Eleve) => {
    setSelectedEleve(eleve);
    setShowPaymentModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Élèves</h1>
          <p className="text-gray-600 mt-1">{eleves.length} élève(s) trouvé(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateElevesReport(eleves.map(e => ({
              matricule: e.matricule, nom: e.nom, postnom: e.postnom, prenom: e.prenom,
              sexe: e.sexe, section: e.section, option: e.option || undefined,
              classe: e.classe || '', responsable: e.responsable, telephone: e.telephone,
              date_naissance: e.date_naissance || undefined,
              lieu_naissance: e.lieu_naissance || undefined,
              domicile: e.domicile || undefined,
            })))}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <FileDown className="w-5 h-5" /> Imprimer
          </button>
          <button
            onClick={async () => {
              try {
                const max = 40; // limit to avoid memory issues
                const toPrint = eleves.slice(0, max);
                const cartes = toPrint.map(e => ({
                  matricule: e.matricule,
                  nom: e.nom,
                  postnom: e.postnom,
                  prenom: e.prenom,
                  sexe: e.sexe,
                  section: e.section,
                  option: e.option,
                  classe: e.classe,
                  date_naissance: e.date_naissance,
                  photo_url: (e as any).photo_url,
                }));
                const doc = await generateCartesEtudiants(cartes, logoUrl);
                doc.save('cartes-etudiants.pdf');
              } catch (err) {
                console.error('Erreur génération cartes:', err);
                alert('Erreur lors de la génération des cartes. Vérifiez la console.');
              }
            }}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium shadow-sm"
          >
            <Contact className="w-5 h-5" /> Cartes
          </button>
          {!isReadOnly() && (
            <button onClick={handleOpenForm} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
              <Plus className="w-5 h-5" /> Ajouter un Élève
            </button>
          )}
        </div>
      </div>

      {/* Section Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => filters.setSelectedSection([])} className={`bg-white rounded-lg shadow-sm p-3 cursor-pointer transition-all hover:shadow-md ${filters.selectedSection.length === 0 ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-3 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
            <span className="text-xl font-bold text-gray-900">{getSectionStats('').total}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Tous les Élèves</h3>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>G: {getSectionStats('').garcons}</span> <span>F: {getSectionStats('').filles}</span>
          </div>
        </div>
        {sectionList.map(section => {
          const stats = getSectionStats(section.nom);
          return (
            <div key={section.id} onClick={() => filters.setSelectedSection(prev => prev.includes(section.nom) ? prev.filter(s => s !== section.nom) : [...prev, section.nom])}
              className={`bg-white rounded-lg shadow-sm p-3 cursor-pointer transition-all hover:shadow-md ${filters.selectedSection.includes(section.nom) ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="bg-green-100 p-3 rounded-lg"><User className="w-6 h-6 text-green-600" /></div>
                <span className="text-xl font-bold text-gray-900">{stats.total}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{section.nom}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>G: {stats.garcons}</span> <span>F: {stats.filles}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Rechercher un élève..." value={filters.searchTerm}
            onChange={e => filters.setSearchTerm(e.target.value)} className="flex-1 outline-none text-gray-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <MultiSelectFilter label="Section" placeholder="Toutes" options={sectionList.map(s => s.nom)}
            selected={filters.selectedSection} onChange={v => filters.setSelectedSection(v)} />
          <MultiSelectFilter label="Option" placeholder="Toutes"
            options={optionList.filter(o => filters.selectedSection.length === 0 || filters.selectedSection.some(sec => { const s = sectionList.find(x => x.nom === sec); return s && o.section_id === s.id; })).map(o => o.nom)}
            selected={filters.selectedOption} onChange={v => filters.setSelectedOption(v)} />
          <MultiSelectFilter label="Classe" placeholder="Toutes"
            options={classeList.filter(c => { if (filters.selectedSection.length > 0) { const ids = sectionList.filter(s => filters.selectedSection.includes(s.nom)).map(s => s.id); if (!ids.includes(c.section_id)) return false; } if (filters.selectedOption.length > 0) { const ids = optionList.filter(o => filters.selectedOption.includes(o.nom)).map(o => o.id); if (c.option_id && !ids.includes(c.option_id)) return false; } return true; }).map(c => c.nom)}
            selected={filters.selectedClasse} onChange={v => filters.setSelectedClasse(v)} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Paiement {getCurrentMoisMinerval()}</label>
            <select value={filters.filterOrdre} onChange={e => filters.setFilterOrdre(e.target.value as any)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Tous</option><option value="en_ordre">En ordre</option><option value="pas_en_ordre">Pas en ordre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tri</label>
            <select value={filters.sortAlpha} onChange={e => filters.setSortAlpha(e.target.value as any)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Sans tri</option><option value="asc">A → Z</option><option value="desc">Z → A</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
            <input type="date" value={filters.filterDateDebut} onChange={e => filters.setFilterDateDebut(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
            <input type="date" value={filters.filterDateFin} onChange={e => filters.setFilterDateFin(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
        </div>
      </div>

      {/* Bulk actions */}
      {isItManager() && selectedIds.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-red-700">{selectedIds.size} élève(s) sélectionné(s)</span>
          <button onClick={bulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
            {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer la sélection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {isItManager() && <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedIds.size === eleves.length && eleves.length > 0} onChange={toggleSelectAll} className="rounded" /></th>}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Matricule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom complet</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sexe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Section</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Option</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Classe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{getCurrentMoisMinerval()}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eleves.length === 0 && (
                <tr><td colSpan={isItManager() ? 9 : 8} className="px-4 py-12 text-center text-gray-400">Aucun élève trouvé.</td></tr>
              )}
              {eleves.map(eleve => (
                <tr key={eleve.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewDetails(eleve)}>
                  {isItManager() && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(eleve.id)} onChange={(e) => { e.stopPropagation(); toggleSelectOne(eleve.id); }} className="rounded" /></td>}
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{eleve.matricule}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{eleve.nom} {eleve.postnom} {eleve.prenom}</p>
                    {eleve.telephone && <p className="text-xs text-gray-400">{eleve.telephone}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{eleve.sexe}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{eleve.section}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{eleve.option || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{eleve.classe || '—'}</td>
                  <td className="px-4 py-3">
                    {paidEleveIds.has(eleve.id)
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" />OK</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" />Pas OK</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleViewDetails(eleve)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="Détails"><Eye className="w-4 h-4" /></button>
                      {!isReadOnly() && <button onClick={(e) => { e.stopPropagation(); handleEditClick(eleve); }} className="p-2 rounded-lg hover:bg-amber-50 text-amber-600" title="Modifier"><Edit className="w-4 h-4" /></button>}
                      {!isReadOnly() && <button onClick={(e) => { e.stopPropagation(); handlePayment(eleve); }} className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="Paiement"><Plus className="w-4 h-4" /></button>}
                      {isItManager() && <button onClick={(e) => { e.stopPropagation(); deleteEleve(eleve.id); }} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal (inline form) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{selectedEleve ? 'Modifier' : 'Ajouter'} un élève</h2>
                <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><XCircle className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <select value={formData.section} onChange={e => handleSectionChange(e.target.value)} required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Sélectionner</option>
                    {sectionList.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Option</label>
                  <select value={formData.option} onChange={e => { setFormData(p => ({ ...p, option: e.target.value, classe_id: '' })); }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Sélectionner</option>
                    {optionList.filter(o => !formData.section || sectionList.find(s => s.nom === formData.section)?.id === o.section_id).map(o => <option key={o.id} value={o.nom}>{o.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matricule *</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.matricule} onChange={e => { setFormData(p => ({ ...p, matricule: e.target.value })); setAutoGenerateMatricule(false); }}
                      placeholder="Auto-généré" className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={() => handleGenerateMatricule(formData.section)} disabled={generatingMatricule || !formData.section}
                      className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm disabled:opacity-50">
                      {generatingMatricule ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                  <select value={formData.classe_id} onChange={e => setFormData(p => ({ ...p, classe_id: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Sélectionner</option>
                    {classeList.filter(c => { if (formData.section) { const s = sectionList.find(x => x.nom === formData.section); if (s && c.section_id !== s.id) return false; } if (formData.option) { const o = optionList.find(x => x.nom === formData.option); if (o && c.option_id && c.option_id !== o.id) return false; } return true; }).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input type="text" value={formData.nom} onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Postnom</label><input type="text" value={formData.postnom} onChange={e => setFormData(p => ({ ...p, postnom: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label><input type="text" value={formData.prenom} onChange={e => setFormData(p => ({ ...p, prenom: e.target.value }))} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Sexe *</label><select value={formData.sexe} onChange={e => setFormData(p => ({ ...p, sexe: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date naissance</label><input type="date" value={formData.date_naissance} onChange={e => setFormData(p => ({ ...p, date_naissance: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Lieu naissance</label><input type="text" value={formData.lieu_naissance} onChange={e => setFormData(p => ({ ...p, lieu_naissance: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Responsable *</label><input type="text" value={formData.responsable} onChange={e => setFormData(p => ({ ...p, responsable: e.target.value }))} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label><input type="text" value={formData.telephone} onChange={e => setFormData(p => ({ ...p, telephone: e.target.value }))} required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Domicile</label><input type="text" value={formData.domicile} onChange={e => setFormData(p => ({ ...p, domicile: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">{selectedEleve ? 'Mettre à jour' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailsModal && selectedEleve && (
        <EleveDetailsModal eleve={selectedEleve} onClose={() => { setShowDetailsModal(false); setSelectedEleve(null); }} onPaymentAdded={invalidateEleves} onOpenPaymentForm={() => setShowPaymentModal(true)} />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedEleve && (
        <PaymentFormModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSuccess={() => { invalidateEleves(); setShowPaymentModal(false); }} preselectedEleve={selectedEleve} />
      )}
    </div>
  );
}
