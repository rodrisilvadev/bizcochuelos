import React, { useMemo, useState } from 'react';
import type { BizcochoSelections, BizcochoType, User } from '../types';
import { createEmptySelections } from '../services/db';
import { PastryPicker } from './PastryPicker';
import { PartyPopper, Check, AlertCircle } from 'lucide-react';

interface WelcomeModalProps {
  user: User;
  onComplete: (selections: BizcochoSelections) => void;
}

const CONFETTI_COLORS = ['#8CE600', '#a8f000', '#7bca00', '#ffffff', '#fcd34d'];

// Alta nueva: entra a la cola, come sin comprar esta vuelta, y recién ahora
// (primer ingreso) elige sus 4 bizcochos. No se puede cerrar sin elegir.
export const WelcomeModal: React.FC<WelcomeModalProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'picking'>('welcome');
  const [sel, setSel] = useState<BizcochoSelections>(() => createEmptySelections());

  const total = Object.values(sel).reduce((s, v) => s + v, 0);
  const incSel = (t: BizcochoType) => { if (total < 4) setSel(p => ({ ...p, [t]: p[t] + 1 })); };
  const decSel = (t: BizcochoType) => { if (sel[t] > 0) setSel(p => ({ ...p, [t]: p[t] - 1 })); };

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
                Elegí tus 4 bizcochos
              </h2>
              <p className="text-[11px] text-gray-400 font-semibold mt-1 mb-4">
                Esta va a ser tu elección semanal por defecto. Después la podés cambiar desde Integrantes.
              </p>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-carbon-dark dark:text-white">Tu selección:</span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full transition-colors ${
                  total === 4
                    ? 'bg-apple-green/10 text-apple-green border border-apple-green/20'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                }`}>
                  {total} / 4
                </span>
              </div>

              <PastryPicker selections={sel} total={total} max={4} onInc={incSel} onDec={decSel} />

              {total !== 4 && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-3">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Elegí {4 - total} más para continuar.</span>
                </div>
              )}

              <button
                id="btn-welcome-save"
                onClick={() => onComplete(sel)}
                disabled={total !== 4}
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
