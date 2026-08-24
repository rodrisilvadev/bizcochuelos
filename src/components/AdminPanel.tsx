import React, { useMemo, useState } from 'react';
import type { AppState, CatalogItem } from '../types';
import { PUNTOS_POR_PERSONA, PUNTOS_BIZCOCHO_COMUN } from '../types';
import { puntosDeItem, unidadesPorSemana } from '../services/catalog';
import {
  ShieldCheck,
  X,
  Plus,
  Trash2,
  Check,
  Pencil,
  AlertTriangle,
  KeyRound,
  Wallet,
} from 'lucide-react';

interface AdminPanelProps {
  state: AppState;
  onAddItem: (name: string, precio: number) => Promise<boolean>;
  onUpdateItem: (name: string, precio: number) => Promise<boolean>;
  onRemoveItem: (name: string) => Promise<boolean>;
  onSetPresupuesto: (pesos: number) => Promise<boolean>;
  onChangePin: () => void;
  onClose: () => void;
}

// Cuánta gente tiene elegido este bizcocho hoy. Se muestra antes de borrarlo:
// sacarlo del catálogo lo saca también de sus selecciones, y conviene saber a
// cuántos les va a quedar el pedido incompleto.
const cuantosLoComen = (state: AppState, name: string): number =>
  state.users.filter(u => (u.selections[name] || 0) > 0).length;

