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
