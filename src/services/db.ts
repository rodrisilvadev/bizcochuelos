import type { AppState, User, BizcochoSelections } from '../types';
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
  lastReviewTimestamp: null
};

// ── Sincronización con el backend compartido ───────────────────────────────

export const loadFromCloud = async (): Promise<AppState | null> => {
  try {
    // Cache-busting para traer siempre la última versión
    const res = await fetch(`${API_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    return data as AppState;
  } catch {
    return null;
  }
};

const syncToCloud = (state: AppState): void => {
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).catch(() => {});
};

// ── Local storage ──────────────────────────────────────────────────────────

export const getAppState = (): AppState => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      saveAppState(INITIAL_STATE);
      return INITIAL_STATE;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_STATE;
  }
};

export const saveAppState = (state: AppState): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    syncToCloud(state);
  } catch {
    // ignore
  }
};

// ── Domain logic ───────────────────────────────────────────────────────────

export const checkAndRotateWednesday = (state: AppState): AppState => {
  const todayStr = new Date().toISOString().split('T')[0];
  let currentWednesday = state.lastProcessedWednesday;
  let nextWednesday = getNextWednesday(currentWednesday);
  let stateChanged = false;

  // Solo rotamos por miércoles que ya quedaron ESTRICTAMENTE en el pasado.
  // Usar "<" (no "<=") evita adelantar el turno el propio miércoles de compra:
  // el comprador de hoy sigue siendo el head hasta que el día termina.
  while (nextWednesday < todayStr) {
    if (state.buyerQueue.length > 0) {
      const buyerId = state.buyerQueue.shift();
      if (buyerId) {
        state.buyerQueue.push(buyerId);
        const buyerUser = state.users.find(u => u.id === buyerId);
        if (buyerUser) buyerUser.comprasCount = (buyerUser.comprasCount || 0) + 1;
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

export const dbAddUser = (name: string, selections: BizcochoSelections): AppState => {
  const state = getAppState();
  const newId = `user-${Date.now()}`;
  const newUser: User = { id: newId, name: name.trim(), selections, ingresosCount: 0, comprasCount: 0 };
  state.users.push(newUser);
  if (state.buyerQueue.length >= 2) state.buyerQueue.splice(1, 0, newId);
  else state.buyerQueue.push(newId);
  saveAppState(state);
  return state;
};

export const dbUpdateUserSelections = (userId: string, selections: BizcochoSelections): AppState => {
  const state = getAppState();
  const user = state.users.find(u => u.id === userId);
  if (user) { user.selections = selections; saveAppState(state); }
  return state;
};

export const dbDeleteUser = (userId: string): AppState => {
  const state = getAppState();
  state.users = state.users.filter(u => u.id !== userId);
  state.buyerQueue = state.buyerQueue.filter(id => id !== userId);
  saveAppState(state);
  return state;
};

export const dbRecordUserVisit = (userId: string): AppState => {
  const state = getAppState();
  const user = state.users.find(u => u.id === userId);
  if (user) {
    user.ingresosCount = (user.ingresosCount || 0) + 1;
    state.lastReviewer = user.name;
    state.lastReviewTimestamp = new Date().toISOString();
    saveAppState(state);
  }
  return state;
};
