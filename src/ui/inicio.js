import { h } from '../dom.js';
import { gruposTendencia } from '../fechas.js';
import { porcentaje } from '../formato.js';
import { FILTROS_INICIALES, deMedio, gastosPorCategoria, ordenarRecientes, tendencia, totales } from '../resumen.js';
import { billeteras, filaMovimiento, monto, selectorPeriodo, vacio } from './componentes.js';
import { graficoDona, graficoTendencia, porcionesDona } from './graficos.js';

function tarjetasResumen(t) {
  const tarjeta = (titulo, valor, clase) =>
    h('div', { class: `resumen-tarjeta ${clase}` }, h('span', { class: 'resumen-titulo' }, titulo), monto(valor, { clase: 'cifra' }));
  return h(
    'section',
    { class: 'resumen', 'aria-label': 'Resumen del periodo' },
    tarjeta('Ingresos', t.ingresos, 'ingreso'),
    tarjeta('Gastos', t.gastos, 'gasto'),
    tarjeta('Balance', t.balance, t.balance < 0 ? 'negativo' : 'balance')
  );
}

function seccionCategorias(ctx, movs) {
  const porCategoria = gastosPorCategoria(movs);
  const titulo = h('h2', {}, 'Gastos por categoría');
  if (!porCategoria.length) return h('section', { class: 'tarjeta' }, titulo, vacio('Sin gastos en este periodo.'));

  const porciones = porcionesDona(porCategoria, ctx.estado.config.categoriasGasto);
  const total = porciones.reduce((s, p) => s + p.total, 0);
  const canvas = h('canvas', { role: 'img', 'aria-label': 'Gráfico de gastos por categoría; el detalle está en la lista.' });

  const leyenda = h(
    'ul',
    { class: 'leyenda' },
    porciones.map((p) => {
      const contenido = [
        h('span', { class: 'leyenda-color', style: `background:${p.color}` }),
        h('span', { class: 'leyenda-nombre' }, p.etiqueta ?? p.categoria),
        monto(p.total, { clase: 'leyenda-monto' }),
        h('span', { class: 'leyenda-pct' }, porcentaje(p.total, total)),
      ];
      return h(
        'li',
        {},
        p.categoria
          ? h(
              'button',
              {
                type: 'button',
                class: 'leyenda-fila',
                'aria-label': `Ver movimientos de ${p.categoria}`,
                onClick: () => ctx.irA('movimientos', { filtros: { ...FILTROS_INICIALES, tipo: 'gasto', categoria: p.categoria } }),
              },
              contenido
            )
          : h('div', { class: 'leyenda-fila' }, contenido)
      );
    })
  );

  const seccion = h(
    'section',
    { class: 'tarjeta' },
    titulo,
    h(
      'div',
      { class: 'dona' },
      canvas,
      h('div', { class: 'dona-centro' }, h('span', { class: 'dona-etiqueta' }, 'Total'), monto(total, { clase: 'cifra' }))
    ),
    leyenda
  );
  ctx.alMontar(() => graficoDona(canvas, porciones));
  return seccion;
}

function seccionTendencia(ctx, movs) {
  const { tipo, ref } = ctx.estado.periodo;
  const grupos = gruposTendencia(tipo, ref);
  if (!grupos) return null;
  const datos = tendencia(movs, grupos);
  const canvas = h('canvas', { role: 'img', 'aria-label': 'Barras de ingresos y gastos del periodo.' });
  ctx.alMontar(() => graficoTendencia(canvas, grupos, datos));
  return h(
    'section',
    { class: 'tarjeta' },
    h(
      'div',
      { class: 'tarjeta-cabecera' },
      h('h2', {}, 'Tendencia del periodo'),
      h(
        'ul',
        { class: 'leyenda-serie', 'aria-label': 'Series' },
        h('li', {}, h('span', { class: 'leyenda-color serie-ingreso' }), 'Ingresos'),
        h('li', {}, h('span', { class: 'leyenda-color serie-gasto' }), 'Gastos')
      )
    ),
    h('div', { class: 'barras' }, canvas)
  );
}

function seccionUltimos(ctx, movs) {
  const ultimos = ordenarRecientes(movs).slice(0, 5);
  return h(
    'section',
    { class: 'tarjeta' },
    h(
      'div',
      { class: 'tarjeta-cabecera' },
      h('h2', {}, 'Últimos movimientos'),
      h('button', { type: 'button', class: 'boton-texto enlace', onClick: () => ctx.irA('movimientos', { filtros: { ...FILTROS_INICIALES } }) }, 'Ver todos')
    ),
    ultimos.length
      ? h('ul', { class: 'lista-movs' }, ultimos.map((m) => filaMovimiento(ctx, m, { conFecha: true })))
      : vacio('Todavía no hay movimientos en este periodo. Toca + para registrar uno.')
  );
}

export function vistaInicio(ctx) {
  const { movs, medio, config } = ctx.estado;
  const movsMedio = deMedio(movs, medio);
  return h(
    'div',
    { class: 'vista' },
    billeteras(ctx),
    selectorPeriodo(ctx),
    tarjetasResumen(totales(movsMedio)),
    config ? seccionCategorias(ctx, movsMedio) : null,
    seccionTendencia(ctx, movsMedio),
    seccionUltimos(ctx, movsMedio)
  );
}
