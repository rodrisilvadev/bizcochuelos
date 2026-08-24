// El catálogo de bizcochos vive en el estado compartido (se edita desde el
// panel de administración), así que un tipo de bizcocho es cualquier string.
// El alias se mantiene porque nombra la intención en las firmas.
export type BizcochoType = string;

// Un ítem del catálogo. La identidad es el `name`: es lo que se guarda en las
// selecciones de cada persona y en el desglose del historial, así que renombrar
// un ítem sería renombrar dato viejo — por eso el panel no deja renombrar.
export interface CatalogItem {
  name: BizcochoType;
  precio: number; // Pesos por unidad. Es lo único que carga quien administra.
}

// ── La unidad de medida: puntos ────────────────────────────────────────────
//
// Hasta ahora todos los bizcochos valían lo mismo, así que "4 bizcochos por
// persona" alcanzaba como presupuesto. Con el pan tortuga integral eso se
// rompe: sale 30 en vez de 25, o sea que donde entran 4 bizcochos comunes
// entran 3 tortugas. Contar unidades trataría esas dos elecciones como
// distintas cuando cuestan lo mismo.
//
// La unidad correcta es la fracción del presupuesto semanal que ocupa cada
// cosa. Se expresa en PUNTOS: cada persona tiene 12 por semana, y cada ítem
// cuesta `round(precio × 12 / presupuesto)` puntos. Con presupuesto 100:
//
//   bizcocho común ($25) → 3 puntos  →  4 por semana
//   pan tortuga    ($30) → 4 puntos  →  3 por semana
//
// Los puntos son RELATIVOS al presupuesto, no absolutos en pesos. Eso importa
// para el Balance de Levadura, que es un libro contable histórico: si mañana
// todo aumenta y se suben precio y presupuesto juntos, los puntos no se mueven
// y los balances viejos siguen significando lo mismo. Un libro en pesos se
// distorsionaría con cada aumento.
export const PUNTOS_POR_PERSONA = 12;

// Cuánto sale, aproximadamente, lo que come una persona por semana. Es el
// divisor que convierte precios en puntos; se guarda en el estado y se puede
// actualizar junto con los precios cuando aumenten.
export const PRESUPUESTO_PESOS_DEFAULT = 100;

// Lo que vale un bizcocho común: 3 puntos, o sea 4 por semana. Se usa como
// unidad de conversión para el historial anterior al catálogo, que está
// contado en unidades y donde todo costaba lo mismo.
export const PUNTOS_BIZCOCHO_COMUN = 3;

// El catálogo con el que arranca el grupo. Los 12 de siempre a $25, más el pan
// tortuga integral a $30 que pidió Javier. A partir de acá se edita desde la
// app: esta lista solo siembra.
export const DEFAULT_CATALOG: CatalogItem[] = [
  { name: 'Vigilante', precio: 25 },
  { name: 'Queso', precio: 25 },
  { name: 'Membrillo', precio: 25 },
  { name: 'Dulce de Leche (ddl)', precio: 25 },
  { name: 'Pan con grasa', precio: 25 },
  { name: 'Panceta', precio: 25 },
  { name: 'Choco', precio: 25 },
  { name: 'Margarita', precio: 25 },
  { name: 'Jamón', precio: 25 },
  { name: 'Jamón y queso (jyq)', precio: 25 },
  { name: 'Salado común', precio: 25 },
  { name: 'Chicharrones', precio: 25 },
  { name: 'Pan tortuga integral', precio: 30 },
];

// Versión de la lista semilla. La migración solo agrega los ítems que
// introdujo una versión posterior a la que el estado guardado ya vio, así que
// un ítem borrado a mano desde el panel no vuelve a aparecer solo.
//   1 = los 12 originales
//   2 = + Pan tortuga integral
export const CATALOG_VERSION = 2;
export const CATALOG_V2_ITEMS = ['Pan tortuga integral'];

export type BizcochoSelections = Record<BizcochoType, number>;

