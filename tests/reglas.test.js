import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

let env;
const movOk = {
  tipo: 'gasto',
  categoria: 'Almuerzos',
  monto: 12.5,
  fecha: '2026-09-27',
  nota: '',
  medio: 'digital',
  creado: 1727400000000,
};
const metaOk = { nombre: 'Laptop nueva', objetivo: 3200, limite: '', aportes: [], creado: 1 };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-finanzas',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/ana/movimientos/m1'), movOk);
    await setDoc(doc(db, 'users/ana/metas/meta1'), metaOk);
    await setDoc(doc(db, 'users/ana/config/main'), { categoriasGasto: ['Almuerzos'] });
  });
});

const ana = () => env.authenticatedContext('ana').firestore();
const beto = () => env.authenticatedContext('beto').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

describe('aislamiento entre usuarios', () => {
  test('la dueña lee sus datos', async () => {
    await assertSucceeds(getDoc(doc(ana(), 'users/ana/movimientos/m1')));
    await assertSucceeds(getDocs(collection(ana(), 'users/ana/movimientos')));
    await assertSucceeds(getDoc(doc(ana(), 'users/ana/metas/meta1')));
    await assertSucceeds(getDoc(doc(ana(), 'users/ana/config/main')));
  });

  test('otro usuario no puede leer nada de ella', async () => {
    await assertFails(getDoc(doc(beto(), 'users/ana/movimientos/m1')));
    await assertFails(getDocs(collection(beto(), 'users/ana/movimientos')));
    await assertFails(getDocs(collection(beto(), 'users/ana/metas')));
    await assertFails(getDoc(doc(beto(), 'users/ana/config/main')));
  });

  test('otro usuario no puede escribir ni borrar sus datos', async () => {
    await assertFails(setDoc(doc(beto(), 'users/ana/movimientos/m2'), movOk));
    await assertFails(updateDoc(doc(beto(), 'users/ana/movimientos/m1'), { monto: 1 }));
    await assertFails(deleteDoc(doc(beto(), 'users/ana/movimientos/m1')));
    await assertFails(setDoc(doc(beto(), 'users/ana/config/main'), { categoriasGasto: [] }));
    await assertFails(deleteDoc(doc(beto(), 'users/ana/metas/meta1')));
  });

  test('sin sesión no se lee ni se escribe', async () => {
    await assertFails(getDoc(doc(anonimo(), 'users/ana/movimientos/m1')));
    await assertFails(setDoc(doc(anonimo(), 'users/ana/movimientos/m2'), movOk));
  });

  test('fuera de users/{uid} todo está cerrado', async () => {
    await assertFails(setDoc(doc(ana(), 'otros/x'), { a: 1 }));
    await assertFails(setDoc(doc(ana(), 'users/ana'), { a: 1 }));
    await assertFails(setDoc(doc(ana(), 'users/ana/secreto/x'), { a: 1 }));
    await assertFails(getDocs(collection(ana(), 'users')));
  });
});

describe('validación de movimientos', () => {
  const crear = (datos) => setDoc(doc(ana(), 'users/ana/movimientos/nuevo'), datos);

  test('acepta un movimiento válido y una pata de transferencia', async () => {
    await assertSucceeds(crear(movOk));
    await assertSucceeds(crear({ ...movOk, tipo: 'ingreso', medio: 'efectivo', categoria: 'Transferencia', transferId: 'abc' }));
    await assertSucceeds(crear({ tipo: 'ingreso', categoria: 'Sueldo', monto: 2500, fecha: '2026-09-30', medio: 'digital' }));
  });

  test('rechaza tipo, medio, monto y fecha inválidos', async () => {
    await assertFails(crear({ ...movOk, tipo: 'prestamo' }));
    await assertFails(crear({ ...movOk, medio: 'tarjeta' }));
    await assertFails(crear({ ...movOk, monto: 0 }));
    await assertFails(crear({ ...movOk, monto: -5 }));
    await assertFails(crear({ ...movOk, monto: '12.5' }));
    await assertFails(crear({ ...movOk, fecha: '2026-9-27' }));
    await assertFails(crear({ ...movOk, fecha: '27/09/2026' }));
    await assertFails(crear({ ...movOk, fecha: '2026-09-27T10:00' }));
  });

  test('rechaza campos faltantes, extra o demasiado largos', async () => {
    const { categoria, ...sinCategoria } = movOk;
    await assertFails(crear(sinCategoria));
    await assertFails(crear({ ...movOk, categoria: '' }));
    await assertFails(crear({ ...movOk, admin: true }));
    await assertFails(crear({ ...movOk, nota: 'x'.repeat(501) }));
    await assertFails(crear({ ...movOk, creado: 'ayer' }));
  });

  test('una edición también se valida', async () => {
    await assertSucceeds(updateDoc(doc(ana(), 'users/ana/movimientos/m1'), { monto: 20 }));
    await assertFails(updateDoc(doc(ana(), 'users/ana/movimientos/m1'), { monto: 0 }));
    await assertFails(updateDoc(doc(ana(), 'users/ana/movimientos/m1'), { tipo: 'regalo' }));
  });
});

describe('validación de configuración', () => {
  const ref = () => doc(ana(), 'users/ana/config/main');

  test('acepta escrituras parciales válidas', async () => {
    await assertSucceeds(setDoc(ref(), { saldosCent: { digital: 1250 } }, { merge: true }));
    await assertSucceeds(setDoc(ref(), { presupuestos: { digital: { Almuerzos: 200 } } }, { merge: true }));
  });

  test('rechaza tipos incorrectos y otros documentos', async () => {
    await assertFails(setDoc(ref(), { saldosCent: { digital: 12.5 } }, { merge: true }));
    await assertFails(setDoc(ref(), { saldosCent: { tarjeta: 0 } }, { merge: true }));
    await assertFails(setDoc(ref(), { presupuestos: { otra: {} } }, { merge: true }));
    await assertFails(setDoc(ref(), { categoriasGasto: 'Almuerzos' }, { merge: true }));
    await assertFails(setDoc(ref(), { password: 'x' }, { merge: true }));
    await assertFails(setDoc(doc(ana(), 'users/ana/config/otro'), { categoriasGasto: [] }));
  });
});

describe('validación de metas', () => {
  const crear = (datos) => setDoc(doc(ana(), 'users/ana/metas/nueva'), datos);

  test('acepta metas válidas, con o sin fecha límite', async () => {
    await assertSucceeds(crear(metaOk));
    await assertSucceeds(crear({ ...metaOk, limite: '2027-05-28' }));
    await assertSucceeds(crear({ nombre: 'Viaje', objetivo: 1500, aportes: [{ id: 'a', monto: 100, fecha: '2026-09-01' }] }));
  });

  test('rechaza objetivo, nombre o límite inválidos', async () => {
    await assertFails(crear({ ...metaOk, objetivo: 0 }));
    await assertFails(crear({ ...metaOk, objetivo: -10 }));
    await assertFails(crear({ ...metaOk, nombre: '' }));
    await assertFails(crear({ ...metaOk, limite: 'mayo' }));
    await assertFails(crear({ ...metaOk, aportes: 'ninguno' }));
    await assertFails(crear({ ...metaOk, extra: 1 }));
  });
});
