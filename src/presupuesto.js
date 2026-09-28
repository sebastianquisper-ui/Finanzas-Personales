import { aCentimos } from './modelo.js';
import { deMedio, gastosPorCategoria } from './resumen.js';

export const UMBRAL_ALERTA = 0.7;

// 'ok' por debajo de 70 %, 'alerta' de 70 % a 99 %, 'excedido' desde 100 %.
export function nivel(gastado, tope) {
  if (!tope) return null;
  const pct = gastado / tope;
  if (pct >= 1) return 'excedido';
  if (pct >= UMBRAL_ALERTA) return 'alerta';
  return 'ok';
}

// movsMes: movimientos del mes calendario actual (todos los medios).
export function estadoPresupuesto(movsMes, config, medio) {
  const topes = config.presupuestos[medio] ?? {};
  const gastos = new Map(gastosPorCategoria(deMedio(movsMes, medio)).map((g) => [g.categoria, g.total]));
  const categorias = [...config.categoriasGasto];
  for (const c of [...Object.keys(topes), ...gastos.keys()]) if (!categorias.includes(c)) categorias.push(c);

  const filas = categorias.map((categoria) => {
    const gastado = gastos.get(categoria) ?? 0;
    const tope = topes[categoria] ?? null;
    return { categoria, gastado, tope, nivel: nivel(gastado, tope), restante: tope ? (aCentimos(tope) - aCentimos(gastado)) / 100 : null };
  });

  const conTope = filas.filter((f) => f.tope);
  const total = {
    gastado: conTope.reduce((s, f) => s + aCentimos(f.gastado), 0) / 100,
    tope: conTope.reduce((s, f) => s + aCentimos(f.tope), 0) / 100,
  };
  total.nivel = nivel(total.gastado, total.tope);
  total.restante = (aCentimos(total.tope) - aCentimos(total.gastado)) / 100;
  return { filas, total };
}

export function alertas(estado) {
  return estado.filas.filter((f) => f.nivel === 'alerta' || f.nivel === 'excedido');
}

// Tras guardar un gasto del mes actual: ¿su categoría llegó al 70 % o al 100 %?
// movsMes todavía no incluye el cambio; `anterior` es el movimiento antes de editarlo.
export function avisoTrasGasto(movsMes, config, gasto, anterior = null) {
  const tope = config.presupuestos[gasto.medio]?.[gasto.categoria];
  if (!tope || gasto.tipo !== 'gasto') return null;
  let cent = 0;
  for (const m of movsMes) {
    if (m.id === anterior?.id || m.transferId) continue;
    if (m.tipo === 'gasto' && m.medio === gasto.medio && m.categoria === gasto.categoria) cent += aCentimos(m.monto);
  }
  cent += aCentimos(gasto.monto);
  const gastado = cent / 100;
  const n = nivel(gastado, tope);
  if (n === 'ok') return null;
  return { categoria: gasto.categoria, gastado, tope, nivel: n, pct: Math.round((gastado / tope) * 100) };
}
