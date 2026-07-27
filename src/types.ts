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

// Cantidad de bizcochos que cada integrante elige (onboarding y edición).
export const SELECTIONS_PER_USER = 4;

export interface User {
  id: string;
  name: string;
  selections: BizcochoSelections;
  ingresosCount: number; // Number of times the user selected themselves on entry
  comprasCount: number;  // Number of times the user has bought bizcochos
  needsOnboarding?: boolean; // True solo para altas nuevas: aún no eligió sus 4 bizcochos
}

// Quién estaba en el grupo un miércoles dado y cuánto comió ese día. Se guarda
// el nombre además del id porque el Balance de Levadura tiene que poder mostrar
// a gente que ya se fue del grupo (y que por lo tanto ya no está en `users`).
export interface HistoryParticipant {
  id: string;
  name: string;
  ate: number; // Bizcochos que consumió esa semana
}

export interface HistoryEntry {
  date: string; // Miércoles al que corresponde el pedido (YYYY-MM-DD)
  buyerId: string;
  buyerName: string;
  items: Partial<Record<BizcochoType, number>>;
  total: number;
  // Padrón de esa semana. Opcional solo por compatibilidad con entradas
  // guardadas antes de que existiera el Balance de Levadura; la migración
  // `applyLedgerMigration` lo completa. Invariante: suma de `ate` === `total`.
  participants?: HistoryParticipant[];
}

// Una fila del Balance de Levadura. Se calcula a partir del historial (ver
// services/ledger.ts), nunca se guarda en el estado: es un valor derivado.
export interface LedgerRow {
  id: string;
  name: string;
  puso: number;    // Bizcochos que aportó (suma de los pedidos que le tocó comprar)
  comio: number;   // Bizcochos que consumió en las semanas que estuvo
  balance: number; // puso − comió. Positivo = acreedor, negativo = deudor
  compras: number; // Cantidad de miércoles que le tocó comprar (dentro del libro)
  semanas: number; // Cantidad de miércoles cerrados en los que estuvo en el grupo
  activo: boolean; // Si sigue en el grupo (false = está en el Cementerio)
  // Compras de toda su historia, incluidas las anteriores al inicio del libro
  // (viene de `comprasCount`). No entra en el balance — que solo puede contar
  // lo que tiene registro completo — pero sí se usa para desempatar: entre dos
  // personas con el mismo balance, debe primero la que menos veces compró.
  comprasTotales: number;
}

// Registro del Cementerio Harinoso: integrantes dados de baja, con el mes en
// que se fueron del grupo.
export interface CemeteryEntry {
  name: string;
  month: string; // Mes de la baja (YYYY-MM)
  reason: string; // Epitafio / causa de la baja
}

export interface AppState {
  users: User[];
  buyerQueue: string[]; // Array of User IDs. First ID is the current buyer.
  lastProcessedWednesday: string; // Date of the last processed Wednesday (YYYY-MM-DD)
  lastReviewer: string; // Who was the last reviewer registered
  lastReviewTimestamp: string | null;
  history: HistoryEntry[]; // Pedidos de miércoles pasados, más reciente al final
  cemetery: CemeteryEntry[]; // Bajas del grupo, más reciente al final
}
