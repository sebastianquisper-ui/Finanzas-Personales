import { h } from '../dom.js';
import { cerrarSesion } from '../auth.js';
import { aplicarTema, montosOcultos, temaGuardado } from '../tema.js';
import { segmentado } from './componentes.js';
import { abrirHoja } from './hoja.js';

const TEMAS = [
  { id: 'auto', nombre: 'Automático' },
  { id: 'claro', nombre: 'Claro' },
  { id: 'oscuro', nombre: 'Oscuro' },
];

export function abrirMenu(ctx) {
  const zonaTema = h('div');
  const dibujarTema = () =>
    zonaTema.replaceChildren(
      segmentado({
        opciones: TEMAS,
        valor: temaGuardado(),
        etiqueta: 'Apariencia',
        clase: 'segmentado-ancho',
        alCambiar: (tema) => {
          aplicarTema(tema);
          dibujarTema();
          ctx.render();
        },
      })
    );
  dibujarTema();

  const interruptor = h('button', {
    type: 'button',
    class: 'interruptor',
    role: 'switch',
    'aria-checked': String(montosOcultos()),
    'aria-label': 'Ocultar montos',
    onClick: () => {
      ctx.alternarMontos();
      interruptor.setAttribute('aria-checked', String(montosOcultos()));
    },
  });

  const hoja = abrirHoja({
    titulo: 'Más opciones',
    contenido: h(
      'div',
      { class: 'menu' },
      h('section', { class: 'menu-seccion' }, h('h3', {}, 'Apariencia'), zonaTema),
      h(
        'section',
        { class: 'menu-seccion menu-fila' },
        h('div', {}, h('h3', {}, 'Ocultar montos'), h('p', { class: 'texto-suave' }, 'Difumina las cifras en pantalla.')),
        interruptor
      ),
      h(
        'section',
        { class: 'menu-seccion' },
        h('h3', {}, 'Cuenta'),
        h('p', { class: 'texto-suave' }, ctx.usuario.email ?? ''),
        h(
          'button',
          {
            type: 'button',
            class: 'boton boton-secundario',
            onClick: () => {
              hoja.cerrar();
              cerrarSesion();
            },
          },
          'Cerrar sesión'
        )
      )
    ),
  });
}
