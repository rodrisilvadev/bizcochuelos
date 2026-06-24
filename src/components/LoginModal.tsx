import React, { useState } from 'react';
import type { User } from '../types';
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

  // Color palette for avatars based on index
  const avatarColors = [
    'from-violet-400 to-purple-500',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-red-500',
    'from-blue-400 to-indigo-500',
    'from-pink-400 to-rose-500',
    'from-amber-400 to-orange-500',
    'from-cyan-400 to-blue-500',
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Blurred background overlay */}
      <div className="absolute inset-0 bg-carbon-dark/50 backdrop-blur-2xl" />

      {/* Bottom sheet */}
      <div className="relative mt-auto animate-slide-bottom">
        <div className="bg-white rounded-t-[2.5rem] shadow-lifted px-6 pt-8 pb-10 max-h-[88vh] overflow-y-auto">
          
          {/* Handle pill */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-200" />

          {/* Logo + header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-apple-green mx-auto mb-4 flex items-center justify-center shadow-green animate-float">
              <Coffee className="w-7 h-7 text-carbon-dark" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-extrabold text-carbon-dark tracking-tight">¡Bienvenido!</h2>
            <p className="text-sm text-gray-400 font-semibold mt-1.5 leading-snug">
              ¿Quién está ingresando hoy? <br />
              <span className="text-[11px]">Seleccioná tu nombre para registrar tu visita.</span>
            </p>
          </div>

          {/* Member list */}
          <div className="space-y-3">
            {users.map((user, i) => {
              const isSelecting = selecting === user.id;
              const colorClass = avatarColors[i % avatarColors.length];
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
                      : 'bg-carbon-light border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-card'
                  }`}
                >
                  {/* Gradient avatar */}
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-extrabold text-base shadow-sm flex-shrink-0 transition-transform duration-250 ${isSelecting ? 'scale-110' : ''}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-carbon-dark text-sm truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {missingChoices
                        ? <span className="text-amber-500 font-bold">⚠ Sin bizcochos asignados</span>
                        : <span>{total} bizcochos · {user.ingresosCount} visitas</span>
                      }
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${isSelecting ? 'text-apple-green translate-x-1' : 'text-gray-300'}`} />
                </button>
              );
            })}
          </div>

          {/* Hint */}
          <p className="text-center text-[10px] text-gray-300 font-semibold mt-6">
            Tu ingreso quedará registrado en las estadísticas del grupo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
