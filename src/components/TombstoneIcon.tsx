import React from 'react';

interface TombstoneIconProps {
  className?: string;
}

// lucide no tiene ni lápida ni cruz cristiana (su ícono "cross" es una cruz
// suiza/médica simétrica) — se dibuja a mano: lápida con remate en arco y
// una cruz latina (palo vertical más largo que el travesaño) tallada arriba.
export const TombstoneIcon: React.FC<TombstoneIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 26" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 25V11a7 7 0 0 1 14 0v14Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M12 7v11M8.5 11.2h7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export default TombstoneIcon;
