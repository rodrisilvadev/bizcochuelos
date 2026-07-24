import type { AppState, User, BizcochoSelections, HistoryEntry } from '../types';
import { BIZCOCHO_TYPES } from '../types';

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
      id: 'pablo', name: 'Pablo',
      selections: { 'Dulce de Leche (ddl)': 2, 'Queso': 1, 'Margarita': 1, 'Vigilante': 0, 'Membrillo': 0, 'Pan con grasa': 0, 'Panceta': 0, 'Choco': 0, 'Jamón': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 0
    },
    {
      id: 'bernardo', name: 'Bernardo',
      selections: { 'Queso': 1, 'Jamón': 1, 'Margarita': 1, 'Membrillo': 1, 'Vigilante': 0, 'Dulce de Leche (ddl)': 0, 'Pan con grasa': 0, 'Panceta': 0, 'Choco': 0, 'Jamón y queso (jyq)': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 0
    },
    {
      id: 'fede', name: 'Fede',
      selections: { 'Margarita': 2, 'Jamón y queso (jyq)': 2, 'Vigilante': 0, 'Queso': 0, 'Membrillo': 0, 'Dulce de Leche (ddl)': 0, 'Pan con grasa': 0, 'Panceta': 0, 'Choco': 0, 'Jamón': 0, 'Salado común': 0, 'Chicharrones': 0 },
      ingresosCount: 0, comprasCount: 1
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
  buyerQueue: ['ignacio', 'rodri', 'pablo', 'bernardo', 'mauri', 'fede', 'javier', 'fabri'],
  lastProcessedWednesday: '2026-06-24',
  lastReviewer: '',
  lastReviewTimestamp: null,
  history: []
};

// ── Sincronización con el backend compartido ───────────────────────────────

// Rellena campos agregados después del primer despliegue, para que estados
// guardados antes de esa fecha (localStorage o Gist viejo) no rompan la app.
const normalizeState = (state: AppState): AppState => {
  if (!Array.isArray(state.history)) state.history = [];
  return state;
};

export const loadFromCloud = async (): Promise<AppState | null> => {
  try {
    // Cache-busting para traer siempre la última versión
    const res = await fetch(`${API_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    return normalizeState(data as AppState);
  } catch {
    return null;
  }
};

const syncToCloud = (state: AppState): void => {
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
    .then(res => {
      if (!res.ok) console.error('Bizcochuelos: no se pudo guardar en la nube (status ' + res.status + ')');
    })
    .catch(err => console.error('Bizcochuelos: no se pudo guardar en la nube', err));
};

// ── Local storage ──────────────────────────────────────────────────────────

export const getAppState = (): AppState => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      saveAppState(INITIAL_STATE);
      return INITIAL_STATE;
    }
    return normalizeState(JSON.parse(data));
  } catch {
    return INITIAL_STATE;
  }
};

// Solo cachea localmente, sin volver a subir a la nube. Se usa para reflejar
// en localStorage lo que ya trajimos del servidor (polling, carga inicial),
// para que una mutación posterior no parta de una copia local vieja y pise
// cambios de otros usuarios que ya están en pantalla pero nunca se guardaron
// en este dispositivo.
export const cacheStateLocally = (state: AppState): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

export const saveAppState = (state: AppState): void => {
  cacheStateLocally(state);
  syncToCloud(state);
};

// Antes de cualquier mutación, traemos el estado más fresco posible: la nube
// es la fuente de verdad compartida entre todos los usuarios. Si la nube no
// responde (offline, error de red), recién ahí caemos a la copia local.
const getFreshState = async (): Promise<AppState> => {
  const cloudState = await loadFromCloud();
  if (cloudState) {
    cacheStateLocally(cloudState);
    return cloudState;
  }
  return getAppState();
};

// ── Domain logic ───────────────────────────────────────────────────────────

export const checkAndRotateWednesday = (state: AppState): AppState => {
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

          // Guardamos una foto del pedido de esa semana para el historial.
          const items: HistoryEntry['items'] = {};
          let total = 0;
          state.users.forEach(user => {
            BIZCOCHO_TYPES.forEach(type => {
              const count = user.selections[type] || 0;
              if (count > 0) {
                items[type] = (items[type] || 0) + count;
                total += count;
              }
            });
          });

          const entry: HistoryEntry = { date: nextWednesday, buyerId, buyerName: buyerUser.name, items, total };
          state.history.push(entry);
          if (state.history.length > 60) state.history.shift();
        }
      }
      stateChanged = true;
    }
    currentWednesday = nextWednesday;
    nextWednesday = getNextWednesday(currentWednesday);
  }

  if (stateChanged) {
    state.lastProcessedWednesday = currentWednesday;
    saveAppState(state);
  }

  return state;
};

// Alta nueva: entra a la cola en 2° lugar (no compra el próximo miércoles,
// le toca el siguiente) y queda "needsOnboarding" hasta que ella misma elija
// sus 4 bizcochos al ingresar por primera vez.
export const dbAddUser = async (name: string): Promise<AppState> => {
  const state = await getFreshState();
  const newId = `user-${Date.now()}`;
  const newUser: User = {
    id: newId, name: name.trim(), selections: createEmptySelections(),
    ingresosCount: 0, comprasCount: 0, needsOnboarding: true,
  };
  state.users.push(newUser);
  if (state.buyerQueue.length >= 2) state.buyerQueue.splice(1, 0, newId);
  else state.buyerQueue.push(newId);
  saveAppState(state);
  return state;
};

export const dbUpdateUserSelections = async (userId: string, selections: BizcochoSelections): Promise<AppState> => {
  const state = await getFreshState();
  const user = state.users.find(u => u.id === userId);
  if (user) { user.selections = selections; saveAppState(state); }
  return state;
};

export const dbCompleteOnboarding = async (userId: string, selections: BizcochoSelections): Promise<AppState> => {
  const state = await getFreshState();
  const user = state.users.find(u => u.id === userId);
  if (user) {
    user.selections = selections;
    user.needsOnboarding = false;
    saveAppState(state);
  }
  return state;
};

// Gestión manual de turnos: reordenar la cola (para saltear a alguien de
// vacaciones o hacer un swap entre dos integrantes). No toca comprasCount,
// porque nadie compró todavía.
export const dbReorderQueue = async (newQueue: string[]): Promise<AppState> => {
  const state = await getFreshState();
  state.buyerQueue = newQueue;
  saveAppState(state);
  return state;
};

export const dbDeleteUser = async (userId: string): Promise<AppState> => {
  const state = await getFreshState();
  state.users = state.users.filter(u => u.id !== userId);
  state.buyerQueue = state.buyerQueue.filter(id => id !== userId);
  saveAppState(state);
  return state;
};

export const dbRecordUserVisit = async (userId: string): Promise<AppState> => {
  const state = await getFreshState();
  const user = state.users.find(u => u.id === userId);
  if (user) {
    user.ingresosCount = (user.ingresosCount || 0) + 1;
    state.lastReviewer = user.name;
    state.lastReviewTimestamp = new Date().toISOString();
    saveAppState(state);
  }
  return state;
};
