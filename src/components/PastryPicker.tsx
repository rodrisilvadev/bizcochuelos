import React from 'react';
import type { BizcochoSelections, BizcochoType, CatalogItem } from '../types';
import { PUNTOS_POR_PERSONA, PUNTOS_BIZCOCHO_COMUN } from '../types';
import { puntosDeItem, puedeAgregar } from '../services/catalog';
import { Plus, Minus } from 'lucide-react';

interface StepperRowProps {
  item: CatalogItem;
  puntos: number;
  unidadesPorSemana: number;
  count: number;
  onInc: () => void;
  onDec: () => void;
  canInc: boolean;
}

const StepperRow: React.FC<StepperRowProps> = ({ item, puntos, unidadesPorSemana, count, onInc, onDec, canInc }) => (
  <div className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 dark:border-white/5 last:border-0">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${count > 0 ? 'bg-apple-green' : 'bg-gray-200 dark:bg-white/15'}`} />
      <div className="min-w-0">
        <span className={`block text-xs font-semibold truncate ${count > 0 ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
          {item.name}
        </span>
        {/* Solo se aclara el costo de lo que NO vale lo mismo que un bizcocho
            común. Ponerle la etiqueta a los 12 de siempre sería ruido: lo que
            hay que explicar es la excepción. */}
        {puntos !== PUNTOS_BIZCOCHO_COMUN && (
          <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 truncate">
            ${item.precio} · entran {unidadesPorSemana} por semana
          </span>
        )}
      </div>
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
  catalog: CatalogItem[];
  presupuestoPesos: number;
  selections: BizcochoSelections;
  usados: number; // Puntos ya gastados por esta selección
  onInc: (type: BizcochoType) => void;
  onDec: (type: BizcochoType) => void;
}

// Lista de steppers para elegir bizcochos dentro del presupuesto semanal
// (PUNTOS_POR_PERSONA). La usan tanto la edición de integrantes (Members) como
// el onboarding de altas nuevas (WelcomeModal).
//
// El tope es por puntos y no por unidades: cada ítem descuenta lo que cuesta,
// así que entran 4 bizcochos comunes o 3 panes tortuga, pero no 4 tortugas.
export const PastryPicker: React.FC<PastryPickerProps> = ({
  catalog, presupuestoPesos, selections, usados, onInc, onDec,
}) => (
  <div className="max-h-52 overflow-y-auto rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-1">
    {catalog.map(item => {
      const puntos = puntosDeItem(item, presupuestoPesos);
      return (
        <StepperRow
          key={item.name}
          item={item}
          puntos={puntos}
          unidadesPorSemana={Math.floor(PUNTOS_POR_PERSONA / puntos)}
          count={selections[item.name] || 0}
          onInc={() => onInc(item.name)}
          onDec={() => onDec(item.name)}
          canInc={puedeAgregar(item.name, usados, { [item.name]: puntos })}
        />
      );
    })}
  </div>
);

export default PastryPicker;
