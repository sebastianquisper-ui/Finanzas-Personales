import { aFecha } from './fechas.js';
import { aCentimos, ahorradoEnMeta } from './modelo.js';

// Meses de ahorro que quedan hasta la fecha límite (mínimo 1 si aún no vence).
export function mesesHasta(hoy, limite) {
  if (limite < hoy) return 0;
  const h = aFecha(hoy);
  const l = aFecha(limite);
  const meses = (l.getFullYear() - h.getFullYear()) * 12 + (l.getMonth() - h.getMonth()) - (l.getDate() < h.getDate() ? 1 : 0);
  return Math.max(1, meses);
}

export function progresoMeta(meta, hoy) {
  const ahorrado = ahorradoEnMeta(meta);
  const faltante = Math.max(0, (aCentimos(meta.objetivo) - aCentimos(ahorrado)) / 100);
  const cumplida = faltante === 0;
  const pct = Math.min(1, ahorrado / meta.objetivo);
  let porMes = null;
  let vencida = false;
  if (meta.limite && !cumplida) {
    const meses = mesesHasta(hoy, meta.limite);
    if (meses === 0) vencida = true;
    else porMes = Math.ceil((faltante * 100) / meses) / 100;
  }
  return { ahorrado, faltante, cumplida, pct, porMes, vencida };
}

export function ordenarMetas(metas) {
  return [...metas].sort((a, b) => (a.creado ?? 0) - (b.creado ?? 0));
}
