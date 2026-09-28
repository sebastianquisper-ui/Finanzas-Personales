import { h } from '../dom.js';

// Pestañas que se portan en el punto 5 del plan.
export function vistaPendiente(titulo, texto) {
  return h('div', { class: 'vista' }, h('section', { class: 'tarjeta pendiente' }, h('h2', {}, titulo), h('p', { class: 'texto-suave' }, texto)));
}
