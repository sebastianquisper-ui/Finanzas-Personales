import { h } from '../dom.js';

// Mientras no estén los PNG del cerdo en public/icons/, se muestra un sello "S/".
export function iconoApp(clase) {
  const img = h('img', {
    class: clase,
    src: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    alt: '',
    width: 192,
    height: 192,
  });
  img.addEventListener('error', () => {
    img.replaceWith(h('div', { class: `${clase} icono-sello`, 'aria-hidden': 'true' }, 'S/'));
  });
  return img;
}
