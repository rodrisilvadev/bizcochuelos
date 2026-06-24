export type BizcochoType =
  | 'Vigilante'
  | 'Queso'
  | 'Membrillo'
  | 'Dulce de Leche (ddl)'
  | 'Pan con grasa'
  | 'Panceta'
  | 'Choco'
  | 'Margarita'
  | 'Jamón'
  | 'Jamón y queso (jyq)'
  | 'Salado común'
  | 'Chicharrones';

export const BIZCOCHO_TYPES: BizcochoType[] = [
  'Vigilante',
  'Queso',
  'Membrillo',
  'Dulce de Leche (ddl)',
  'Pan con grasa',
  'Panceta',
  'Choco',
  'Margarita',
  'Jamón',
  'Jamón y queso (jyq)',
  'Salado común',
  'Chicharrones'
];

export type BizcochoSelections = Record<BizcochoType, number>;

export interface User {
  id: string;
  name: string;
  selections: BizcochoSelections;
  ingresosCount: number; // Number of times the user selected themselves on entry
  comprasCount: number;  // Number of times the user has bought bizcochos
}

export interface AppState {
  users: User[];
  buyerQueue: string[]; // Array of User IDs. First ID is the current buyer.
  lastProcessedWednesday: string; // Date of the last processed Wednesday (YYYY-MM-DD)
  lastReviewer: string; // Who was the last reviewer registered
  lastReviewTimestamp: string | null;
}
