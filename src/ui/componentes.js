import { h } from '../dom.js';
import { PERIODOS, contieneHoy, etiquetaDia, etiquetaPeriodo, moverPeriodo } from '../fechas.js';
import { NOMBRE_MEDIO, soles } from '../formato.js';
import { MEDIOS, esTransferencia, fechaLocal } from '../modelo.js';
import { icono } from './iconos.js';

export function segmentado({ opciones, valor, alCambiar, etiqueta, clase = '' }) {
  return h(
    'div',
    { class: `segmentado ${clase}`, role: 'group', 'aria-label': etiqueta },
    opciones.map((o) =>
      h(
        'button',
        {
          type: 'button',
          'aria-pressed': String(o.id === valor),
          onClick: () => o.id !== valor && alCambiar(o.id),
        },
        o.nombre
      )
    )
  );
}

export function monto(valor, opciones = {}) {
  return h('span', { class: `monto ${opciones.clase ?? ''}` }, soles(valor, opciones));
}

export function billeteras(ctx) {
  const { config, medio } = ctx.estado;
  const tarjeta = (m) =>
    h(
      'button',
      {
        type: 'button',
        class: 'billetera',
        'aria-pressed': String(m === medio),
        onClick: () => ctx.cambiar({ medio: m }),
      },
      h('span', { class: 'billetera-nombre' }, NOMBRE_MEDIO[m]),
      config ? monto(config.saldosCent[m] / 100, { clase: 'billetera-saldo cifra' }) : h('span', { class: 'billetera-saldo cifra' }, '…'),
      h('span', { class: 'billetera-nota' }, 'Saldo registrado')
    );
  return h(
    'section',
    { class: 'billeteras', 'aria-label': 'Billeteras' },
    tarjeta(MEDIOS[0]),
    h(
      'button',
      {
        type: 'button',
        class: 'boton-transferir',
        'aria-label': 'Transferir entre Digital y Efectivo',
        onClick: () => ctx.abrirFormulario({ tipo: 'transferencia' }),
      },
      icono('cambiar', 20)
    ),
    tarjeta(MEDIOS[1])
  );
}

export function selectorPeriodo(ctx) {
  const { tipo, ref } = ctx.estado.periodo;
  const hoy = fechaLocal();
  const mover = (delta) => ctx.cambiar({ periodo: { tipo, ref: moverPeriodo(tipo, ref, delta) } });
  return h(
    'section',
    { class: 'periodo', 'aria-label': 'Periodo' },
    segmentado({
      opciones: PERIODOS,
      valor: tipo,
      etiqueta: 'Tipo de periodo',
      alCambiar: (nuevo) => ctx.cambiar({ periodo: { tipo: nuevo, ref: contieneHoy(tipo, ref, hoy) ? hoy : ref } }),
    }),
    h(
      'div',
      { class: 'periodo-navegacion' },
      h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Periodo anterior', onClick: () => mover(-1) }, icono('anterior')),
      h('span', { class: 'periodo-etiqueta', 'aria-live': 'polite' }, etiquetaPeriodo(tipo, ref, hoy)),
      h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Periodo siguiente', onClick: () => mover(1) }, icono('siguiente')),
      contieneHoy(tipo, ref, hoy)
        ? null
        : h('button', { type: 'button', class: 'chip chip-hoy', onClick: () => ctx.cambiar({ periodo: { tipo, ref: hoy } }) }, 'Hoy')
    )
  );
}

function descripcion(m) {
  if (!esTransferencia(m)) return m.categoria;
  const otro = NOMBRE_MEDIO[m.medio === 'digital' ? 'efectivo' : 'digital'];
  return m.tipo === 'gasto' ? `Transferencia a ${otro}` : `Transferencia desde ${otro}`;
}

export function filaMovimiento(ctx, m, { conFecha = false } = {}) {
  const valor = m.tipo === 'ingreso' ? m.monto : -m.monto;
  const detalle = [conFecha ? etiquetaDia(m.fecha) : null, m.nota || null].filter(Boolean).join(' · ');
  return h(
    'li',
    {},
    h(
      'button',
      { type: 'button', class: 'mov-fila', onClick: () => ctx.abrirFormulario({ mov: m }) },
      h(
        'span',
        { class: 'mov-texto' },
        h('span', { class: 'mov-categoria' }, esTransferencia(m) ? h('span', { class: 'mov-transfer', 'aria-hidden': 'true' }, '⇄ ') : null, descripcion(m)),
        detalle ? h('span', { class: 'mov-nota' }, detalle) : null
      ),
      monto(valor, { signo: true, clase: `mov-monto ${esTransferencia(m) ? 'es-transfer' : m.tipo}` })
    )
  );
}

export function vacio(texto) {
  return h('p', { class: 'vacio' }, texto);
}
