import { describe, it, expect } from 'vitest';
import { calculerAnciennete, calculerSalaireMois, calculerSalaireJournalier } from './calculations';
import { compareHeures, estJourOuvrable, statutAuto, POINTAGE_DEFAUT, type PointageConfig } from '../lib/hooks/usePointage';

describe('calculerSalaireMois', () => {
  it('calcule jours présents × salaire journalier', () => {
    expect(calculerSalaireMois(20, 300000, 22)).toBeCloseTo(272727.27, 1);
  });
  it('retourne null sans salaire ou sans jours', () => {
    expect(calculerSalaireMois(0, 300000, 22)).toBeNull();
    expect(calculerSalaireMois(20, null, 22)).toBeNull();
    expect(calculerSalaireMois(20, 300000, 0)).toBeNull();
  });
});

describe('calculerSalaireJournalier', () => {
  it('divise le salaire mensuel par les jours ouvrables', () => {
    expect(calculerSalaireJournalier(300000, 22)).toBeCloseTo(13636.36, 1);
  });
  it('retourne null sans salaire', () => {
    expect(calculerSalaireJournalier(null, 22)).toBeNull();
  });
});

describe('calculerAnciennete', () => {
  it('affiche — sans date', () => {
    expect(calculerAnciennete('')).toBe('—');
  });
  it('contient ans/mois/jours pour une ancienne embauche', () => {
    const r = calculerAnciennete('2015-09-01');
    expect(r).toMatch(/an(s)?/);
    expect(r).toMatch(/mois/);
    expect(r).toMatch(/jour(s)?/);
  });
});

describe('compareHeures', () => {
  it('compare correctement', () => {
    expect(compareHeures('08:00', '08:00')).toBe(0);
    expect(compareHeures('08:30', '08:00')).toBeGreaterThan(0);
    expect(compareHeures('07:45', '08:00')).toBeLessThan(0);
  });
});

describe('estJourOuvrable', () => {
  it('lundi→vendredi ouvrables, samedi/dimanche non', () => {
    expect(estJourOuvrable('2026-08-24')).toBe(true); // lundi
    expect(estJourOuvrable('2026-08-28')).toBe(true); // vendredi
    expect(estJourOuvrable('2026-08-29')).toBe(false); // samedi
    expect(estJourOuvrable('2026-08-30')).toBe(false); // dimanche
  });
});

describe('statutAuto', () => {
  const cfg: PointageConfig = { ...POINTAGE_DEFAUT, heureEntree: '08:00' };
  it('présent si arrivée ≤ heure d\'entrée', () => {
    expect(statutAuto('08:00:00', cfg)).toBe('present');
    expect(statutAuto('07:55:00', cfg)).toBe('present');
  });
  it('retard si arrivée > heure d\'entrée', () => {
    expect(statutAuto('08:01:00', cfg)).toBe('retard');
    expect(statutAuto('10:30:00', cfg)).toBe('retard');
  });
  it('absent sans heure d\'arrivée', () => {
    expect(statutAuto(null, cfg)).toBe('absent');
  });
});
