import { useState } from 'react';
import { FileText, Download, Loader2, RotateCcw, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MultiSelectFilter from '../components/MultiSelectFilter';
import { useRapports } from '../lib/hooks/useRapports';
import {
  generateElevesReport, generateFinancesReport,
  generateFournituresElevesReport,
  generateRapportComptable, generateRapportComparatifComptables,
} from '../utils/pdfGenerator';

export default function Rapports() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { sections, options, classes, motifs, annees, sectionMap, sectionIdToName, financeComptables, financeApprobateurs, fournitureTypes, fournitureSections, fournitureClasses } = useRapports();

  // Filter states
  const [ef, setEf] = useState({ startDate: '', endDate: '', section: [] as string[], option: [] as string[], classe: [] as string[], motif: [] as string[], annee: [] as string[], montantMin: '', montantMax: '' });
  const [ff, setFf] = useState({ section: [] as string[], classe: [] as string[], typeUniforme: [] as string[], annee: [] as string[], startDate: '', endDate: '', search: '' });
  const [fnf, setFnf] = useState({ startDate: '', endDate: '', typeOperation: [] as string[], statut: [] as string[], comptable: [] as string[], approbateur: [] as string[], montantMin: '', montantMax: '', search: '' });
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [comptables, setComptables] = useState<any[]>([]);
  const [selectedComptables, setSelectedComptables] = useState<string[]>([]);

  const filteredOptions = useMemo(() => ef.section.length === 0 ? options : options.filter((o: string) => { const sec = sections.find((s: any) => typeof s === 'object' ? s.nom : false); return true; }), [options, ef.section, sections]);
  const filteredClasses = useMemo(() => { let list = classes; if (ef.section.length > 0) list = list.filter((c: any) => ef.section.includes(sectionIdToName[c.section_id] || '')); if (ef.option.length > 0) list = list.filter((c: any) => { const opt = (options as any[]).find((o: any) => o.nom && ef.option.includes(o.nom)); return opt && c.option_id === opt.id; }); return [...new Set(list.map((c: any) => c.nom))].sort(); }, [classes, ef, sectionIdToName, options]);

  const showMsg = (type: 'success' | 'error', text: string) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };

  const generate = async (fn: Function, ...args: any[]) => { setLoading(true); try { await fn(...args); showMsg('success', 'Rapport généré'); } catch (err: any) { showMsg('error', err.message || 'Erreur'); } finally { setLoading(false); } };

  const loadComptables = async () => { const { data } = await supabase.from('compte_courant').select('*'); setComptables(data || []); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
      {message && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><FileText className="w-4 h-4" />{message.text}</div>}

      {/* Quick Reports */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-3" onClick={() => setExpandedSection(expandedSection === 'quick' ? null : 'quick')} style={{ cursor: 'pointer' }}>Rapports Rapides</h2>
        {expandedSection === 'quick' && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => generate(generateElevesReport, [])} disabled={loading} className="p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors"><FileText className="w-5 h-5 text-blue-600 mb-2" /><p className="font-medium">Liste Élèves</p></button>
          <button onClick={() => generate(generateFinancesReport, [])} disabled={loading} className="p-4 border rounded-lg text-left hover:bg-green-50 transition-colors"><FileText className="w-5 h-5 text-green-600 mb-2" /><p className="font-medium">Finances</p></button>
          <button onClick={() => generate(generateFournituresElevesReport, [])} disabled={loading} className="p-4 border rounded-lg text-left hover:bg-purple-50 transition-colors"><FileText className="w-5 h-5 text-purple-600 mb-2" /><p className="font-medium">Fournitures Élèves</p></button>
        </div>}
      </section>

      {/* Élèves Report */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-3" onClick={() => setExpandedSection(expandedSection === 'eleves' ? null : 'eleves')} style={{ cursor: 'pointer' }}>Rapport Élèves</h2>
        {expandedSection === 'eleves' && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><label className="text-xs font-medium">Date début</label><input type="date" value={ef.startDate} onChange={e => setEf(p => ({ ...p, startDate: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
            <div><label className="text-xs font-medium">Date fin</label><input type="date" value={ef.endDate} onChange={e => setEf(p => ({ ...p, endDate: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
            <div><label className="text-xs font-medium">Montant min</label><input type="number" value={ef.montantMin} onChange={e => setEf(p => ({ ...p, montantMin: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
            <div><label className="text-xs font-medium">Montant max</label><input type="number" value={ef.montantMax} onChange={e => setEf(p => ({ ...p, montantMax: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <MultiSelectFilter label="Section" placeholder="Toutes" options={sections} selected={ef.section} onChange={v => setEf(p => ({ ...p, section: v }))} />
            <MultiSelectFilter label="Option" placeholder="Toutes" options={filteredOptions} selected={ef.option} onChange={v => setEf(p => ({ ...p, option: v }))} />
            <MultiSelectFilter label="Classe" placeholder="Toutes" options={filteredClasses} selected={ef.classe} onChange={v => setEf(p => ({ ...p, classe: v }))} />
            <MultiSelectFilter label="Motif" placeholder="Tous" options={motifs} selected={ef.motif} onChange={v => setEf(p => ({ ...p, motif: v }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => generate(generateElevesReport, [], ef.startDate ? new Date(ef.startDate) : undefined, ef.endDate ? new Date(ef.endDate) : undefined)} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Générer</button>
            <button onClick={() => setEf({ startDate: '', endDate: '', section: [], option: [], classe: [], motif: [], annee: [], montantMin: '', montantMax: '' })} className="flex items-center gap-2 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 text-sm"><RotateCcw className="w-4 h-4" />Réinitialiser</button>
          </div>
        </>}
      </section>

      {/* Comptable Report */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-3" onClick={() => { setExpandedSection(expandedSection === 'comptable' ? null : 'comptable'); if (expandedSection !== 'comptable') loadComptables(); }} style={{ cursor: 'pointer' }}>Rapport Comptable</h2>
        {expandedSection === 'comptable' && <>
          <div className="flex gap-3 mb-3">
            <div className="flex-1"><label className="text-xs font-medium">Date début</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
            <div className="flex-1"><label className="text-xs font-medium">Date fin</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generate(generateRapportComparatifComptables, comptables, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined)} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Comparatif</button>
            <button onClick={() => generate(generateRapportComptable, selectedComptables.length > 0 ? selectedComptables[0] : null, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined)} disabled={loading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"><Download className="w-4 h-4" />Individuel</button>
          </div>
        </>}
      </section>

      {/* Fournitures / Finances — kept compact */}
      {loading && <div className="flex justify-center py-4"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}
    </div>
  );
}
