import type { AppState, User, BizcochoSelections, HistoryEntry, HistoryParticipant } from '../types';
import { BIZCOCHO_TYPES, SELECTIONS_PER_USER } from '../types';

const LOCAL_STORAGE_KEY = 'bizcochuelos_app_state_v4';

// Backend compartido a través de /api/state (proxy serverless en Vercel, o
// server.js en dev local). El token del Gist vive SOLO en el servidor: el
// cliente nunca lo ve. GET devuelve el estado, POST lo guarda.
const API_URL = '/api/state';

export const createEmptySelections = (): BizcochoSelections => {
  return BIZCOCHO_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as BizcochoSelections);
};

export const getNextWednesday = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

// Fabri compró el 2026-06-24. El próximo es Ignacio.
const INITIAL_STATE: AppState = {
  users: [
    {
      id: 'rodri', name: 'Rodri',
      selections: { 'Vigilante': 1, 'Queso': 1, 'Membrillo': 1, 'Dulce de Leche (ddl)': 1, 'Pan con grasa': 0, 'Panceta': 0, 'Choco': 0, 'Margarita': 0, 'Jamón': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 0
    },
    {
      id: 'fabri', name: 'Fabri',
      selections: { 'Pan con grasa': 1, 'Panceta': 1, 'Choco': 1, 'Vigilante': 1, 'Queso': 0, 'Membrillo': 0, 'Dulce de Leche (ddl)': 0, 'Margarita': 0, 'Jamón': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 1
    },
    {
      id: 'bernardo', name: 'Bernardo',
      selections: { 'Queso': 1, 'Jamón': 1, 'Margarita': 1, 'Membrillo': 1, 'Vigilante': 0, 'Dulce de Leche (ddl)': 0, 'Pan con grasa': 0, 'Panceta': 0, 'Choco': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 0
    },
    {
      id: 'mauri', name: 'Mauri',
      selections: { 'Queso': 1, 'Panceta': 1, 'Dulce de Leche (ddl)': 1, 'Margarita': 1, 'Vigilante': 0, 'Membrillo': 0, 'Pan con grasa': 0, 'Choco': 0, 'Jamón': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 0
    },
    {
      id: 'javier', name: 'Javier',
      selections: { 'Queso': 2, 'Dulce de Leche (ddl)': 1, 'Membrillo': 1, 'Vigilante': 0, 'Pan con grasa': 0, 'Panceta': 0, 'Margarita': 0, 'Choco': 0, 'Jamón': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 1
    },
    {
      id: 'ignacio', name: 'Ignacio',
      selections: { 'Vigilante': 1, 'Membrillo': 1, 'Jamón': 1, 'Queso': 1, 'Dulce de Leche (ddl)': 0, 'Pan con grasa': 0, 'Panceta': 0, 'Choco': 0, 'Margarita': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 0
    }
  ],
  buyerQueue: ['ignacio', 'rodri', 'bernardo', 'mauri', 'javier', 'fabri'],
  lastProcessedWednesday: '2026-06-24',
  lastReviewer: '',
  lastReviewTimestamp: null,
  history: [],
  cemetery: [
    { name: 'Vanessa', month: '2025-06', reason: 'No alimentó la masa madre y se quedó sin fermento.' },
    { name: 'Mati', month: '2025-12', reason: 'Nadie compraba sus bizcochos y murió por hongos.' },
    { name: 'Franco', month: '2026-04', reason: 'Se fue a buscar la receta secreta de la margarita perfecta por el mundo, y se lo comió una víbora en Afganistán.' },
    { name: 'Maxi', month: '2026-05', reason: 'Vio la luz del túnel y la siguió.' },
    { name: 'Fede', month: '2026-06', reason: 'Lo asesinaron sus compañeros: no se sabía si era salado o dulce, y ante la duda no se desayuna.' },
    { name: 'Pablo', month: '2026-07', reason: 'De un día para el otro desapareció, nadie sabe su paradero. Dicen que lo vieron vendiendo nuestros bizcochos con un sombrero con orejas redondas.' },
  ],
};

// ── Sincronización con el backend compartido ───────────────────────────────

// Rellena campos agregados después del primer despliegue, para que estados
// guardados antes de esa fecha (localStorage o Gist viejo) no rompan la app.
const normalizeState = (state: AppState): AppState => {
  if (!Array.isArray(state.history)) state.history = [];
  if (!Array.isArray(state.cemetery)) state.cemetery = [];
  return state;
};

// Bajas históricas de antes de que existiera el Cementerio Harinoso, que
// nunca quedaron registradas porque dbDeleteUser no guardaba ese rastro —
// más los motivos ("epitafios") de cada una, usados también para reparar
// entradas que ya se hayan migrado antes de que existiera el campo `reason`.
const CEMETERY_REASONS: Record<string, string> = {
  'Vanessa': 'No alimentó la masa madre y se quedó sin fermento.',
  'Mati': 'Nadie compraba sus bizcochos y murió por hongos.',
  'Franco': 'Se fue a buscar la receta secreta de la margarita perfecta por el mundo, y se lo comió una víbora en Afganistán.',
  'Maxi': 'Vio la luz del túnel y la siguió.',
  'Fede': 'Lo asesinaron sus compañeros: no se sabía si era salado o dulce, y ante la duda no se desayuna.',
  'Pablo': 'De un día para el otro desapareció, nadie sabe su paradero. Dicen que lo vieron vendiendo nuestros bizcochos con un sombrero con orejas redondas.',
};

const KNOWN_DEPARTURES: { name: string; month: string }[] = [
  { name: 'Vanessa', month: '2025-06' },
  { name: 'Mati', month: '2025-12' },
  { name: 'Franco', month: '2026-04' },
  { name: 'Maxi', month: '2026-05' },
  { name: 'Fede', month: '2026-06' },
  { name: 'Pablo', month: '2026-07' },
];

// De la lista de arriba, los únicos que alguna vez existieron como usuario
// real (con id) en esta app, y por lo tanto los únicos que hay que sacar de
// la lista activa si todavía figuran ahí.
const KNOWN_DEPARTURE_IDS = ['fede', 'pablo'];

// Migración para el estado ya guardado en la nube (o en localStorage) desde
// antes de esta funcionalidad. Cada paso revisa por su cuenta si hace
// falta — así es idempotente sin depender de una única marca de "ya corrió",
// y es seguro correrlo aunque un paso anterior haya sacado a alguien de
// `users` sin llegar a registrar su entrada en el cementerio (pasó una vez:
// no dependas de que ambas cosas ocurran siempre juntas).
//
// IMPORTANTE: igual que checkAndRotateWednesday, esto NUNCA debe llamarse
// sobre una copia local no verificada como fresca — devuelve `true` cuando
// modificó algo, y quien llama decide si corresponde persistir (ver App.tsx).
export const applyCemeteryMigration = (state: AppState): boolean => {
  let changed = false;

  // 1) Asegurar que cada baja conocida tenga su entrada en el cementerio,
  //    exista o no todavía como usuario activo.
  for (const departure of KNOWN_DEPARTURES) {
    if (!state.cemetery.some(entry => entry.name === departure.name)) {
      state.cemetery.push({ ...departure, reason: CEMETERY_REASONS[departure.name] ?? '' });
      changed = true;
    }
  }

  // 2) Sacarlos de la lista activa si todavía figuran ahí.
  for (const id of KNOWN_DEPARTURE_IDS) {
    if (state.users.some(u => u.id === id)) {
      state.users = state.users.filter(u => u.id !== id);
      state.buyerQueue = state.buyerQueue.filter(uid => uid !== id);
      changed = true;
    }
  }

  // 3) Reparar el motivo de cualquier entrada que ya exista sin él (de una
  //    versión anterior a que existiera el campo `reason`).
  for (const entry of state.cemetery) {
    if (!entry.reason && CEMETERY_REASONS[entry.name]) {
      entry.reason = CEMETERY_REASONS[entry.name];
      changed = true;
    }
  }

  return changed;
};

// ── Migración del Balance de Levadura ──────────────────────────────────────
//
// Las 4 primeras entradas del historial (julio 2026) se guardaron antes de que
// existiera el campo `participants`, así que no dicen quién comió qué. Sin eso
// el libro contable no se puede calcular.
//
// El padrón se pudo reconstruir con certeza aritmética, no adivinando: los 4
// pedidos son de 32 bizcochos, y la suma de las elecciones de los 6
// integrantes actuales da 24. La diferencia son exactamente 8 bizcochos
// (Queso 1, ddl 2, Margarita 3, jyq 2) = 2 personas × 4, que son Pablo y Fede
// (Fede seguía contado en los pedidos aunque ya se había ido en junio: la baja
// nunca se había registrado en los datos). Lucía no entra: su id lleva el
// timestamp de su alta, el 2026-07-24, posterior al último miércoles del
// historial.
const JULY_2026_ROSTER = ['rodri', 'fabri', 'bernardo', 'mauri', 'javier', 'ignacio', 'pablo', 'fede'];
const JULY_2026_DATES = ['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22'];

// Nombres de los que ya no están en `users` y por lo tanto no se pueden
// resolver desde el estado actual.
const DEPARTED_NAMES: Record<string, string> = { pablo: 'Pablo', fede: 'Fede' };

// Completa el padrón de las entradas viejas del historial. Idempotente: solo
// toca entradas que no lo tengan, y solo las 4 fechas conocidas — una entrada
// vieja de otra fecha se deja sin padrón a propósito (el ledger la saltea
// entera) en vez de inventarle uno.
//
// IMPORTANTE: igual que applyCemeteryMigration, NUNCA debe llamarse sobre una
// copia local no verificada como fresca. Devuelve `true` si modificó algo y
// quien llama decide si corresponde persistir (ver App.tsx).
export const applyLedgerMigration = (state: AppState): boolean => {
  let changed = false;

  for (const entry of state.history) {
    if (entry.participants && entry.participants.length > 0) continue;
    if (!JULY_2026_DATES.includes(entry.date)) continue;

    const ate = SELECTIONS_PER_USER;
    // Si el total no cierra con el padrón reconstruido, no migramos: preferimos
    // una entrada sin balance antes que un balance mal calculado.
    if (entry.total !== JULY_2026_ROSTER.length * ate) continue;

    entry.participants = JULY_2026_ROSTER.map(id => ({
      id,
      name: state.users.find(u => u.id === id)?.name ?? DEPARTED_NAMES[id] ?? id,
      ate,
    }));
    changed = true;
  }

  return changed;
};

// Aviso simple (sin librería de estado) para que la UI muestre un toast si el
// guardado a la nube falla — antes fallaba en silencio y el usuario creía que
// había guardado cuando en realidad no.
type SyncErrorListener = (message: string) => void;
const syncErrorListeners = new Set<SyncErrorListener>();

export const onSyncError = (listener: SyncErrorListener): (() => void) => {
  syncErrorListeners.add(listener);
  return () => syncErrorListeners.delete(listener);
};

const notifySyncError = (message: string): void => {
  syncErrorListeners.forEach(listener => listener(message));
};

// Error de sincronización: la mutación NO quedó guardada en ningún lado. Se
// lanza a propósito en vez de guardar solo localmente. Un guardado local que
// nunca llega a la nube es peor que un error: la persona ve su cambio aplicado,
// el resto del grupo no lo ve nunca, y el siguiente refresco (que trae el
// estado compartido) lo borra sin avisar.
export class SyncError extends Error {
  readonly outdatedClient: boolean;
  constructor(message: string, outdatedClient = false) {
    super(message);
    this.name = 'SyncError';
    this.outdatedClient = outdatedClient;
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// ── Lectura ────────────────────────────────────────────────────────────────

// Resultado de leer la nube. Distinguir "no hay nada guardado" de "no se pudo
// leer" no es un detalle: son los dos casos en los que antes se devolvía null,
// y confundirlos es lo que llevaba a tratar un backend caído como una base
// vacía y escribirle encima el estado semilla.
export type CloudRead =
  | { ok: true; state: AppState | null }
  | { ok: false; error: string };

export const pullFromCloud = async (): Promise<CloudRead> => {
  let res: Response;
  try {
    // Cache-busting para traer siempre la última versión
    res = await fetch(`${API_URL}?t=${Date.now()}`, { cache: 'no-store' });
  } catch (err) {
    return { ok: false, error: `Sin conexión: ${String(err)}` };
  }

  if (!res.ok) {
    return { ok: false, error: `El servidor respondió ${res.status}` };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    return { ok: false, error: `Respuesta ilegible: ${String(err)}` };
  }

  if (data === null || data === undefined) return { ok: true, state: null };
  return { ok: true, state: normalizeState(data as AppState) };
};

// ── Escritura ──────────────────────────────────────────────────────────────

type CloudWrite =
  | { ok: true; rev: number }
  | { ok: false; conflict: true; state: AppState | null }
  | { ok: false; conflict: false; error: string; outdatedClient: boolean };

// Manda el estado con la `rev` sobre la que se calculó. El servidor solo
// escribe si esa `rev` sigue siendo la actual (ver api/state.js).
// `expectedRev === null` significa "creo que la nube está vacía".
const pushToCloud = async (state: AppState, expectedRev: number | null): Promise<CloudWrite> => {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRev, state }),
    });
  } catch (err) {
    return { ok: false, conflict: false, error: `Sin conexión: ${String(err)}`, outdatedClient: false };
  }

  let body: { rev?: number; state?: AppState; error?: string; outdatedClient?: boolean } = {};
  try { body = await res.json(); } catch { /* respuesta sin cuerpo útil */ }

  if (res.ok) return { ok: true, rev: typeof body.rev === 'number' ? body.rev : 0 };

  if (res.status === 409) {
    return { ok: false, conflict: true, state: body.state ? normalizeState(body.state) : null };
  }

  return {
    ok: false,
    conflict: false,
    error: body.error ?? `El servidor respondió ${res.status}`,
    outdatedClient: res.status === 426 || body.outdatedClient === true,
  };
};

// ── Local storage ──────────────────────────────────────────────────────────

// Última copia CONOCIDA de la nube, para pintar algo instantáneo al abrir la
// app. Nunca es fuente de verdad: no se usa como base de ninguna escritura
// (eso lo garantiza la `rev`, que solo asigna el servidor).
export const getCachedState = (): AppState | null => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return null;
    return normalizeState(JSON.parse(data));
  } catch {
    return null;
  }
};

// Estado semilla para el primer render de un dispositivo que todavía no sabe
// nada. NO es dato real y no se sube nunca por esta vía: solo se muestra
// mientras llega la respuesta de la nube.
export const getPlaceholderState = (): AppState => getCachedState() ?? clone(INITIAL_STATE);

export const cacheStateLocally = (state: AppState): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

// ── Mutaciones ─────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 4;

// Toda mutación se expresa como "aplicá este cambio sobre el estado actual",
// no como "guardá este estado". La diferencia es la que arregla el bug: si
// alguien guardó en el medio, se reaplica el cambio sobre el estado nuevo y se
// reintenta, en vez de subir un documento entero calculado sobre datos viejos
// (que borraba el cambio del otro).
const mutate = async (apply: (state: AppState) => void): Promise<AppState> => {
  let read: CloudRead = await pullFromCloud();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (!read.ok) {
      const message = 'No se pudo guardar: no hay conexión con el servidor. Probá de nuevo.';
      notifySyncError(message);
      throw new SyncError(read.error);
    }

    // La nube vacía es el único caso en el que la semilla es dato legítimo, y
    // el servidor lo verifica de nuevo antes de aceptarlo (expectedRev null
    // solo se acepta si el documento realmente está vacío).
    const base = read.state ?? clone(INITIAL_STATE);
    const expectedRev = read.state ? read.state.rev ?? 0 : null;

    const next = normalizeState(clone(base));
    apply(next);

    const write = await pushToCloud(next, expectedRev);

    if (write.ok) {
      const saved = { ...next, rev: write.rev };
      cacheStateLocally(saved);
      return saved;
    }

    if (write.conflict) {
      // Alguien guardó primero. Volvemos a arrancar del estado que ganó.
      read = write.state ? { ok: true, state: write.state } : await pullFromCloud();
      continue;
    }

    const message = write.outdatedClient
      ? 'Tenés una versión vieja de la app abierta. Recargá la página para poder guardar.'
      : 'No se pudo guardar en la nube. Tu cambio no quedó registrado.';
    notifySyncError(message);
    throw new SyncError(write.error, write.outdatedClient);
  }

  const message = 'Hay mucha actividad en este momento y no se pudo guardar. Probá de nuevo.';
  notifySyncError(message);
  throw new SyncError('Demasiados conflictos consecutivos');
};

