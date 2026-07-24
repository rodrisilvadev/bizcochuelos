import React, { useState } from 'react';
import type { User } from '../types';
import { getAvatarColor } from '../utils/avatar';
import { Coffee, ChevronRight } from 'lucide-react';

interface LoginModalProps {
  users: User[];
  onSelectUser: (userId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ users, onSelectUser }) => {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = (userId: string) => {
    setSelecting(userId);
    setTimeout(() => onSelectUser(userId), 280);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Blurred background overlay */}
      <div className="absolute inset-0 bg-carbon-dark/50 backdrop-blur-2xl" />

      {/* Bottom sheet */}
      <div className="relative mt-auto animate-slide-bottom">
        <div className="bg-white dark:bg-carbon-gray rounded-t-[2.5rem] shadow-lifted px-6 pt-8 pb-10 max-h-[88vh] overflow-y-auto">

          {/* Handle pill */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-200 dark:bg-white/15" />

          {/* Logo + header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-apple-green mx-auto mb-4 flex items-center justify-center shadow-green animate-float">
              <Coffee className="w-7 h-7 text-carbon-dark" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-extrabold text-carbon-dark dark:text-white tracking-tight">¡Bienvenido!</h2>
            <p className="text-sm text-gray-400 font-semibold mt-1.5 leading-snug">
              ¿Quién está ingresando hoy? <br />
              <span className="text-[11px]">Seleccioná tu nombre para registrar tu visita.</span>
            </p>
          </div>

          {/* Member list */}
          <div className="space-y-3">
            {users.map(user => {
              const isSelecting = selecting === user.id;
              const colorClass = getAvatarColor(user.id);
              const total = Object.values(user.selections).reduce((s, v) => s + v, 0);
              const missingChoices = total === 0;

              return (
                <button
                  key={user.id}
                  id={`login-select-user-${user.id}`}
                  onClick={() => handleSelect(user.id)}
                  disabled={!!selecting}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-250 cursor-pointer active:scale-[0.98] ${
                    isSelecting
                      ? 'bg-apple-green/10 border-apple-green scale-[0.98] shadow-green'
                      : 'bg-carbon-light dark:bg-white/5 border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:border-gray-200 hover:shadow-card'
                  }`}
                >
                  {/* Gradient avatar */}
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-extrabold text-base shadow-sm flex-shrink-0 transition-transform duration-250 ${isSelecting ? 'scale-110' : ''}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-carbon-dark dark:text-white text-sm truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {missingChoices
                        ? <span className="text-amber-500 font-bold">⚠ Sin bizcochos asignados</span>
                        : <span>{total} bizcochos · {user.ingresosCount} visitas</span>
                      }
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${isSelecting ? 'text-apple-green translate-x-1' : 'text-gray-300 dark:text-gray-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Hint */}
          <p className="text-center text-[10px] text-gray-300 dark:text-gray-500 font-semibold mt-6">
            Tu ingreso quedará registrado en las estadísticas del grupo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