export interface User {
  id: string;
  name: string;
  selections: BizcochoSelections;
  ingresosCount: number; // Number of times the user selected themselves on entry
  comprasCount: number;  // Number of times the user has bought bizcochos
  needsOnboarding?: boolean; // True solo para altas nuevas: aún no eligió sus bizcochos
}

// Quién estaba en el grupo un miércoles dado y cuánto comió ese día. Se guarda
// el nombre además del id porque el Balance de Levadura tiene que poder mostrar
// a gente que ya se fue del grupo (y que por lo tanto ya no está en `users`).
export interface HistoryParticipant {
  id: string;
  name: string;
  ate: number; // Unidades que se llevó esa semana (lo que cuenta la panadería)
  // Lo mismo medido en puntos, que es lo que usa el Balance de Levadura.
  // Opcional solo para entradas guardadas antes de que existieran los puntos;
  // ahí vale `ate × PUNTOS_BIZCOCHO_COMUN`, que es exacto porque en esa época
  // todos los bizcochos costaban lo mismo.
  puntos?: number;
}

export interface HistoryEntry {
  date: string; // Miércoles al que corresponde el pedido (YYYY-MM-DD)
  buyerId: string;
  buyerName: string;
  items: Partial<Record<BizcochoType, number>>;
  total: number;   // Unidades del pedido
  puntos?: number; // El pedido en puntos. Invariante: === suma de participants.puntos
  // Padrón de esa semana. Opcional solo por compatibilidad con entradas
  // guardadas antes de que existiera el Balance de Levadura; la migración
  // `applyLedgerMigration` lo completa. Invariante: suma de `ate` === `total`.
  participants?: HistoryParticipant[];
}

// Una fila del Balance de Levadura. Se calcula a partir del historial (ver
// services/ledger.ts), nunca se guarda en el estado: es un valor derivado.
// `puso`, `comio` y `balance` van en PUNTOS (12 = una semana completa).
export interface LedgerRow {
  id: string;
  name: string;
  puso: number;    // Puntos que aportó (suma de los pedidos que le tocó comprar)
  comio: number;   // Puntos que consumió en las semanas que estuvo
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

// Quién puede tocar el catálogo y el orden de la cola, y con qué PIN.
//
// El "login" de esta app es elegir tu nombre de una lista: no es una
// credencial, cualquiera puede entrar como cualquiera. El PIN sí lo es, y es
// lo único que de verdad separa las acciones de administración del resto.
// `userIds` decide a quién se le muestra la puerta; el PIN decide quién pasa.
export interface AdminConfig {
  userIds: string[];
  // SHA-256 del PIN con sal fija. `null` = todavía no se configuró ninguno, y
  // el primer administrador que entre lo elige.
  //
  // Un PIN de 4 dígitos hasheado se rompe por fuerza bruta en un instante, y
  // el estado es legible por cualquiera del grupo. Esto no pretende resistir a
  // alguien decidido: evita que se toque el catálogo o la cola sin querer, o
  // por una broma de oficina. Guardarlo hasheado igual es gratis y evita que
  // quede a la vista de quien abra las herramientas del navegador.
  pinHash: string | null;
}

export interface AppState {
  users: User[];
  buyerQueue: string[]; // Array of User IDs. First ID is the current buyer.
  lastProcessedWednesday: string; // Date of the last processed Wednesday (YYYY-MM-DD)
  lastReviewer: string; // Who was the last reviewer registered
  lastReviewTimestamp: string | null;
  history: HistoryEntry[]; // Pedidos de miércoles pasados, más reciente al final
  cemetery: CemeteryEntry[]; // Bajas del grupo, más reciente al final
  catalog: CatalogItem[]; // Qué se puede pedir y a cuánto
  catalogVersion?: number; // Hasta qué versión de la lista semilla se sembró
  presupuestoPesos: number; // Lo que gasta cada persona por semana
  admin: AdminConfig;
  // Versión del documento, la asigna SIEMPRE el servidor. El cliente la manda
  // de vuelta al guardar para que el servidor pueda rechazar la escritura si
  // alguien más guardó en el medio (ver api/state.js). Opcional solo para
  // estados guardados antes de que existiera el versionado, que valen 0.
  rev?: number;
}
