import { h } from '../dom.js';

export function iconoApp(clase) {
  return h('img', {
    class: clase,
    src: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    alt: '',
    width: 192,
    height: 192,
  });
}
