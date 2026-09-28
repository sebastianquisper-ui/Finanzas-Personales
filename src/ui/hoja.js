import { h } from '../dom.js';
import { icono } from './iconos.js';

// Hoja inferior sobre <dialog>: foco atrapado, Escape y fondo cierran.
export function abrirHoja({ titulo, contenido, alCerrar }) {
  const cuerpo = h('div', { class: 'hoja-cuerpo' }, contenido);
  const dialogo = h(
    'dialog',
    { class: 'hoja', 'aria-label': titulo },
    h('div', { class: 'hoja-asa', 'aria-hidden': 'true' }),
    h(
      'header',
      { class: 'hoja-cabecera' },
      h('h2', {}, titulo),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Cerrar', onClick: () => cerrar() }, icono('cerrar'))
    ),
    cuerpo
  );

  let cerrada = false;
  function cerrar() {
    if (cerrada) return;
    cerrada = true;
    dialogo.close();
    dialogo.remove();
    alCerrar?.();
  }

  dialogo.addEventListener('cancel', (e) => {
    e.preventDefault();
    cerrar();
  });
  // Un clic fuera del contenido cae sobre el propio <dialog> (su ::backdrop).
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) cerrar();
  });

  document.body.append(dialogo);
  dialogo.showModal();
  return { cerrar, dialogo };
}
