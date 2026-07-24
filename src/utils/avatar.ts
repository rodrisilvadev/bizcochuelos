// Paleta de gradientes para avatares. El color se deriva del id del usuario
// (no de su posición en un array) para que sea siempre el mismo sin importar
// en qué lista o en qué orden aparezca la persona (Login, Integrantes, etc.).
const AVATAR_COLORS = [
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-red-500',
  'from-blue-400 to-indigo-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
];

export const getAvatarColor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
