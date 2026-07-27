import type { AppState, LedgerRow } from '../types';

// ── Balance de Levadura ────────────────────────────────────────────────────
//
// El problema que resuelve: contar turnos (`comprasCount`) es una medida
// injusta, porque un turno no vale siempre lo mismo. Comprar cuando el grupo
// es de 8 personas cuesta el doble que comprar cuando es de 4. Contar turnos
// trata a los dos casos igual.
//
// La unidad correcta no es el turno ni la plata: es el bizcocho. El invariante
// justo es "cada uno debería haber puesto tantos bizcochos como los que comió":
//
//   puso_i    = Σ (total del pedido) sobre las semanas en que le tocó comprar
//   comió_i   = Σ (lo que comió esa semana) sobre las semanas en que estuvo
//   balance_i = puso_i − comió_i
//
// Propiedad clave: Σ balance_i = 0 sobre TODO el que alguna vez participó.
// La semana que comprás tu neto es (total − lo tuyo), positivo; el de cada
// otro es (−lo suyo). Como `total` es justamente la suma de lo que come todo
// el grupo, se cancela. Es un libro contable cerrado — por eso el ledger
// incluye a los que ya se fueron: sacarlos rompería el cero y repartiría su
// deuda entre los que quedan sin que se note.
//
// El balance se DERIVA del historial, no se acumula en contadores sueltos.
// Es a propósito: `checkAndRotateWednesday` corre en cada dispositivo, así que
// un acumulador podría sumar dos veces la misma semana y quedar desincronizado
// para siempre, sin forma de auditarlo. Derivarlo del historial lo hace
// recalculable y verificable en cualquier momento.

// El libro arranca en la primera entrada del historial. Antes de esa fecha no
// existe registro de quién estaba ni de cuánto comía, así que todo lo anterior
// queda en cero para todos. Esto se muestra en la interfaz a propósito: un
// balance sin su fecha de corte invita a discutir números que no cubren lo que
// la gente cree que cubren.
export const LEDGER_START = '2026-07-01';

// Ordena el ledger de más deudor a más acreedor. Ese orden es el orden en que
// "debería" tocar comprar: el más negativo es el que más debe.
//
// Los empates son frecuentes y no son un detalle cosmético: al arrancar el
// libro, todos los que todavía no compraron quedan exactamente en el mismo
// número. Desempatar por nombre pondría primero a alguien que ya compró antes
// del inicio del libro por encima de alguien que no compró nunca, que es
// justamente al revés. Por eso el desempate mira `comprasTotales`, que sí
// incluye lo anterior al corte.
const byBalance = (a: LedgerRow, b: LedgerRow): number =>
  a.balance - b.balance ||
  a.comprasTotales - b.comprasTotales ||
  a.name.localeCompare(b.name, 'es');

export const computeLedger = (state: AppState): LedgerRow[] => {
  const rows = new Map<string, LedgerRow>();

  const rowFor = (id: string, name: string): LedgerRow => {
    let row = rows.get(id);
    if (!row) {
      row = { id, name, puso: 0, comio: 0, balance: 0, compras: 0, semanas: 0, activo: false, comprasTotales: 0 };
      rows.set(id, row);
    }
    // El nombre más reciente gana (si alguien se renombró, mostramos el actual).
    row.name = name;
    return row;
  };

  for (const entry of state.history) {
    // Entradas sin padrón (anteriores a esta funcionalidad y no migradas) no
    // pueden aportar al libro: sabemos el total pero no quién comió qué.
    // Se saltean enteras — incluido el crédito del comprador — porque contar
    // el `puso` sin el `comió` correspondiente rompería la suma cero.
    if (!entry.participants || entry.participants.length === 0) continue;

    for (const p of entry.participants) {
      const row = rowFor(p.id, p.name);
      row.comio += p.ate;
      row.semanas += 1;
    }

    const buyer = rows.get(entry.buyerId);
    if (buyer) {
      buyer.puso += entry.total;
      buyer.compras += 1;
    }
  }

  // Gente que está hoy en el grupo pero todavía no vivió ningún miércoles
  // cerrado (por ejemplo un alta reciente): aparece en cero, no ausente.
  for (const user of state.users) {
    const row = rowFor(user.id, user.name);
    row.activo = true;
    // De los que ya se fueron no queda registro de compras previas al libro,
    // así que ahí `comprasTotales` es lo que el libro alcanzó a ver.
    row.comprasTotales = user.comprasCount ?? 0;
  }

  const result = [...rows.values()];
  for (const row of result) {
    row.balance = row.puso - row.comio;
    if (!row.activo) row.comprasTotales = row.compras;
  }

  return result.sort(byBalance);
};

// Chequeo del invariante de suma cero. Si esto da distinto de 0 hay un bug en
// la migración o en el armado del padrón, y el número que ve el grupo está
// mal. La interfaz lo usa para avisar en vez de mostrar cifras falsas.
export const ledgerImbalance = (rows: LedgerRow[]): number =>
  rows.reduce((sum, row) => sum + row.balance, 0);
