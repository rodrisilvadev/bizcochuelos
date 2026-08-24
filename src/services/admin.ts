import type { AppState } from '../types';

// ── Puerta de administración ───────────────────────────────────────────────
//
// Dos cosas del grupo no las decide cualquiera: qué se puede pedir (el
// catálogo) y en qué orden se compra (la cola). Todo lo demás sigue abierto.
//
// El modelo es de dos partes, y ninguna alcanza sola:
//
//   `admin.userIds` — a quién se le muestra la puerta. No es seguridad: el
//   login de esta app es elegir tu nombre de una lista, así que cualquiera
//   podría entrar como Rodri. Sirve para que el panel no le aparezca al resto
//   del grupo, que no tiene nada que hacer ahí.
//
//   `admin.pinHash` — quién pasa. Esto sí es la credencial.
//
// Alcance honesto: un PIN corto hasheado con sal fija se rompe por fuerza
// bruta en segundos, y el estado compartido lo puede leer cualquiera del
// grupo. Esto frena el toqueteo casual y los accidentes, no a alguien que se
// lo proponga. Para lo segundo haría falta autenticación de verdad en el
// servidor, que hoy no existe (api/state.js es un proxy sin usuarios).

const SALT = 'bizcochuelos::admin::v1';

// Marca de "ya puse el PIN" para esta pestaña. En sessionStorage y no en
// localStorage a propósito: sobrevive a un F5 mientras trabajás, pero no deja
// la puerta abierta para siempre en un dispositivo compartido.
const UNLOCK_KEY = 'bizcochuelos_admin_unlocked';

export const PIN_MIN_LENGTH = 4;

export const hashPin = async (pin: string): Promise<string> => {
  const data = new TextEncoder().encode(`${SALT}::${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPin = async (pin: string, pinHash: string | null): Promise<boolean> => {
  if (!pinHash) return false;
  return (await hashPin(pin)) === pinHash;
};

// ¿A esta persona le corresponde ver la puerta? Si nadie está configurado como
// administrador (estado viejo, migración a medias) cae en 'rodri', que es el
// dueño de la app — mejor eso que dejar el panel inalcanzable para todos.
export const isAdminUser = (state: AppState, userId: string | null): boolean => {
  if (!userId) return false;
  const ids = state.admin?.userIds?.length ? state.admin.userIds : ['rodri'];
  return ids.includes(userId);
};

export const isUnlocked = (): boolean => {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
};

export const setUnlocked = (value: boolean): void => {
  try {
    if (value) sessionStorage.setItem(UNLOCK_KEY, '1');
    else sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // Navegador sin sessionStorage: el desbloqueo dura lo que dure la pestaña
    // en memoria, que es aceptable.
  }
};
