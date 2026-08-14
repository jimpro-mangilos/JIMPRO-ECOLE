import { useEffect, useState } from 'react';
import { CarteEleveCard, generateQrDataUrl, type CarteEleve } from '../components/CarteEleveCard';

const SAMPLE: CarteEleve = {
  matricule: 'GAM-20260812-ABC1234',
  nom: 'MUKENDI',
  postnom: 'KASONGO',
  prenom: 'Mariella',
  sexe: 'F',
  section: 'SECONDAIRE',
  option: 'Scientifique',
  classe: '1ère',
  photo_url: null,
  date_naissance: '2010-05-14',
};

const SECTIONS = [
  { key: 'MATERNELLE', label: 'Maternelle' },
  { key: 'PRIMAIRE', label: 'Primaire' },
  { key: 'SECONDAIRE', label: 'Secondaire' },
];

export default function ApercuCartes() {
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const { key } of SECTIONS) {
        map[key] = await generateQrDataUrl({ ...SAMPLE, section: key });
      }
      if (!cancelled) setQrs(map);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Aperçu des cartes d'élève</h1>
      <p className="text-gray-500 mb-8">Une couleur différente selon la section.</p>

      <div className="flex flex-col items-center gap-10">
        {SECTIONS.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center gap-3">
            <span className="text-lg font-semibold text-gray-700">{label}</span>
            <CarteEleveCard
              eleve={{ ...SAMPLE, section: key }}
              schoolName="C.S_GOLDEN_ACADEMY"
              logoUrl={null}
              qrDataUrl={qrs[key] || ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
