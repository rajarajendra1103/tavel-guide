export const getCurrencySymbol = (country?: string, fallbackSymbol: string = '$'): string => {
  if (!country) return fallbackSymbol;
  const c = country.toLowerCase().trim();
  
  if (c === 'usa' || c === 'united states' || c === 'united states of america' || c === 'us') return '$';
  if (c === 'japan' || c === 'jp') return '¥';
  if (c === 'india' || c === 'in') return '₹';
  if (c === 'united kingdom' || c === 'uk' || c === 'great britain' || c === 'england') return '£';
  
  // Eurozone countries
  const euroCountries = [
    'france', 'italy', 'germany', 'spain', 'netherlands', 'belgium', 'greece', 
    'portugal', 'ireland', 'austria', 'finland', 'cyprus', 'estonia', 'latvia', 
    'lithuania', 'luxembourg', 'malta', 'slovakia', 'slovenia', 'croatia', 'europe'
  ];
  if (euroCountries.includes(c)) return '€';
  
  return fallbackSymbol;
};
