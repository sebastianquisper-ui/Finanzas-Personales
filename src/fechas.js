import { fechaLocal } from './modelo.js';

// Nombres propios en vez de Intl: es-PE devuelve "set." según el navegador y queremos "sep".
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const PERIODOS = [
  { id: 'dia', nombre: 'Día' },
  { id: 'semana', nombre: 'Semana' },
  { id: 'mes', nombre: 'Mes' },
  { id: 'anio', nombre: 'Año' },
];

export function aFecha(texto) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(texto, dias) {
  const f = aFecha(texto);
  f.setDate(f.getDate() + dias);
  return fechaLocal(f);
}

function diasDelMes(a, m) {
  return new Date(a, m + 1, 0).getDate();
}

// La semana empieza en lunes.
function lunesDe(texto) {
  const f = aFecha(texto);
  return sumarDias(texto, -((f.getDay() + 6) % 7));
}

export function rangoPeriodo(tipo, ref) {
  const f = aFecha(ref);
  const a = f.getFullYear();
  const m = f.getMonth();
  switch (tipo) {
    case 'dia':
      return { desde: ref, hasta: ref };
    case 'semana': {
      const desde = lunesDe(ref);
      return { desde, hasta: sumarDias(desde, 6) };
    }
    case 'mes':
      return { desde: fechaLocal(new Date(a, m, 1)), hasta: fechaLocal(new Date(a, m, diasDelMes(a, m))) };
    case 'anio':
      return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
    default:
      throw new Error(`Periodo desconocido: ${tipo}`);
  }
}

// Mueve la referencia un periodo; en mes/año se ancla al día 1 para no saltar meses cortos.
export function moverPeriodo(tipo, ref, delta) {
  const f = aFecha(ref);
  switch (tipo) {
    case 'dia':
      return sumarDias(ref, delta);
    case 'semana':
      return sumarDias(ref, 7 * delta);
    case 'mes':
      return fechaLocal(new Date(f.getFullYear(), f.getMonth() + delta, 1));
    case 'anio':
      return fechaLocal(new Date(f.getFullYear() + delta, 0, 1));
    default:
      throw new Error(`Periodo desconocido: ${tipo}`);
  }
}

export function contieneHoy(tipo, ref, hoy = fechaLocal()) {
  const { desde, hasta } = rangoPeriodo(tipo, ref);
  return desde <= hoy && hoy <= hasta;
}

function diaMes(texto) {
  const f = aFecha(texto);
  return `${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`;
}

// "28 may 2027"
export function fechaCorta(texto) {
  return `${diaMes(texto)} ${aFecha(texto).getFullYear()}`;
}

// "Hoy", "Ayer", "sábado 26 sep" (con año si no es el actual).
export function etiquetaDia(texto, hoy = fechaLocal()) {
  if (texto === hoy) return 'Hoy';
  if (texto === sumarDias(hoy, -1)) return 'Ayer';
  const f = aFecha(texto);
  const anio = f.getFullYear() === aFecha(hoy).getFullYear() ? '' : ` ${f.getFullYear()}`;
  return `${DIAS[f.getDay()]} ${diaMes(texto)}${anio}`;
}

export function etiquetaPeriodo(tipo, ref, hoy = fechaLocal()) {
  const f = aFecha(ref);
  switch (tipo) {
    case 'dia':
      return etiquetaDia(ref, hoy);
    case 'semana': {
      const { desde, hasta } = rangoPeriodo('semana', ref);
      if (contieneHoy('semana', ref, hoy)) return 'Esta semana';
      const d = aFecha(desde);
      const h = aFecha(hasta);
      const inicio = d.getMonth() === h.getMonth() ? String(d.getDate()) : diaMes(desde);
      const anio = h.getFullYear() === aFecha(hoy).getFullYear() ? '' : ` ${h.getFullYear()}`;
      return `${inicio} – ${diaMes(hasta)}${anio}`;
    }
    case 'mes':
      return `${MESES[f.getMonth()]} ${f.getFullYear()}`;
    case 'anio':
      return String(f.getFullYear());
    default:
      throw new Error(`Periodo desconocido: ${tipo}`);
  }
}

// Grupos del gráfico de tendencia; el periodo "día" no tiene tendencia.
export function gruposTendencia(tipo, ref) {
  const { desde } = rangoPeriodo(tipo, ref);
  if (tipo === 'semana') {
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(desde, i);
      return { etiqueta: DIAS_CORTOS[aFecha(fecha).getDay()], desde: fecha, hasta: fecha };
    });
  }
  if (tipo === 'mes') {
    const f = aFecha(desde);
    return Array.from({ length: diasDelMes(f.getFullYear(), f.getMonth()) }, (_, i) => {
      const fecha = sumarDias(desde, i);
      return { etiqueta: String(i + 1), desde: fecha, hasta: fecha };
    });
  }
  if (tipo === 'anio') {
    const a = aFecha(desde).getFullYear();
    return MESES_CORTOS.map((etiqueta, m) => ({
      etiqueta,
      desde: fechaLocal(new Date(a, m, 1)),
      hasta: fechaLocal(new Date(a, m, diasDelMes(a, m))),
    }));
  }
  return null;
}