// Guarda un estado ya calculado (rotación de miércoles, migraciones) usando la
// `rev` que ese estado trae de la nube. Si perdió la carrera contra otro
// dispositivo simplemente no reintenta: el otro ya hizo el mismo trabajo.
export const persistDerivedState = async (state: AppState): Promise<AppState | null> => {
  const write = await pushToCloud(state, state.rev ?? 0);
  if (write.ok) {
    const saved = { ...state, rev: write.rev };
    cacheStateLocally(saved);
    return saved;
  }
  if (!write.conflict && write.outdatedClient) {
    notifySyncError('Tenés una versión vieja de la app abierta. Recargá la página.');
  }
  return null;
};

// Siembra la nube la primera vez, y SOLO si de verdad está vacía. El servidor
// vuelve a verificarlo (expectedRev null contra documento vacío), así que dos
// dispositivos arrancando a la vez no se pisan.
export const seedCloudIfEmpty = async (): Promise<AppState | null> => {
  const seed = clone(INITIAL_STATE);
  const write = await pushToCloud(seed, null);
  if (!write.ok) return null;
  const saved = { ...seed, rev: write.rev };
  cacheStateLocally(saved);
  return saved;
};

// ── Domain logic ───────────────────────────────────────────────────────────

// Función pura: rota la cola si corresponde y devuelve un estado NUEVO, pero
// NUNCA guarda por su cuenta. Guardar acá sería peligroso: si a esta función se
// le pasa una copia local vieja (de un dispositivo que no abría la app hace
// tiempo), guardar de inmediato pisaría en la nube los cambios más recientes de
// otros usuarios que ese dispositivo nunca llegó a ver. Quien llama decide si
// corresponde persistir, y solo debería hacerlo cuando el estado de partida
// vino fresco de la nube.
//
// Clona antes de tocar nada: recibía el estado y lo mutaba en el lugar, así que
// quien llamaba con un spread superficial ({ ...cloudState }) igual se quedaba
// con los arrays originales modificados y no podía comparar antes/después.
export const checkAndRotateWednesday = (input: AppState): AppState => {
  const state = clone(input);
  const todayStr = new Date().toISOString().split('T')[0];
  let currentWednesday = state.lastProcessedWednesday;
  let nextWednesday = getNextWednesday(currentWednesday);
  let stateChanged = false;

  if (!Array.isArray(state.history)) state.history = [];

  // Solo rotamos por miércoles que ya quedaron ESTRICTAMENTE en el pasado.
  // Usar "<" (no "<=") evita adelantar el turno el propio miércoles de compra:
  // el comprador de hoy sigue siendo el head hasta que el día termina.
  while (nextWednesday < todayStr) {
    if (state.buyerQueue.length > 0) {
      const buyerId = state.buyerQueue.shift();
      if (buyerId) {
        state.buyerQueue.push(buyerId);
        const buyerUser = state.users.find(u => u.id === buyerId);
        if (buyerUser) {
          buyerUser.comprasCount = (buyerUser.comprasCount || 0) + 1;

          // Guardamos una foto del pedido de esa semana para el historial:
          // el desglose por tipo (para la panadería) y el padrón por persona
          // (para el Balance de Levadura). Se registra a todo el grupo,
          // incluido quien todavía no eligió sus bizcochos — figura con 0,
          // que es exactamente lo que comió esa semana.
          const items: HistoryEntry['items'] = {};
          const participants: HistoryParticipant[] = [];
          let total = 0;
          state.users.forEach(user => {
            let ate = 0;
            BIZCOCHO_TYPES.forEach(type => {
              const count = user.selections[type] || 0;
              if (count > 0) {
                items[type] = (items[type] || 0) + count;
                total += count;
                ate += count;
              }
            });
            participants.push({ id: user.id, name: user.name, ate });
          });

          const entry: HistoryEntry = { date: nextWednesday, buyerId, buyerName: buyerUser.name, items, total, participants };
          state.history.push(entry);
          // El historial es el libro contable del Balance de Levadura, así que
          // recortarlo corre los balances en silencio. El tope es alto a
          // propósito (~10 años); el que se limita es el renderizado, no el
          // dato (ver History.tsx).
          if (state.history.length > 520) state.history.shift();
        }
      }
      stateChanged = true;
    }
    currentWednesday = nextWednesday;
    nextWednesday = getNextWednesday(currentWednesday);
  }

  if (stateChanged) {
    state.lastProcessedWednesday = currentWednesday;
  }

  return state;
};

