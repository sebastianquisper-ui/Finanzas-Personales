import { h, mount } from '../dom.js';
import { etiquetaDia } from '../fechas.js';
import { NOMBRE_MEDIO } from '../formato.js';
import { MEDIOS, normalizarConfig } from '../modelo.js';
import { agruparPorDia, deMedio, filtrar } from '../resumen.js';
import { filaMovimiento, monto, segmentado, selectorPeriodo, vacio } from './componentes.js';
import { icono } from './iconos.js';

const TIPOS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'gasto', nombre: 'Gastos' },
  { id: 'ingreso', nombre: 'Ingresos' },
];

function chip(texto, activo, alTocar) {
  return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(activo), onClick: alTocar }, texto);
}

export function vistaMovimientos(ctx) {
  const { estado } = ctx;
  const { filtros } = estado;
  const config = estado.config ?? normalizarConfig();
  const cambiarFiltros = (parcial) => ctx.cambiar({ filtros: { ...filtros, ...parcial } });

  const lista = h('div', { class: 'lista-dias', 'aria-live': 'polite' });

  function dibujarLista() {
    const fuente = filtros.historial ? estado.historial : estado.movs;
    if (!fuente) return mount(lista, vacio('Cargando todo el historial…'));
    const visibles = filtrar(deMedio(fuente, estado.medio), filtros);
    if (!visibles.length) {
      const hayFiltro = filtros.texto || filtros.categoria || filtros.tipo !== 'todos';
      return mount(lista, vacio(hayFiltro ? 'Ningún movimiento coincide con la búsqueda.' : 'No hay movimientos en este periodo.'));
    }
    mount(
      lista,
      ...agruparPorDia(visibles).map((dia) =>
        h(
          'section',
          { class: 'dia' },
          h(
            'h3',
            { class: 'dia-cabecera' },
            h('span', {}, etiquetaDia(dia.fecha)),
            dia.soloTransferencias ? null : monto(dia.neto, { signo: true, clase: 'dia-neto' })
          ),
          h('ul', { class: 'lista-movs' }, dia.movs.map((m) => filaMovimiento(ctx, m)))
        )
      )
    );
  }

  const busqueda = h('input', {
    type: 'search',
    class: 'busqueda-campo',
    placeholder: 'Buscar por nota, categoría o monto',
    'aria-label': 'Buscar movimientos',
    value: filtros.texto,
    enterkeyhint: 'search',
  });
  busqueda.addEventListener('input', () => {
    filtros.texto = busqueda.value;
    dibujarLista();
  });

  const categorias = [
    ...(filtros.tipo !== 'ingreso' ? config.categoriasGasto : []),
    ...(filtros.tipo !== 'gasto' ? config.categoriasIngreso : []),
  ];
  // Una categoría filtrada que ya no está en la lista (p. ej. "Efectivo" heredada) sigue visible.
  if (filtros.categoria && !categorias.includes(filtros.categoria)) categorias.push(filtros.categoria);

  dibujarLista();

  return h(
    'div',
    { class: 'vista' },
    segmentado({
      opciones: MEDIOS.map((m) => ({ id: m, nombre: NOMBRE_MEDIO[m] })),
      valor: estado.medio,
      etiqueta: 'Billetera',
      clase: 'segmentado-ancho',
      alCambiar: (medio) => ctx.cambiar({ medio }),
    }),
    filtros.historial ? null : selectorPeriodo(ctx),
    h('label', { class: 'busqueda' }, icono('buscar', 18), busqueda),
    h(
      'div',
      { class: 'filtros' },
      segmentado({
        opciones: TIPOS,
        valor: filtros.tipo,
        etiqueta: 'Tipo de movimiento',
        alCambiar: (tipo) => cambiarFiltros({ tipo, categoria: null }),
      })
    ),
    h(
      'div',
      { class: 'chips-scroll', role: 'group', 'aria-label': 'Filtrar por categoría' },
      chip('Todo el historial', filtros.historial, () => cambiarFiltros({ historial: !filtros.historial })),
      h('span', { class: 'chips-separador', 'aria-hidden': 'true' }),
      categorias.map((c) =>
        chip(c, filtros.categoria === c, () => cambiarFiltros({ categoria: filtros.categoria === c ? null : c }))
      )
    ),
    lista
  );
}
