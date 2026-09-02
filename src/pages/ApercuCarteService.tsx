import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CarteServiceCard, CarteServiceCardBack, type CarteService } from '../components/CarteServiceCard';

// Données d'exemple — variées pour évaluer le rendu réel (noms longs, avec/sans photo)
const SAMPLES: CarteService[] = [
  {
    matricule: 'GAM-P-0001',
    nom: 'MUKENDI',
    postnom: 'KASONGO',
    prenom: 'Mariella',
    sexe: 'F',
    fonction: 'Enseignante',
    date_naissance: '1990-05-14',
    nationalite: 'Congolaise',
    date_embauche: '2015-09-01',
    photo_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    telephone: '+243 810 000 001',
    email: 'm.mukendi@goldenacademy.cd',
    adresse: 'Av. du Marché n°12, Kinshasa',
  },
  {
    matricule: 'GAM-A-0042',
    nom: 'ILUNGA',
    postnom: 'MUTOMBO',
    prenom: 'Jean-Paul',
    sexe: 'M',
    fonction: 'Directeur des études',
    date_naissance: '1980-02-03',
    nationalite: 'Congolaise',
    date_embauche: '2008-08-15',
    photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    telephone: '+243 998 000 042',
    email: 'jp.ilunga@goldenacademy.cd',
    adresse: '23, Av. de la Libération, Gombe, Kinshasa',
  },
  {
    matricule: 'GAM-S-0137',
    nom: 'KABEYA',
    postnom: 'NYEMBO',
    prenom: 'Grâce',
    sexe: 'F',
    fonction: 'Secrétaire',
    date_naissance: '1995-11-22',
    nationalite: 'Congolaise',
    date_embauche: '2020-01-10',
    photo_url: null,
    telephone: '+243 812 000 137',
    email: 'g.kabeya@goldenacademy.cd',
    adresse: '—',
  },
];

async function qrFor(p: CarteService): Promise<string> {
  return QRCode.toDataURL(
    `MATRICULE:${p.matricule || ''}|NOM:${p.nom} ${p.postnom ? p.postnom + ' ' : ''}${p.prenom}|FONCTION:${p.fonction}`,
    { width: 800, margin: 2, errorCorrectionLevel: 'H' }
  );
}

export default function ApercuCarteService() {
  const [qrs, setQrs] = useState<Record<number, string>>({});
  const [cote, setCote] = useState<'recto' | 'verso'>('recto');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<number, string> = {};
      for (let i = 0; i < SAMPLES.length; i++) map[i] = await qrFor(SAMPLES[i]);
      if (!cancelled) setQrs(map);
    })();
    return () => { cancelled = true; };
  }, []);

  const SCHOOL = 'C.S GOLDEN ACADEMY';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Aperçu — Carte de service du PERSONNEL (template actuel)</h1>
      <p className="text-gray-500 mb-6">Carte d'identité professionnelle verticale · 54 × 86 mm · design « Prestige » — consultez le recto et le verso pour ajuster le design.</p>

      {/* Bascule Recto / Verso */}
      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => setCote('recto')}
          className={'px-5 py-2 rounded-lg font-semibold text-sm transition-colors ' + (cote === 'recto' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}
        >
          Recto
        </button>
        <button
          onClick={() => setCote('verso')}
          className={'px-5 py-2 rounded-lg font-semibold text-sm transition-colors ' + (cote === 'verso' ? 'bg-amber-500 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}
        >
          Verso
        </button>
      </div>

      <div className="flex flex-col items-center gap-10">
        {SAMPLES.map((p, i) => (
          <div key={p.matricule} className="flex flex-col items-center gap-3">
            <span className="text-lg font-semibold text-gray-700">{p.nom} {p.postnom} {p.prenom} — {p.fonction}</span>
            {cote === 'recto' ? (
              <CarteServiceCard
                personnel={p}
                schoolName={SCHOOL}
                logoUrl={null}
                qrDataUrl={qrs[i] || ''}
              />
            ) : (
              <CarteServiceCardBack personnel={p} schoolName={SCHOOL} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