// El panel de administración: catálogo y presupuesto. Se llega desde el escudo
// del encabezado, que solo se le muestra a quien figura en `admin.userIds`, y
// solo se abre después de pasar el PIN (ver services/admin.ts).
export const AdminPanel: React.FC<AdminPanelProps> = ({
  state, onAddItem, onUpdateItem, onRemoveItem, onSetPresupuesto, onChangePin, onClose,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrecio, setEditPrecio] = useState('');
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const [presupuesto, setPresupuesto] = useState(String(state.presupuestoPesos));
  const [busy, setBusy] = useState(false);

  const precioNuevo = Number(newPrecio);
  const precioNuevoValido = Number.isFinite(precioNuevo) && precioNuevo > 0;

  // Vista previa de lo que va a pasar con el precio que se está tipeando. Es
  // la traducción que importa: quien administra piensa en pesos, la app cuenta
  // en puntos, y sin esto habría que adivinar cuál de las dos ganó.
  const previa = useMemo(() => {
    if (!precioNuevoValido) return null;
    const item = { name: newName, precio: precioNuevo };
    return {
      puntos: puntosDeItem(item, state.presupuestoPesos),
      unidades: unidadesPorSemana(item, state.presupuestoPesos),
    };
  }, [newName, precioNuevo, precioNuevoValido, state.presupuestoPesos]);

  const nombreRepetido = state.catalog.some(
    item => item.name.toLowerCase() === newName.trim().toLowerCase(),
  );

  const run = async (op: () => Promise<boolean>, onOk?: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      if (await op()) onOk?.();
    } finally {
      setBusy(false);
    }
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !precioNuevoValido || nombreRepetido) return;
    run(() => onAddItem(newName.trim(), Math.round(precioNuevo)), () => {
      setNewName('');
      setNewPrecio('');
      setShowAdd(false);
    });
  };

  const submitEdit = (name: string) => {
    const precio = Number(editPrecio);
    if (!Number.isFinite(precio) || precio <= 0) return;
    run(() => onUpdateItem(name, Math.round(precio)), () => setEditing(null));
  };

  const submitPresupuesto = () => {
    const pesos = Number(presupuesto);
    if (!Number.isFinite(pesos) || pesos <= 0 || Math.round(pesos) === state.presupuestoPesos) return;
    run(() => onSetPresupuesto(Math.round(pesos)));
  };

  const inputBase =
    'rounded-xl border border-gray-200 dark:border-white/10 bg-carbon-light dark:bg-white/5 py-2.5 px-3 text-sm font-semibold focus:border-apple-green focus:outline-none focus:ring-2 focus:ring-apple-green/15 placeholder-gray-300 dark:placeholder-gray-600 text-carbon-dark dark:text-white transition-all';

  return (
    <div className="fixed inset-0 z-[65] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-carbon-gray rounded-t-3xl shadow-2xl max-w-2xl w-full mx-auto animate-slide-bottom"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/15" />
        </div>

        <div className="px-6 pt-3 pb-4 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-apple-green flex-shrink-0" strokeWidth={2.5} />
              <span className="text-base font-extrabold text-carbon-dark dark:text-white truncate">Panel de administración</span>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">Qué se puede pedir y a cuánto</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onChangePin}
              title="Cambiar el PIN"
              aria-label="Cambiar el PIN"
              className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-carbon-dark dark:hover:text-white transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-carbon-dark dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-4 py-4 space-y-4">

          {/* ── Presupuesto semanal ── */}
          <div className="rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5 text-apple-green flex-shrink-0" />
              <span className="text-xs font-extrabold text-carbon-dark dark:text-white">Presupuesto por persona</span>
            </div>
            <p className="text-[10px] text-gray-400 font-semibold leading-snug mb-3">
              Lo que gasta cada uno por semana. Es la regla de tres que convierte los precios en
              los {PUNTOS_POR_PERSONA} puntos que tiene cada persona. Cuando aumente la panadería,
              subí precios y presupuesto juntos: así los puntos no se mueven y el Balance de
              Levadura sigue siendo comparable con el de meses anteriores.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
                <input
                  id="input-presupuesto"
                  type="number"
                  min={1}
                  value={presupuesto}
                  onChange={e => setPresupuesto(e.target.value)}
                  className={`${inputBase} w-full pl-7`}
                />
              </div>
              <button
                id="btn-save-presupuesto"
                onClick={submitPresupuesto}
                disabled={busy || Number(presupuesto) === state.presupuestoPesos || !(Number(presupuesto) > 0)}
                className="px-4 py-2.5 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Guardar
              </button>
            </div>
          </div>

          {/* ── Catálogo ── */}
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-xs font-extrabold text-carbon-dark dark:text-white">Catálogo</span>
              <span className="text-[10px] text-gray-400 font-semibold ml-1.5">{state.catalog.length} ítems</span>
            </div>
            <button
              id="btn-toggle-add-item"
              onClick={() => setShowAdd(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-[11px] cursor-pointer transition-all ${
                showAdd
                  ? 'bg-carbon-light dark:bg-white/5 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                  : 'bg-apple-green text-carbon-dark hover:bg-apple-green-hover active:scale-95'
              }`}
            >
              {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAdd ? 'Cancelar' : 'Agregar'}
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={submitAdd}
              className="rounded-2xl bg-white dark:bg-white/5 border border-apple-green/30 ring-2 ring-apple-green/10 px-4 py-4 space-y-3 animate-scale-up"
            >
              <input
                autoFocus
                id="input-new-item-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre (ej. Pan tortuga integral)"
                className={`${inputBase} w-full`}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
                <input
                  id="input-new-item-precio"
                  type="number"
                  min={1}
                  value={newPrecio}
                  onChange={e => setNewPrecio(e.target.value)}
                  placeholder="Precio por unidad"
                  className={`${inputBase} w-full pl-7`}
                />
              </div>

              {nombreRepetido && newName.trim() && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Ya existe un ítem con ese nombre.</span>
                </div>
              )}

              {previa && (
                <p className="text-[11px] font-bold text-apple-green bg-apple-green/10 border border-apple-green/20 rounded-xl px-3 py-2 leading-snug">
                  Cuesta {previa.puntos} de los {PUNTOS_POR_PERSONA} puntos semanales —
                  entran <span className="font-black">{previa.unidades}</span> por persona
                  {previa.puntos !== PUNTOS_BIZCOCHO_COMUN && ', en lugar de 4 bizcochos comunes'}.
                </p>
              )}

              <button
                type="submit"
                id="btn-submit-new-item"
                disabled={busy || !newName.trim() || !precioNuevoValido || nombreRepetido}
                className="w-full py-3 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Agregar al catálogo
              </button>
            </form>
          )}

          <div className="rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden divide-y divide-dashed divide-gray-100 dark:divide-white/10">
            {state.catalog.map(item => {
              const puntos = puntosDeItem(item, state.presupuestoPesos);
              const unidades = unidadesPorSemana(item, state.presupuestoPesos);
              const isEditing = editing === item.name;

              return (
                <div key={item.name} className="px-4 py-3 bg-white dark:bg-transparent">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-carbon-dark dark:text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                        ${item.precio} · {puntos} pts · entran {unidades} por semana
                      </p>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          id={`btn-edit-item-${item.name}`}
                          onClick={() => { setEditing(item.name); setEditPrecio(String(item.precio)); }}
                          aria-label={`Cambiar el precio de ${item.name}`}
                          className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 hover:bg-apple-green/10 hover:border-apple-green/20 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-apple-green flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-remove-item-${item.name}`}
                          onClick={() => setDeleting(item)}
                          aria-label={`Sacar ${item.name} del catálogo`}
                          className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-100 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-2 mt-3 animate-scale-up">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
                        <input
                          autoFocus
                          type="number"
                          min={1}
                          value={editPrecio}
                          onChange={e => setEditPrecio(e.target.value)}
                          className={`${inputBase} w-full pl-7`}
                        />
                      </div>
                      <button
                        onClick={() => submitEdit(item.name)}
                        disabled={busy || !(Number(editPrecio) > 0)}
                        className="px-4 py-2.5 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2.5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-gray-400 font-semibold leading-snug px-1">
            El nombre no se puede cambiar: es la clave con la que quedaron guardadas las
            elecciones de cada uno y los pedidos del historial. Si hay que renombrar algo,
            agregalo de nuevo y sacá el viejo.
          </p>
        </div>

        {/* ── Confirmación de baja de un ítem ── */}
        {deleting && (
          <div className="absolute inset-0 z-10 flex items-end" onClick={() => setDeleting(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-t-3xl" />
            <div
              className="relative w-full bg-white dark:bg-carbon-gray rounded-t-3xl border-t border-gray-100 dark:border-white/10 px-6 py-5 animate-slide-bottom"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-extrabold text-carbon-dark dark:text-white">
                    ¿Sacar “{deleting.name}” del catálogo?
                  </p>
                  <p className="text-[11px] text-gray-400 font-semibold mt-1 leading-snug">
                    {cuantosLoComen(state, deleting.name) > 0 ? (
                      <>
                        Lo tienen elegido <span className="font-bold text-amber-600 dark:text-amber-400">
                          {cuantosLoComen(state, deleting.name)} integrante{cuantosLoComen(state, deleting.name) === 1 ? '' : 's'}
                        </span>: les va a quedar el pedido incompleto hasta que lo rearmen.
                      </>
                    ) : (
                      'No lo tiene elegido nadie.'
                    )}
                    {' '}El historial no se toca: los pedidos viejos siguen mostrándolo.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  id="btn-confirm-remove-item"
                  onClick={() => run(() => onRemoveItem(deleting.name), () => setDeleting(null))}
                  disabled={busy}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-extrabold rounded-2xl transition-all text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Sacar
                </button>
                <button
                  onClick={() => setDeleting(null)}
                  className="px-5 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold rounded-2xl transition-all text-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 pt-2 pb-6 border-t border-gray-100 dark:border-white/10 text-[10px] text-gray-400 font-semibold text-center">
          Los cambios se ven al instante en todos los dispositivos del grupo.
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
