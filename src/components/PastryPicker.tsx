import React from 'react';
import type { BizcochoSelections, BizcochoType } from '../types';
import { BIZCOCHO_TYPES } from '../types';
import { Plus, Minus } from 'lucide-react';

interface StepperRowProps {
  type: BizcochoType;
  count: number;
  onInc: () => void;
  onDec: () => void;
  canInc: boolean;
}

const StepperRow: React.FC<StepperRowProps> = ({ type, count, onInc, onDec, canInc }) => (
  <div className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 dark:border-white/5 last:border-0">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0" />}
      {count === 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/15 flex-shrink-0" />}
      <span className={`text-xs font-semibold truncate ${count > 0 ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
        {type}
      </span>
    </div>
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <button
        type="button"
        onClick={onDec}
        disabled={count <= 0}
        className="w-7 h-7 rounded-lg bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:border-gray-200 transition-all active:scale-95 disabled:opacity-25 cursor-pointer"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className={`w-5 text-center text-sm font-extrabold ${count > 0 ? 'text-carbon-dark dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
        {count}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={!canInc}
        className="w-7 h-7 rounded-lg bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:border-gray-200 transition-all active:scale-95 disabled:opacity-25 cursor-pointer"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
);

interface PastryPickerProps {
  selections: BizcochoSelections;
  total: number;
  max: number;
  onInc: (type: BizcochoType) => void;
  onDec: (type: BizcochoType) => void;
}

// Lista de steppers para elegir bizcochos hasta un tope (siempre 4 en esta app).
// La usan tanto la edición de integrantes (Members) como el onboarding de altas nuevas (WelcomeModal).
export const PastryPicker: React.FC<PastryPickerProps> = ({ selections, total, max, onInc, onDec }) => (
  <div className="max-h-52 overflow-y-auto rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-1">
    {BIZCOCHO_TYPES.map(type => (
      <StepperRow
        key={type}
        type={type}
        count={selections[type]}
        onInc={() => onInc(type)}
        onDec={() => onDec(type)}
        canInc={total < max}
      />
    ))}
  </div>
);

export default PastryPicker;
