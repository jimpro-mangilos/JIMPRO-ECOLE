import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { CarteServiceCard } from '../components/CarteServiceCard';
import { CarteEleveCard } from '../components/CarteEleveCard';

const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Rendu statique des cartes (renderToString - sans second root React)', () => {
  it('carte de service : rend le HTML complet', () => {
    const html = renderToString(
      createElement(CarteServiceCard, {
        personnel: {
          matricule: 'GAM-A-0042', nom: 'ILUNGA', postnom: 'MUTOMBO', prenom: 'Jean-Paul',
          sexe: 'M', fonction: 'Directeur des études', date_naissance: '1980-02-03',
          nationalite: 'Congolaise', date_embauche: '2008-08-15',
          photo_url: null, telephone: '+243', email: 'jp.ilunga@goldenacademy.cd',
        },
        schoolName: 'C.S GOLDEN ACADEMY',
        logoUrl: null,
        qrDataUrl: QR,
      })
    );
    expect(html).toContain('GAM-A-0042');
    expect(html).toContain('Directeur des études');
    expect(html).toContain('C.S GOLDEN ACADEMY');
    expect(html).toContain('M');
  });

  it('carte élève : rend le HTML complet', () => {
    const html = renderToString(
      createElement(CarteEleveCard, {
        eleve: { matricule: 'CSGA-2026-0001', nom: 'KABEYA', postnom: 'NYEMBO', prenom: 'Grace', sexe: 'F', section: 'Primaire', classe: '6eme', photo_url: null },
        schoolName: 'C.S GOLDEN ACADEMY',
        logoUrl: null,
        qrDataUrl: QR,
      })
    );
    expect(html).toContain('CSGA-2026-0001');
    expect(html).toContain('KABEYA');
  });
});
