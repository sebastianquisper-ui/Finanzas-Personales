import './style.css';
import { mount } from './dom.js';
import { observarSesion, resultadoRedirect } from './auth.js';
import { crearDatos } from './datos.js';
import { db } from './firebase.js';
import { aplicarTema } from './tema.js';
import { pantallaAcceso, pantallaCarga } from './ui/login.js';
import { iniciarApp } from './ui/app.js';

const root = document.getElementById('app');
let sesionResuelta = false;
let usuario = null;
let errorRedirect = null;
let detenerApp = null;

aplicarTema();

function render() {
  detenerApp?.();
  detenerApp = null;
  if (!sesionResuelta) return mount(root, pantallaCarga());
  if (usuario) detenerApp = iniciarApp(root, usuario, crearDatos(db, usuario.uid));
  else mount(root, pantallaAcceso(errorRedirect));
}

render();

resultadoRedirect().catch((err) => {
  errorRedirect = err;
  if (sesionResuelta && !usuario) render();
});

observarSesion((user) => {
  // onAuthStateChanged también avisa al refrescar el token: solo se redibuja si cambia el usuario.
  if (sesionResuelta && user?.uid === usuario?.uid) return;
  sesionResuelta = true;
  usuario = user;
  if (user) errorRedirect = null;
  render();
});
