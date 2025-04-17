export const companyTypes = [
  'Underentreprenör',
  'Totalentreprenör',
  'Beställare'
] as const;

export const contractorTypes = [
  'Avfallshantering',
  'Betong',
  'Brandtätning & brandskydd',
  'El',
  'Golv',
  'Hiss',
  'Kök',
  'Kran',
  'Lås',
  'Mark',
  'Måleri',
  'Mur & Puts',
  'Plåt',
  'Rivning & sanering',
  'Bygg',
  'Solceller',
  'Städning',
  'Stommontering',
  'Ställning',
  'Styr',
  'Tak',
  'Ventilation',
  'VS',
  'Övrigt'
] as const;

// Enum för Prisma schema (matchar companyTypes)
export enum CompanyType {
  UNDERENTREPRENÖR = 'Underentreprenör',
  TOTALENTREPRENÖR = 'Totalentreprenör',
  BESTÄLLARE = 'Beställare',
} 