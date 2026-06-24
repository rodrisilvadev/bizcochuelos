import type { AppState, User, BizcochoSelections } from '../types';
import { BIZCOCHO_TYPES } from '../types';

const LOCAL_STORAGE_KEY = 'bizcochuelos_app_state_v3';

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

const INITIAL_STATE: AppState = {
  users: [
    {
      id: 'rodri',
      name: 'Rodri',
      selections: {
        'Vigilante': 1,
        'Queso': 1,
        'Membrillo': 1,
        'Dulce de Leche (ddl)': 1,
        'Pan con grasa': 0,
        'Panceta': 0,
        'Choco': 0,
        'Margarita': 0,
        'Jamón': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'fabri',
      name: 'Fabri',
      selections: {
        'Pan con grasa': 1,
        'Panceta': 1,
        'Choco': 1,
        'Vigilante': 1,
        'Queso': 0,
        'Membrillo': 0,
        'Dulce de Leche (ddl)': 0,
        'Margarita': 0,
        'Jamón': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'pablo',
      name: 'Pablo',
      selections: {
        'Dulce de Leche (ddl)': 2,
        'Queso': 1,
        'Margarita': 1,
        'Vigilante': 0,
        'Membrillo': 0,
        'Pan con grasa': 0,
        'Panceta': 0,
        'Choco': 0,
        'Jamón': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'bernardo',
      name: 'Bernardo',
      selections: {
        'Queso': 1,
        'Jamón': 1,
        'Margarita': 1,
        'Membrillo': 1,
        'Vigilante': 0,
        'Dulce de Leche (ddl)': 0,
        'Pan con grasa': 0,
        'Panceta': 0,
        'Choco': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'fede',
      name: 'Fede',
      selections: {
        'Margarita': 2,
        'Jamón y queso (jyq)': 2,
        'Vigilante': 0,
        'Queso': 0,
        'Membrillo': 0,
        'Dulce de Leche (ddl)': 0,
        'Pan con grasa': 0,
        'Panceta': 0,
        'Choco': 0,
        'Jamón': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'mauri',
      name: 'Mauri',
      selections: {
        'Queso': 1,
        'Panceta': 1,
        'Dulce de Leche (ddl)': 1,
        'Margarita': 1,
        'Vigilante': 0,
        'Membrillo': 0,
        'Pan con grasa': 0,
        'Choco': 0,
        'Jamón': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'javier',
      name: 'Javier',
      selections: {
        'Queso': 2,
        'Dulce de Leche (ddl)': 1,
        'Membrillo': 1,
        'Vigilante': 0,
        'Pan con grasa': 0,
        'Panceta': 0,
        'Margarita': 0,
        'Choco': 0,
        'Jamón': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    },
    {
      id: 'ignacio',
      name: 'Ignacio',
      selections: {
        'Vigilante': 1,
        'Membrillo': 1,
        'Jamón': 1,
        'Queso': 1,
        'Dulce de Leche (ddl)': 0,
        'Pan con grasa': 0,
        'Panceta': 0,
        'Choco': 0,
        'Margarita': 0,
        'Jamón y queso (jyq)': 0,
        'Salado común': 0,
        'Chicharrones': 0
      },
      ingresosCount: 0,
      comprasCount: 0
    }
  ],
  buyerQueue: ['fede', 'javier', 'fabri', 'rodri', 'pablo', 'bernardo', 'mauri', 'ignacio'],
  lastProcessedWednesday: '2026-06-03',
  lastReviewer: '',
  lastReviewTimestamp: null
};

// ── Server sync (fire and forget) ──────────────────────────────────────────

const syncToServer = (state: AppState): void => {
  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).catch(() => {});
};

export const loadFromServer = async (): Promise<AppState | null> => {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return null;
    const data = await res.json();
    return data as AppState | null;
  } catch {
    return null;
  }
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
    syncToServer(state);
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

  while (nextWednesday <= todayStr) {
    if (state.buyerQueue.length > 0) {
      const buyerId = state.buyerQueue.shift();
      if (buyerId) {
        state.buyerQueue.push(buyerId);
        const buyerUser = state.users.find(u => u.id === buyerId);
        if (buyerUser) {
          buyerUser.comprasCount = (buyerUser.comprasCount || 0) + 1;
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

export const dbAddUser = (name: string, selections: BizcochoSelections): AppState => {
  const state = getAppState();
  const newId = `user-${Date.now()}`;
  const newUser: User = {
    id: newId,
    name: name.trim(),
    selections,
    ingresosCount: 0,
    comprasCount: 0
  };

  state.users.push(newUser);

  if (state.buyerQueue.length >= 2) {
    state.buyerQueue.splice(1, 0, newId);
  } else {
    state.buyerQueue.push(newId);
  }

  saveAppState(state);
  return state;
};

export const dbUpdateUserSelections = (userId: string, selections: BizcochoSelections): AppState => {
  const state = getAppState();
  const user = state.users.find(u => u.id === userId);
  if (user) {
    user.selections = selections;
    saveAppState(state);
  }
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
