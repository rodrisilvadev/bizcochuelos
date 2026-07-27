import React, { useState } from 'react';
import type { LedgerRow } from '../types';
import { ledgerImbalance, LEDGER_START } from '../services/ledger';
import { getAvatarColor } from '../utils/avatar';
import { TombstoneIcon } from './TombstoneIcon';
import { Scale, X, Info, AlertTriangle } from 'lucide-react';

interface BalanceLevaduraProps {
  ledger: LedgerRow[];
  currentUser: string | null;
  onClose: () => void;
}

const formatStart = (): string =>
  new Date(LEDGER_START + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

// Verde = acreedor, ámbar = deudor. A propósito NO se usa rojo: el rojo en
// esta app es para las bajas, y estar en negativo no es una falta — es que se
// te viene el turno.
const balanceTone = (balance: number): string => {
  if (balance > 0) return 'text-apple-green bg-apple-green/10 border-apple-green/20';
  if (balance < 0) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25';
  return 'text-gray-400 bg-carbon-light dark:bg-white/5 border-gray-100 dark:border-white/10';
};

const Row: React.FC<{ row: LedgerRow; isYou: boolean }> = ({ row, isYou }) => (
  <div className="flex items-center gap-3 px-5 py-3.5">
    {row.activo ? (
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(row.id)} flex items-center justify-center text-white font-extrabold text-sm shadow-sm flex-shrink-0`}>
        {row.name.charAt(0).toUpperCase()}
      </div>
    ) : (
      <div className="w-9 h-9 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center flex-shrink-0">
        <TombstoneIcon className="w-4 h-5 text-gray-300 dark:text-gray-600" />
      </div>
    )}

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-extrabold truncate ${
          row.activo
            ? 'text-carbon-dark dark:text-white'
            : 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600'
        }`}>
          {row.name}
        </span>
        {isYou && (
          <span className="text-[8px] font-black bg-apple-green/20 text-apple-green px-1.5 py-0.5 rounded-md uppercase tracking-wide flex-shrink-0">Vos</span>
        )}
      </div>
      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
        comió <span className="font-bold text-gray-500 dark:text-gray-400">{row.comio}</span>
        {' · '}
        puso <span className="font-bold text-gray-500 dark:text-gray-400">{row.puso}</span>
        {' · '}
        {row.compras} compra{row.compras === 1 ? '' : 's'}
      </p>
      {/* Compras anteriores al inicio del libro. No se pueden sumar al balance
          (no quedó registrado el tamaño de esos pedidos), así que el número
          exagera la deuda de quien las tenga. Se avisa en vez de esconderlo. */}
      {row.comprasTotales > row.compras && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
          + {row.comprasTotales - row.compras} compra{row.comprasTotales - row.compras === 1 ? '' : 's'} antes del libro, sin registrar — debe menos de lo que dice
        </p>
      )}
    </div>

    <span className={`text-sm font-black px-2.5 py-1.5 rounded-xl border flex-shrink-0 tabular-nums ${balanceTone(row.balance)}`}>
      {signed(row.balance)}
    </span>
  </div>
);

// El Balance de Levadura: cuánto puso cada uno contra cuánto comió, medido en
// bizcochos. Ver services/ledger.ts para la matemática y por qué se deriva del
// historial en lugar de acumularse. Se abre desde el botón central del footer.
export const BalanceLevadura: React.FC<BalanceLevaduraProps> = ({ ledger, currentUser, onClose }) => {
  const [showHelp, setShowHelp] = useState(false);

  const activos = ledger.filter(r => r.activo);
  const difuntos = ledger.filter(r => !r.activo && (r.puso !== 0 || r.comio !== 0));
  const imbalance = ledgerImbalance(ledger);

  // Sin miércoles cerrados con padrón no hay nada que contar todavía.
  const hasData = ledger.some(r => r.semanas > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
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
              <Scale className="w-4.5 h-4.5 text-apple-green flex-shrink-0" strokeWidth={2.5} />
              <span className="text-base font-extrabold text-carbon-dark dark:text-white truncate">Balance de Levadura</span>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">la verdad dura</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowHelp(h => !h)}
              title="¿Cómo se calcula?"
              aria-label="Cómo se calcula el Balance de Levadura"
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                showHelp
                  ? 'bg-apple-green/15 text-apple-green border-apple-green/25'
                  : 'bg-carbon-light dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:text-carbon-dark dark:hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
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

        <div className="max-h-[65vh] overflow-y-auto">
          {showHelp && (
            <div className="mx-4 mt-4 rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-3.5 space-y-2.5 animate-scale-up">
              <p className="text-[11px] text-gray-500 dark:text-gray-300 font-semibold leading-relaxed">
                Se mide en <span className="font-extrabold text-carbon-dark dark:text-white">bizcochos</span>, no en plata ni en turnos.
                Cada uno debería haber <span className="font-extrabold text-carbon-dark dark:text-white">puesto</span> tantos como los que{' '}
                <span className="font-extrabold text-carbon-dark dark:text-white">comió</span>. El balance es la resta.
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-300 font-semibold leading-relaxed">
                Contar turnos sería injusto: comprar cuando son 8 cuesta el doble que cuando son 4. Por eso se cuenta el pedido entero que te tocó pagar.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2">
                ⓘ Estar en negativo <span className="font-extrabold">no es hacer trampa</span>: es que se te viene el turno. El número salta para arriba el día que comprás y baja cada semana hasta que te vuelve a tocar. Lo que importa es que a la larga vuelva a cero — y que nadie se vaya del grupo debiendo.
              </p>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                Cuenta desde el <span className="font-bold">{formatStart()}</span>, la primera compra registrada. Lo anterior no quedó guardado en ningún lado, así que arranca en cero para todos. Solo suma miércoles ya cerrados: la compra de esta semana todavía no cuenta.
              </p>
            </div>
          )}

          {!hasData ? (
            <div className="px-6 py-12 text-center">
              <Scale className="w-10 h-10 text-gray-200 dark:text-white/15 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-400">Todavía no hay balance</p>
              <p className="text-xs text-gray-300 dark:text-gray-500 mt-0.5">Se arma solo con cada miércoles que pasa.</p>
            </div>
          ) : (
            <>
              {imbalance !== 0 && (
                <div className="flex items-start gap-2 mx-4 mt-4 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 leading-snug">
                    Los balances no suman cero (dan {signed(imbalance)}). Hay algo mal en los datos — tomá estos números con pinzas.
                  </p>
                </div>
              )}

              <div className="divide-y divide-dashed divide-gray-100 dark:divide-white/10">
                {activos.map(row => (
                  <Row key={row.id} row={row} isYou={row.id === currentUser} />
                ))}
              </div>

              {difuntos.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-carbon-light/50 dark:bg-white/5 border-y border-gray-100 dark:border-white/10">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Se fueron así</p>
                  </div>
                  <div className="divide-y divide-dashed divide-gray-100 dark:divide-white/10">
                    {difuntos.map(row => (
                      <Row key={row.id} row={row} isYou={false} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-6 pt-2 pb-6 border-t border-gray-100 dark:border-white/10 text-[10px] text-gray-400 font-semibold text-center">
          El más negativo es el que debería seguir en la cola.
        </div>
      </div>
    </div>
  );
};

export default BalanceLevadura;
