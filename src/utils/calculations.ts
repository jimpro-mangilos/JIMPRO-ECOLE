export function calculateAge(dateNaissance: string | Date): number {
  const birthDate = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function calculateAverageAge(dates: (string | Date)[]): number {
  if (dates.length === 0) return 0;

  const totalAge = dates.reduce((sum, date) => sum + calculateAge(date), 0);
  return Math.round(totalAge / dates.length);
}

export function calculatePaymentStatus(montantTotal: number, montantPaye: number): 'payé' | 'partiel' | 'impayé' {
  if (montantPaye >= montantTotal) return 'payé';
  if (montantPaye > 0) return 'partiel';
  return 'impayé';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getPaymentStatusColor(status: 'payé' | 'partiel' | 'impayé'): string {
  switch (status) {
    case 'payé':
      return 'text-green-600';
    case 'partiel':
      return 'text-orange-600';
    case 'impayé':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function getPaymentStatusBgColor(status: 'payé' | 'partiel' | 'impayé'): string {
  switch (status) {
    case 'payé':
      return 'bg-green-100';
    case 'partiel':
      return 'bg-orange-100';
    case 'impayé':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
}
/**
 * Calcule l'ancienneté exacte (ans, mois, jours) depuis une date d'embauche.
 */
export function calculerAnciennete(dateEmbauche: string): string {
  if (!dateEmbauche) return '—';
  const d = new Date(dateEmbauche + 'T00:00:00');
  const now = new Date();
  if (isNaN(d.getTime()) || d > now) return '—';
  let ans = now.getFullYear() - d.getFullYear();
  let mois = now.getMonth() - d.getMonth();
  let jours = now.getDate() - d.getDate();
  if (jours < 0) {
    mois -= 1;
    jours += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (mois < 0) {
    ans -= 1;
    mois += 12;
  }
  const parts: string[] = [];
  if (ans > 0) parts.push(`${ans} an${ans > 1 ? 's' : ''}`);
  if (mois > 0) parts.push(`${mois} mois`);
  parts.push(`${jours} jour${jours > 1 ? 's' : ''}`);
  return parts.join(', ');
}
/** Calcule le salaire du mois : jours présents × (salaire mensuel ÷ jours ouvrables). */
export function calculerSalaireMois(joursPresent: number, salaireMensuel: number | null, joursOuvrables: number): number | null {
  if (salaireMensuel == null || joursOuvrables <= 0 || joursPresent <= 0) return null;
  return (joursPresent * salaireMensuel) / joursOuvrables;
}

/** Calcule le salaire journalier : salaire mensuel ÷ jours ouvrables. */
export function calculerSalaireJournalier(salaireMensuel: number | null, joursOuvrables: number): number | null {
  if (salaireMensuel == null || joursOuvrables <= 0) return null;
  return salaireMensuel / joursOuvrables;
}
