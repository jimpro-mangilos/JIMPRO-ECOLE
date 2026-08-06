import { describe, it, expect } from 'vitest';
import { getStatut, type Paiement } from './usePaiements';

// ─── Unit tests: pure logic, no Supabase mocking needed ──────────────────

describe('getStatut', () => {
  it('should return statut field when present', () => {
    const p = { statut: 'encaisse' } as Paiement;
    expect(getStatut(p)).toBe('encaisse');
  });

  it('should return "encaisse" when est_encaisse is true and statut is falsy', () => {
    const p = { est_encaisse: true, statut: '' } as unknown as Paiement;
    expect(getStatut(p)).toBe('encaisse');
  });

  it('should return "en_attente" when est_encaisse is false and statut is falsy', () => {
    const p = { est_encaisse: false, statut: '' } as unknown as Paiement;
    expect(getStatut(p)).toBe('en_attente');
  });
});

// ─── Filters logic tests ─────────────────────────────────────────────────

function filterByStatut(paiements: Paiement[], statuts: string[]) {
  if (statuts.length === 0) return paiements;
  return paiements.filter(p => statuts.includes(getStatut(p)));
}

function filterBySearch(paiements: Paiement[], term: string) {
  if (!term) return paiements;
  const s = term.toLowerCase();
  return paiements.filter(p => p.numero_recu.toLowerCase().includes(s) || p.nom_eleve.toLowerCase().includes(s) || p.classe.toLowerCase().includes(s));
}

describe('filterByStatut', () => {
  const paiements = [
    { id: '1', statut: 'encaisse', numero_recu: 'R1', nom_eleve: 'Jean', classe: '6eme' },
    { id: '2', statut: 'en_attente', numero_recu: 'R2', nom_eleve: 'Marie', classe: '5eme' },
    { id: '3', statut: 'annule', numero_recu: 'R3', nom_eleve: 'Paul', classe: '4eme' },
  ] as Paiement[];

  it('should return all when no filter', () => {
    expect(filterByStatut(paiements, [])).toHaveLength(3);
  });

  it('should filter encaisse only', () => {
    expect(filterByStatut(paiements, ['encaisse'])).toHaveLength(1);
  });
});

describe('filterBySearch', () => {
  const paiements = [
    { id: '1', numero_recu: 'REC-001', nom_eleve: 'Jean Dupont', classe: '6eme A' },
    { id: '2', numero_recu: 'REC-002', nom_eleve: 'Marie Curie', classe: '5eme B' },
  ] as Paiement[];

  it('should return all when search is empty', () => {
    expect(filterBySearch(paiements, '')).toHaveLength(2);
  });

  it('should find by name', () => {
    expect(filterBySearch(paiements, 'jean')).toHaveLength(1);
  });

  it('should find by receipt number', () => {
    expect(filterBySearch(paiements, 'REC-001')).toHaveLength(1);
  });

  it('should return empty when no match', () => {
    expect(filterBySearch(paiements, 'xyz')).toHaveLength(0);
  });
});
