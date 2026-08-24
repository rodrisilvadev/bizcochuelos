import React, { useState } from 'react';
import { hashPin, verifyPin, PIN_MIN_LENGTH } from '../services/admin';
import { KeyRound, Lock, X, AlertCircle } from 'lucide-react';

interface PinModalProps {
  // `null` = todavía no hay PIN configurado, así que este modal lo crea en vez
  // de pedirlo. Es el arranque del primer administrador.
  pinHash: string | null;
  onUnlock: () => void;
  onCreate: (hash: string) => Promise<boolean>;
  onClose: () => void;
}

// La puerta de las dos acciones bajo llave: tocar el catálogo y reordenar la
// cola. Ver services/admin.ts para el alcance real de esta protección.
export const PinModal: React.FC<PinModalProps> = ({ pinHash, onUnlock, onCreate, onClose }) => {
  const creating = pinHash === null;

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Solo dígitos: el teclado numérico del celular y la validación tienen que
  // hablar del mismo alfabeto.
  const clean = (value: string) => value.replace(/\D/g, '').slice(0, 8);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (pin.length < PIN_MIN_LENGTH) {
      setError(`El PIN tiene que tener al menos ${PIN_MIN_LENGTH} dígitos.`);
      return;
    }

    setBusy(true);
    try {
      if (creating) {
        if (pin !== confirm) {
          setError('Los dos PIN no coinciden.');
          return;
        }
        const ok = await onCreate(await hashPin(pin));
        // Si el guardado falló, db.ts ya mostró el toast. Acá lo importante es
        // NO desbloquear: la puerta quedaría abierta con un PIN que el resto
        // de los dispositivos nunca va a conocer.
        if (!ok) {
          setError('No se pudo guardar el PIN. Probá de nuevo.');
          return;
        }
        onUnlock();
        return;
      }

      if (await verifyPin(pin, pinHash)) {
        onUnlock();
      } else {
        setError('PIN incorrecto.');
        setPin('');
      }
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-carbon-light dark:bg-white/5 py-3.5 px-4 text-center text-2xl font-black tracking-[0.4em] focus:border-apple-green focus:outline-none focus:ring-2 focus:ring-apple-green/15 placeholder-gray-300 dark:placeholder-gray-600 text-carbon-dark dark:text-white transition-all';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-carbon-dark/60 backdrop-blur-2xl" />

      <div className="relative m-auto w-full max-w-sm px-6" onClick={e => e.stopPropagation()}>
        <form
          onSubmit={submit}
          className="bg-white dark:bg-carbon-gray rounded-3xl shadow-lifted p-7 animate-scale-up"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-9 w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-carbon-dark dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-apple-green mx-auto mb-4 flex items-center justify-center shadow-green">
            {creating ? (
              <KeyRound className="w-7 h-7 text-carbon-dark" strokeWidth={2.5} />
            ) : (
              <Lock className="w-7 h-7 text-carbon-dark" strokeWidth={2.5} />
            )}
          </div>

          <h2 className="text-lg font-extrabold text-carbon-dark dark:text-white tracking-tight text-center">
            {creating ? 'Elegí tu PIN' : 'PIN de administración'}
          </h2>
          <p className="text-[11px] text-gray-400 font-semibold mt-1.5 mb-5 text-center leading-snug">
            {creating
              ? 'Todavía no hay PIN configurado. El que elijas ahora es el que va a pedir la app para tocar el catálogo o el orden de la cola.'
              : 'Hace falta para cambiar los bizcochos o el orden de la cola. Lo demás sigue abierto para todos.'}
          </p>

          <input
            autoFocus
            id="input-admin-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={e => { setPin(clean(e.target.value)); setError(null); }}
            placeholder="••••"
            className={inputClass}
          />

          {creating && (
            <input
              id="input-admin-pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={confirm}
              onChange={e => { setConfirm(clean(e.target.value)); setError(null); }}
              placeholder="repetilo"
              className={`${inputClass} mt-3`}
            />
          )}

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="btn-admin-pin-submit"
            disabled={busy || pin.length < PIN_MIN_LENGTH || (creating && confirm.length < PIN_MIN_LENGTH)}
            className="w-full mt-5 py-3.5 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-2xl transition-all shadow-sm text-sm cursor-pointer active:scale-[0.98]"
          >
            {creating ? 'Guardar PIN' : 'Entrar'}
          </button>

          <p className="text-[10px] text-gray-300 dark:text-gray-500 font-semibold mt-4 text-center leading-snug">
            No es una caja fuerte: es para que nadie cambie el catálogo o la cola sin querer.
          </p>
        </form>
      </div>
    </div>
  );
};

export default PinModal;