// Alta nueva: entra a la cola en 2° lugar (no compra el próximo miércoles,
// le toca el siguiente) y queda "needsOnboarding" hasta que ella misma elija
// sus 4 bizcochos al ingresar por primera vez.
export const dbAddUser = async (name: string): Promise<AppState> =>
  mutate(state => {
    const newId = `user-${Date.now()}`;
    const newUser: User = {
      id: newId, name: name.trim(), selections: createEmptySelections(),
      ingresosCount: 0, comprasCount: 0, needsOnboarding: true,
    };
    state.users.push(newUser);
    if (state.buyerQueue.length >= 2) state.buyerQueue.splice(1, 0, newId);
    else state.buyerQueue.push(newId);
  });

export const dbUpdateUserSelections = async (userId: string, selections: BizcochoSelections): Promise<AppState> =>
  mutate(state => {
    const user = state.users.find(u => u.id === userId);
    // Si en el ínterin lo dieron de baja, no lo resucitamos.
    if (user) user.selections = { ...selections };
  });

export const dbCompleteOnboarding = async (userId: string, selections: BizcochoSelections): Promise<AppState> =>
  mutate(state => {
    const user = state.users.find(u => u.id === userId);
    if (user) {
      user.selections = { ...selections };
      user.needsOnboarding = false;
    }
  });

