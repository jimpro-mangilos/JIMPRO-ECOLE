// Barre de progression générique, utilisée pour toutes les générations
// d'éléments (cartes, PDF…) afin d'afficher l'avancement en pourcentage.
export default function ProgressBar({
  value,
  label,
  current,
  total,
  className = '',
}: {
  /** Avancement en pourcentage (0 à 100). */
  value: number;
  /** Texte d'étiquette affiché au-dessus de la barre. */
  label?: string;
  /** Nombre d'éléments déjà traités (affiché sous forme « X / Y »). */
  current?: number;
  /** Nombre total d'éléments à traiter. */
  total?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={'w-full ' + className}>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-gray-600">
        <span>{label ?? 'Génération en cours…'}</span>
        <span className="tabular-nums font-semibold text-gray-800">
          {current != null && total != null ? current + ' / ' + total + ' — ' : ''}{pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-200 ease-out"
          style={{ width: pct + '%' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
