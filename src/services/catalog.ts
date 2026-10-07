import type { AppState, BizcochoSelections, BizcochoType, CatalogItem } from '../types';
import { PUNTOS_POR_PERSONA, PRESUPUESTO_PESOS_DEFAULT } from '../types';

// ── El catálogo y el presupuesto semanal ───────────────────────────────────
//
// Ver el comentario largo en types.ts para el porqué de los puntos. Acá está
// la aritmética, en un solo lugar: el picker, la validación y el registro del
// historial tienen que coincidir siempre en cuánto vale cada cosa. Si el picker
// dejara agregar algo que la validación no acepta, la selección quedaría
// imposible de guardar y no habría forma de darse cuenta de por qué.

// Cuántos puntos cuesta un ítem. Se DERIVA del precio y del presupuesto, no se
// guarda: guardarlo sería un segundo lugar donde el mismo dato puede quedar
// desactualizado cuando cambian los precios.
//
// El piso de 1 punto no es cosmético: sin él, algo lo bastante barato como
// para redondear a 0 se podría agregar infinitas veces sin gastar presupuesto.
export const puntosDeItem = (item: CatalogItem, presupuestoPesos: number): number => {
  const presupuesto = presupuestoPesos > 0 ? presupuestoPesos : PRESUPUESTO_PESOS_DEFAULT;
  return Math.max(1, Math.round((item.precio * PUNTOS_POR_PERSONA) / presupuesto));
};

// Cuántas unidades de este ítem entran en una semana completa. Es el número
// que la gente entiende de una ("de estos entran 3"), y el que se muestra en
// el picker y en el panel de administración.
export const unidadesPorSemana = (item: CatalogItem, presupuestoPesos: number): number =>
  Math.floor(PUNTOS_POR_PERSONA / puntosDeItem(item, presupuestoPesos));

// Mapa nombre → puntos, para no recalcular por fila en cada render.
export const puntosPorTipo = (state: Pick<AppState, 'catalog' | 'presupuestoPesos'>): Record<BizcochoType, number> => {
  const map: Record<BizcochoType, number> = {};
  for (const item of state.catalog) map[item.name] = puntosDeItem(item, state.presupuestoPesos);
  return map;
};

// Lo que ocupa una selección, en puntos.
//
// Un tipo que ya no está en el catálogo (lo borraron mientras alguien lo tenía
// elegido) no suma: cuenta como 0 y la persona queda con presupuesto libre. La
// alternativa —cobrarle puntos por algo que ya no se puede comprar— la dejaría
// con una selección que no puede completar ni entender.
export const puntosDeSeleccion = (
  selections: BizcochoSelections,
  puntos: Record<BizcochoType, number>,
): number =>
  Object.entries(selections).reduce((sum, [type, count]) => sum + (puntos[type] ?? 0) * (count || 0), 0);

// Unidades totales de una selección (lo que cuenta la panadería).
export const unidadesDeSeleccion = (selections: BizcochoSelections): number =>
  Object.values(selections).reduce((sum, count) => sum + (count || 0), 0);

// Cuánto sale una selección, en pesos.
export const pesosDeSeleccion = (selections: BizcochoSelections, catalog: CatalogItem[]): number =>
  catalog.reduce((sum, item) => sum + item.precio * (selections[item.name] || 0), 0);

// El ítem más barato del catálogo, en puntos. Es el umbral de "ya no me entra
// nada más".
export const puntosMinimos = (puntos: Record<BizcochoType, number>): number => {
  const valores = Object.values(puntos);
  return valores.length > 0 ? Math.min(...valores) : PUNTOS_POR_PERSONA;
};

// ¿Se puede sumar una unidad más de este tipo sin pasarse del presupuesto?
export const puedeAgregar = (
  type: BizcochoType,
  usados: number,
  puntos: Record<BizcochoType, number>,
): boolean => usados + (puntos[type] ?? PUNTOS_POR_PERSONA) <= PUNTOS_POR_PERSONA;

// Una selección está completa cuando no entra nada más.
//
// Antes la regla era "exactamente 4 bizcochos", que con un solo precio era lo
// mismo. Ya no: 3 panes tortuga gastan 12 puntos justos, pero 2 tortugas + 1
// bizcocho gastan 11 y sobra 1 punto, que no alcanza para nada. Exigir el
// presupuesto exacto dejaría esa combinación imposible de guardar.
export const seleccionCompleta = (
  selections: BizcochoSelections,
  puntos: Record<BizcochoType, number>,
): boolean => {
  const usados = puntosDeSeleccion(selections, puntos);
  if (usados > PUNTOS_POR_PERSONA) return false;
  return PUNTOS_POR_PERSONA - usados < puntosMinimos(puntos);
};

// Texto de lo que falta, para el cartelito de validación. Devuelve null cuando
// ya está completa.
export const faltanteTexto = (
  selections: BizcochoSelections,
  puntos: Record<BizcochoType, number>,
): string | null => {
  const usados = puntosDeSeleccion(selections, puntos);
  if (usados > PUNTOS_POR_PERSONA) return 'Te pasaste del presupuesto: sacá algo.';
  const restan = PUNTOS_POR_PERSONA - usados;
  if (restan < puntosMinimos(puntos)) return null;
  const bizcochos = Math.floor(restan / puntosMinimos(puntos));
  return `Te quedan ${restan} punto${restan === 1 ? '' : 's'} sin usar — te entra${bizcochos === 1 ? '' : 'n'} ${bizcochos} más.`;
};

// Rellena con 0 los tipos del catálogo que falten y saca los que ya no existen.
// Se aplica antes de guardar para que las selecciones no arrastren tipos
// borrados ni le falten los nuevos.
export const alinearConCatalogo = (
  selections: BizcochoSelections,
  catalog: CatalogItem[],
): BizcochoSelections => {
  const next: BizcochoSelections = {};
  for (const item of catalog) next[item.name] = selections[item.name] || 0;
  return next;
};
