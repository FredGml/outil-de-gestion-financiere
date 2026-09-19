
export const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    currencyDisplay: 'code',
  }).format(amount);
  // Supprime les espaces de groupement des milliers (ex: "60 000" -> "60000")
  const numberPart = formatted.replace('XOF', '').trim().replace(/\s/g, '');
  return `${numberPart} F CFA`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR').format(date);
};

export const getISODate = (date: Date = new Date()): string => {
    return date.toISOString().split('T')[0];
}

export const formatCompactCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(amount);
};