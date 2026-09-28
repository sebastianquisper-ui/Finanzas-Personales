import { h } from '../dom.js';
import { cerrarSesion } from '../auth.js';
import { iconoApp } from './icono.js';

// Cascarón provisional con sesión iniciada; las pantallas reales llegan en el punto 4.
export function pantallaApp(user) {
  const nombre = user.displayName?.split(' ')[0] || user.email;
  return h(
    'div',
    { class: 'app' },
    h(
      'header',
      { class: 'cabecera' },
      iconoApp('cabecera-icono'),
      h('h1', {}, 'Mis Finanzas'),
      h('button', { class: 'boton-texto', type: 'button', onClick: () => cerrarSesion() }, 'Cerrar sesión')
    ),
    h(
      'main',
      { class: 'contenido' },
      h('p', {}, `Hola, ${nombre}.`),
      h('p', { class: 'texto-suave' }, 'Sesión iniciada. Las pantallas se portan en el siguiente paso.')
    )
  );
}
