// Preferencias del dispositivo (no son datos financieros): se quedan en localStorage.
const CLAVE_TEMA = 'mf-tema';
const CLAVE_OCULTAR = 'mf-ocultar-montos';
const oscuroSistema = window.matchMedia('(prefers-color-scheme: dark)');

function leer(clave, porDefecto) {
  try {
    return localStorage.getItem(clave) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura solo esta sesión.
  }
}

// 'auto' | 'claro' | 'oscuro'
export function temaGuardado() {
  return leer(CLAVE_TEMA, 'auto');
}

export function aplicarTema(tema = temaGuardado()) {
  guardar(CLAVE_TEMA, tema);
  const raiz = document.documentElement;
  if (tema === 'claro') raiz.dataset.theme = 'light';
  else if (tema === 'oscuro') raiz.dataset.theme = 'dark';
  else delete raiz.dataset.theme;
  const color = getComputedStyle(raiz).getPropertyValue('--paper').trim();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = color;
}

export function esOscuro() {
  const tema = temaGuardado();
  return tema === 'oscuro' || (tema === 'auto' && oscuroSistema.matches);
}

export function alCambiarTemaSistema(callback) {
  const escuchar = () => {
    if (temaGuardado() === 'auto') {
      aplicarTema('auto');
      callback();
    }
  };
  oscuroSistema.addEventListener('change', escuchar);
  return () => oscuroSistema.removeEventListener('change', escuchar);
}

export function montosOcultos() {
  return leer(CLAVE_OCULTAR, '0') === '1';
}

export function ocultarMontos(ocultar) {
  guardar(CLAVE_OCULTAR, ocultar ? '1' : '0');
  document.body.classList.toggle('montos-ocultos', ocultar);
}
