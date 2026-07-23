import React from 'react';
import { ScrollText, X } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

const RULES = [
  {
    title: 'Alta de un integrante nuevo',
    text: 'Quien se suma no compra en su primera vuelta: entra, come, y recién desde el miércoles siguiente pasa a la cola de compra como cualquier otro integrante.',
  },
  {
    title: 'Baja del grupo',
    text: 'Si alguien se quiere bajar, tiene que avisar con tiempo para reacomodar la cola y el pedido antes de que le toque comprar.',
  },
  {
    title: 'Sustitución del producto',
    text: 'El bizcocho es la base, no una obligación: se puede reemplazar por otro producto de contenido o costo similar (medialunas, sándwiches, etc.) sin drama.',
  },
  {
    title: 'Cambio de turno',
    text: 'Si a alguien le toca comprar y no puede ese miércoles, coordina el cambio con otro integrante. La cola no se salta, se acomoda.',
  },
];

// Las reglas no escritas del grupo, ahora escritas. Solo informativo — se puede cerrar libremente.
export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
    <div
      className="relative bg-white dark:bg-carbon-gray rounded-t-3xl shadow-2xl max-w-2xl w-full mx-auto animate-slide-bottom"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/15" />
      </div>

      <div className="px-6 pt-3 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
            <span className="text-base font-extrabold text-carbon-dark dark:text-white">Los Mandamientos Bizcochísticos</span>
          </div>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">La piedra de Moisés del grupo</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-carbon-dark dark:hover:text-white transition-all cursor-pointer flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-3">
        {RULES.map((rule, i) => (
          <div
            key={rule.title}
            className="flex gap-3 px-4 py-3.5 rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10"
          >
            <span className="w-6 h-6 rounded-lg bg-apple-green/15 text-apple-green text-xs font-black flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-extrabold text-carbon-dark dark:text-white">{rule.title}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5 leading-snug">{rule.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pt-2 pb-6 border-t border-gray-100 dark:border-white/10 text-[10px] text-gray-400 font-semibold text-center">
        Escritas para que no se pierdan en el grupo de WhatsApp.
      </div>
    </div>
  </div>
);

export default RulesModal;
