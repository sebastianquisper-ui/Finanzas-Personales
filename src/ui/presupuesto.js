import { h } from '../dom.js';
import { etiquetaPeriodo } from '../fechas.js';
import { NOMBRE_MEDIO, porcentaje, soles } from '../formato.js';
import { MEDIOS, fechaLocal, normalizarConfig, parsearMonto } from '../modelo.js';
import { estadoPresupuesto } from '../presupuesto.js';
import { mostrarAviso, mostrarError } from './aviso.js';
import { barraProgreso, monto, segmentado } from './componentes.js';

function textoRestante(restante) {
  return restante >= 0
    ? h('span', {}, 'Te quedan ', monto(restante))
    : h('span', { class: 'texto-excedido' }, 'Te pasaste por ', monto(-restante));
}

function campoTope(ctx, medio, fila) {
  const input = h('input', {
    class: 'texto-campo tope-campo',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder: 'Sin tope',
    'aria-label': `Tope mensual de ${fila.categoria}`,
    value: fila.tope ? String(fila.tope) : '',
    enterkeyhint: 'done',
    'data-foco': `tope-${medio}-${fila.categoria}`,
  });
  const guardar = () => {
    const texto = input.value.trim();
    const tope = texto ? parsearMonto(texto) : 0;
    if (Number.isNaN(tope) || tope < 0) {
      mostrarAviso('Escribe un monto válido, por ejemplo 200 o 150,50.');
      input.value = fila.tope ? String(fila.tope) : '';
      return;
    }
    if ((tope || null) === fila.tope) return;
    ctx.datos.definirPresupuesto(medio, fila.categoria, tope).catch(mostrarError);
  };
  input.addEventListener('change', guardar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
  return h('label', { class: 'tope' }, h('span', { class: 'tope-etiqueta' }, 'Tope mensual'), h('span', { class: 'tope-prefijo' }, 'S/'), input);
}

function filaCategoria(ctx, medio, fila) {
  const pct = fila.tope ? fila.gastado / fila.tope : 0;
  return h(
    'li',
    { class: 'presupuesto-fila' },
    h(
      'div',
      { class: 'presupuesto-cabecera' },
      h('span', { class: 'presupuesto-categoria' }, fila.categoria),
      fila.tope ? h('span', { class: `presupuesto-pct nivel-texto-${fila.nivel}` }, porcentaje(fila.gastado, fila.tope)) : null
    ),
    h(
      'p',
      { class: 'presupuesto-detalle' },
      fila.tope ? [monto(fila.gastado), ' de ', monto(fila.tope)] : [monto(fila.gastado), ' gastado · sin tope']
    ),
    fila.tope ? barraProgreso(pct, fila.nivel, `${fila.categoria}: ${porcentaje(fila.gastado, fila.tope)} del tope`) : null,
    fila.tope ? h('p', { class: 'presupuesto-restante' }, textoRestante(fila.restante)) : null,
    campoTope(ctx, medio, fila)
  );
}

export function vistaPresupuesto(ctx) {
  const { estado } = ctx;
  const config = estado.config ?? normalizarConfig();
  const medio = estado.medio;
  const { filas, total } = estadoPresupuesto(estado.movsMes, config, medio);
  const mes = etiquetaPeriodo('mes', fechaLocal());

  return h(
    'div',
    { class: 'vista' },
    segmentado({
      opciones: MEDIOS.map((m) => ({ id: m, nombre: NOMBRE_MEDIO[m] })),
      valor: medio,
      etiqueta: 'Billetera',
      clase: 'segmentado-ancho',
      alCambiar: (m) => ctx.cambiar({ medio: m }),
    }),
    h(
      'section',
      { class: 'tarjeta' },
      h('h2', { class: 'titulo-mes' }, `Presupuesto de ${mes}`),
      total.tope
        ? [
            h('p', { class: 'presupuesto-total cifra' }, monto(total.gastado), h('span', { class: 'texto-suave' }, ' de '), monto(total.tope)),
            barraProgreso(total.gastado / total.tope, total.nivel, `Total: ${porcentaje(total.gastado, total.tope)} del presupuesto`),
            h('p', { class: 'presupuesto-restante' }, textoRestante(total.restante), h('span', { class: 'texto-suave' }, ` · ${porcentaje(total.gastado, total.tope)}`)),
          ]
        : h('p', { class: 'texto-suave' }, `Aún no tienes topes para ${NOMBRE_MEDIO[medio]}. Escribe un monto en cada categoría; se aplica a cada mes.`)
    ),
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Por categoría'), h('ul', { class: 'presupuesto-lista' }, filas.map((f) => filaCategoria(ctx, medio, f))))
  );
}

export function textoAvisoPresupuesto(aviso) {
  if (aviso.nivel === 'excedido') {
    return `${aviso.categoria} pasó su presupuesto: ${soles(aviso.gastado)} de ${soles(aviso.tope)}.`;
  }
  return `${aviso.categoria} va en ${aviso.pct} % de su presupuesto del mes.`;
}
