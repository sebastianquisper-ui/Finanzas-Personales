import { h } from '../dom.js';
import { PERIODOS, etiquetaPeriodo, rangoPeriodo } from '../fechas.js';
import { esFecha } from '../modelo.js';
import { compararPeriodos, deMedio } from '../resumen.js';
import { mostrarError } from './aviso.js';
import { monto, vacio } from './componentes.js';

// Lee los dos periodos una sola vez (sin escuchar) cuando se abre la sección o cambian.
export async function cargarComparacion(ctx) {
  const c = ctx.estado.comparacion;
  const ra = rangoPeriodo(c.a.tipo, c.a.ref);
  const rb = rangoPeriodo(c.b.tipo, c.b.ref);
  c.movsA = null;
  c.movsB = null;
  const pedido = (c.pedido = Symbol('pedido'));
  try {
    const [movsA, movsB] = await Promise.all([ctx.datos.movimientosEntre(ra.desde, ra.hasta), ctx.datos.movimientosEntre(rb.desde, rb.hasta)]);
    if (pedido !== c.pedido) return;
    c.movsA = movsA;
    c.movsB = movsB;
    ctx.render();
  } catch (err) {
    mostrarError(err);
  }
}

function selectorPeriodoComparado(ctx, letra) {
  const c = ctx.estado.comparacion;
  const periodo = c[letra];
  const cambiar = (parcial) => {
    c[letra] = { ...periodo, ...parcial };
    cargarComparacion(ctx);
    ctx.render();
  };
  const tipo = h(
    'select',
    { class: 'texto-campo', 'aria-label': `Tipo del periodo ${letra.toUpperCase()}` },
    PERIODOS.map((p) => h('option', { value: p.id, selected: p.id === periodo.tipo }, p.nombre))
  );
  tipo.addEventListener('change', () => cambiar({ tipo: tipo.value }));
  const fecha = h('input', { class: 'texto-campo', type: 'date', value: periodo.ref, 'aria-label': `Fecha del periodo ${letra.toUpperCase()}` });
  fecha.addEventListener('change', () => esFecha(fecha.value) && cambiar({ ref: fecha.value }));
  return h(
    'div',
    { class: 'comparar-periodo' },
    h('span', { class: 'comparar-letra' }, letra.toUpperCase()),
    tipo,
    fecha,
    h('span', { class: 'comparar-etiqueta' }, etiquetaPeriodo(periodo.tipo, periodo.ref))
  );
}

function resultados(ctx) {
  const c = ctx.estado.comparacion;
  if (!c.movsA || !c.movsB) return vacio('Cargando…');
  const medio = ctx.estado.medio;
  const r = compararPeriodos(deMedio(c.movsA, medio), deMedio(c.movsB, medio));
  const fila = (titulo, a, b) => h('tr', {}, h('th', { scope: 'row' }, titulo), h('td', {}, monto(a)), h('td', {}, monto(b)));
  const dif = r.difGasto;
  return [
    h(
      'table',
      { class: 'comparar-tabla' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', { scope: 'col' }, 'A'), h('th', { scope: 'col' }, 'B'))),
      h('tbody', {}, fila('Ingresos', r.a.ingresos, r.b.ingresos), fila('Gastos', r.a.gastos, r.b.gastos), fila('Balance', r.a.balance, r.b.balance))
    ),
    h(
      'p',
      { class: `comparar-diferencia ${dif > 0 ? 'mas' : dif < 0 ? 'menos' : ''}` },
      'Diferencia de gasto (A − B): ',
      monto(dif, { signo: true }),
      h('span', { class: 'texto-suave' }, dif > 0 ? ' · gastaste más en A' : dif < 0 ? ' · gastaste menos en A' : ' · igual')
    ),
    r.porCategoria.length
      ? h(
          'table',
          { class: 'comparar-tabla comparar-categorias' },
          h('caption', {}, 'Gastos por categoría'),
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Categoría'), h('th', { scope: 'col' }, 'A'), h('th', { scope: 'col' }, 'B'), h('th', { scope: 'col' }, 'A − B'))),
          h(
            'tbody',
            {},
            r.porCategoria.map((x) =>
              h('tr', {}, h('th', { scope: 'row' }, x.categoria), h('td', {}, monto(x.a)), h('td', {}, monto(x.b)), h('td', { class: x.dif > 0 ? 'mas' : x.dif < 0 ? 'menos' : '' }, monto(x.dif, { signo: true })))
            )
          )
        )
      : vacio('Sin gastos en ninguno de los dos periodos.'),
  ];
}

export function seccionComparar(ctx) {
  const c = ctx.estado.comparacion;
  const detalles = h(
    'details',
    { class: 'tarjeta comparar', open: c.abierta },
    h('summary', {}, h('h2', {}, 'Comparar dos periodos')),
    h('div', { class: 'comparar-cuerpo' }, selectorPeriodoComparado(ctx, 'a'), selectorPeriodoComparado(ctx, 'b'), c.abierta ? resultados(ctx) : null)
  );
  detalles.addEventListener('toggle', () => {
    if (detalles.open === c.abierta) return;
    c.abierta = detalles.open;
    if (c.abierta && !c.movsA) cargarComparacion(ctx);
    ctx.render();
  });
  return detalles;
}
