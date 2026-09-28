import './style.css';
import { mount } from './dom.js';
import { observarSesion, resultadoRedirect } from './auth.js';
import { pantallaAcceso, pantallaCarga } from './ui/login.js';
import { pantallaApp } from './ui/app.js';

const root = document.getElementById('app');
let sesionResuelta = false;
let usuario = null;
let errorRedirect = null;

function render() {
  if (!sesionResuelta) return mount(root, pantallaCarga());
  mount(root, usuario ? pantallaApp(usuario) : pantallaAcceso(errorRedirect));
}

render();

resultadoRedirect().catch((err) => {
  errorRedirect = err;
  if (sesionResuelta && !usuario) render();
});

observarSesion((user) => {
  sesionResuelta = true;
  usuario = user;
  if (user) errorRedirect = null;
  render();
});