// Gestión manual de turnos: reordenar la cola (para saltear a alguien de
// vacaciones o hacer un swap entre dos integrantes). No toca comprasCount,
// porque nadie compró todavía.
export const dbReorderQueue = async (newQueue: string[]): Promise<AppState> =>
  mutate(state => {
    // La cola se reordena sobre el estado que el usuario tenía en pantalla, que
    // pudo quedar viejo. Nos quedamos con el orden pedido pero solo para la
    // gente que sigue existiendo, y no perdemos a nadie que se haya sumado en
    // el medio (va al final en vez de desaparecer de la cola).
    const alive = new Set(state.users.map(u => u.id));
    const requested = newQueue.filter(id => alive.has(id));
    const missing = state.buyerQueue.filter(id => alive.has(id) && !requested.includes(id));
    const added = state.users.map(u => u.id).filter(id => !requested.includes(id) && !missing.includes(id));
    state.buyerQueue = [...requested, ...missing, ...added];
  });

export const dbDeleteUser = async (userId: string, reason: string): Promise<AppState> =>
  mutate(state => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return; // ya lo dieron de baja desde otro dispositivo
    state.cemetery.push({ name: user.name, month: new Date().toISOString().slice(0, 7), reason });
    state.users = state.users.filter(u => u.id !== userId);
    state.buyerQueue = state.buyerQueue.filter(id => id !== userId);
  });

export const dbRecordUserVisit = async (userId: string): Promise<AppState> =>
  mutate(state => {
    const user = state.users.find(u => u.id === userId);
    if (user) {
      user.ingresosCount = (user.ingresosCount || 0) + 1;
      state.lastReviewer = user.name;
      state.lastReviewTimestamp = new Date().toISOString();
    }
  });
