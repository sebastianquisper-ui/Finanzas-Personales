import { aCentimos, esTransferencia } from './modelo.js';

export const FILTROS_INICIALES = { tipo: 'todos', categoria: null, texto: '', historial: false };

// Cálculos del periodo. Las transferencias no cuentan en ingresos, gastos, balance ni gráficos.

export function deMedio(movs, medio) {
  return movs.filter((m) => m.medio === medio);
}

export function sinTransferencias(movs) {
  return movs.filter((m) => !esTransferencia(m));
}

export function totales(movs) {
  let ingresos = 0;
  let gastos = 0;
  for (const m of sinTransferencias(movs)) {
    if (m.tipo === 'ingreso') ingresos += aCentimos(m.monto);
    else gastos += aCentimos(m.monto);
  }
  return { ingresos: ingresos / 100, gastos: gastos / 100, balance: (ingresos - gastos) / 100 };
}

export function gastosPorCategoria(movs) {
  const porCategoria = new Map();
  for (const m of sinTransferencias(movs)) {
    if (m.tipo !== 'gasto') continue;
    porCategoria.set(m.categoria, (porCategoria.get(m.categoria) ?? 0) + aCentimos(m.monto));
  }
  return [...porCategoria]
    .map(([categoria, cent]) => ({ categoria, total: cent / 100 }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, 'es'));
}

export function tendencia(movs, grupos) {
  const ingresos = grupos.map(() => 0);
  const gastos = grupos.map(() => 0);
  for (const m of sinTransferencias(movs)) {
    const i = grupos.findIndex((g) => g.desde <= m.fecha && m.fecha <= g.hasta);
    if (i < 0) continue;
    if (m.tipo === 'ingreso') ingresos[i] += aCentimos(m.monto);
    else gastos[i] += aCentimos(m.monto);
  }
  return { ingresos: ingresos.map((c) => c / 100), gastos: gastos.map((c) => c / 100) };
}

export function ordenarRecientes(movs) {
  return [...movs].sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : (b.creado ?? 0) - (a.creado ?? 0)));
}

// Grupos por día (más reciente primero) con el neto del día sin transferencias.
export function agruparPorDia(movs) {
  const grupos = [];
  for (const m of ordenarRecientes(movs)) {
    let grupo = grupos.at(-1);
    if (!grupo || grupo.fecha !== m.fecha) {
      grupo = { fecha: m.fecha, movs: [], netoCent: 0, soloTransferencias: true };
      grupos.push(grupo);
    }
    grupo.movs.push(m);
    if (!esTransferencia(m)) {
      grupo.soloTransferencias = false;
      grupo.netoCent += m.tipo === 'ingreso' ? aCentimos(m.monto) : -aCentimos(m.monto);
    }
  }
  return grupos.map(({ netoCent, ...g }) => ({ ...g, neto: netoCent / 100 }));
}

function normalizar(texto) {
  return texto.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Busca en nota, categoría o monto ("12,5" encuentra 12.50).
export function buscar(movs, texto) {
  const q = normalizar(texto.trim());
  if (!q) return movs;
  const qMonto = q.replace(',', '.');
  return movs.filter(
    (m) =>
      normalizar(m.categoria).includes(q) ||
      normalizar(m.nota ?? '').includes(q) ||
      m.monto.toFixed(2).includes(qMonto) ||
      String(m.monto).includes(qMonto)
  );
}

export function filtrar(movs, { tipo = 'todos', categoria = null, texto = '' } = {}) {
  let res = movs;
  if (tipo !== 'todos') res = res.filter((m) => m.tipo === tipo && !esTransferencia(m));
  if (categoria) res = res.filter((m) => m.categoria === categoria);
  return buscar(res, texto);
}

// Comparación de dos periodos: totales, diferencia de gasto (A − B) y diferencia por categoría.
export function compararPeriodos(movsA, movsB) {
  const a = totales(movsA);
  const b = totales(movsB);
  const catA = new Map(gastosPorCategoria(movsA).map((g) => [g.categoria, g.total]));
  const catB = new Map(gastosPorCategoria(movsB).map((g) => [g.categoria, g.total]));
  const categorias = [...new Set([...catA.keys(), ...catB.keys()])];
  const porCategoria = categorias
    .map((categoria) => {
      const ga = catA.get(categoria) ?? 0;
      const gb = catB.get(categoria) ?? 0;
      return { categoria, a: ga, b: gb, dif: (aCentimos(ga) - aCentimos(gb)) / 100 };
    })
    .sort((x, y) => Math.abs(y.dif) - Math.abs(x.dif) || x.categoria.localeCompare(y.categoria, 'es'));
  return { a, b, difGasto: (aCentimos(a.gastos) - aCentimos(b.gastos)) / 100, porCategoria };
}
