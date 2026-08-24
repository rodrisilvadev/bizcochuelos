import React, { useMemo, useState } from 'react';
import type { AppState, BizcochoSelections, BizcochoType, User } from '../types';
import { PUNTOS_POR_PERSONA } from '../types';
import { createEmptySelections } from '../services/db';
import {
  puntosPorTipo,
  puntosDeSeleccion,
  puedeAgregar,
  seleccionCompleta,
  faltanteTexto,
  pesosDeSeleccion,
} from '../services/catalog';
import { PastryPicker } from './PastryPicker';
import { PartyPopper, Check, AlertCircle } from 'lucide-react';

interface WelcomeModalProps {
  user: User;
  state: AppState;
  onComplete: (selections: BizcochoSelections) => void;
}

const CONFETTI_COLORS = ['#8CE600', '#a8f000', '#7bca00', '#ffffff', '#fcd34d'];

// Alta nueva: entra a la cola, come sin comprar esta vuelta, y recién ahora
// (primer ingreso) elige su pedido semanal. No se puede cerrar sin elegir.
export const WelcomeModal: React.FC<WelcomeModalProps> = ({ user, state, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'picking'>('welcome');
  const [sel, setSel] = useState<BizcochoSelections>(() => createEmptySelections(state.catalog));

  const puntos = useMemo(() => puntosPorTipo(state), [state]);
  const usados = puntosDeSeleccion(sel, puntos);
  const completa = seleccionCompleta(sel, puntos);
  const faltante = faltanteTexto(sel, puntos);
  const pesos = pesosDeSeleccion(sel, state.catalog);

  const incSel = (t: BizcochoType) => {
    if (puedeAgregar(t, usados, puntos)) setSel(p => ({ ...p, [t]: (p[t] || 0) + 1 }));
  };
  const decSel = (t: BizcochoType) => {
    if ((sel[t] || 0) > 0) setSel(p => ({ ...p, [t]: p[t] - 1 }));
  };

  const confetti = useMemo(() => Array.from({ length: 32 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2.6 + Math.random() * 1.8,
    size: 6 + Math.random() * 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotate: Math.random() * 360,
  })), []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="absolute inset-0 bg-carbon-dark/60 backdrop-blur-2xl" />

      {step === 'welcome' && confetti.map(c => (
        <span
          key={c.id}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 1.6,
            backgroundColor: c.color,
            borderRadius: 2,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            transform: `rotate(${c.rotate}deg)`,
          }}
        />
      ))}

      <div className="relative m-auto w-full max-w-sm px-6">
        <div className="bg-white dark:bg-carbon-gray rounded-3xl shadow-lifted p-7 text-center animate-scale-up">
          {step === 'welcome' ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-apple-green mx-auto mb-5 flex items-center justify-center shadow-green animate-float">
                <PartyPopper className="w-8 h-8 text-carbon-dark" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-extrabold text-carbon-dark dark:text-white tracking-tight">
                ¡Bienvenida/o, {user.name}!
              </h2>
              <p className="text-sm text-gray-400 font-semibold mt-2 leading-snug">
                Ya sos parte del grupo. Esta primera vuelta comés sin comprar —
                el miércoles siguiente entrás a la cola como cualquier hijo de vecino.
              </p>
              <button
                id="btn-welcome-continue"
                onClick={() => setStep('picking')}
                className="w-full mt-6 py-3.5 bg-apple-green hover:bg-apple-green-hover text-carbon-dark font-extrabold rounded-2xl transition-all shadow-sm text-sm cursor-pointer active:scale-[0.98]"
              >
                Indicá tu preferencia bizcochística
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-carbon-dark dark:text-white tracking-tight">
                Armá tu pedido semanal
              </h2>
              <p className="text-[11px] text-gray-400 font-semibold mt-1 mb-4">
                Tenés {PUNTOS_POR_PERSONA} puntos por semana — 4 bizcochos comunes, o 3 de los más caros.
                Después lo podés cambiar desde Integrantes.
              </p>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-carbon-dark dark:text-white">
                  Tu selección: <span className="text-gray-400 font-bold">${pesos}</span>
                </span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full transition-colors ${
                  completa
                    ? 'bg-apple-green/10 text-apple-green border border-apple-green/20'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                }`}>
                  {usados} / {PUNTOS_POR_PERSONA} pts
                </span>
              </div>

              <PastryPicker
                catalog={state.catalog}
                presupuestoPesos={state.presupuestoPesos}
                selections={sel}
                usados={usados}
                onInc={incSel}
                onDec={decSel}
              />

              {faltante && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{faltante}</span>
                </div>
              )}

              <button
                id="btn-welcome-save"
                onClick={() => onComplete(sel)}
                disabled={!completa}
                className="w-full mt-5 py-3.5 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-2xl transition-all shadow-sm text-sm cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" /> Listo, empezar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
