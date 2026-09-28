import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  CATEGORIA_TRANSFERENCIA,
  MEDIOS,
  ahorradoEnMeta,
  efectoCentimos,
  esFecha,
  normalizarConfig,
  redondear,
  validarMeta,
  validarMovimiento,
} from './modelo.js';

// Sin conexión, commit() no se resuelve hasta que el servidor confirma, pero la escritura ya
// quedó en la caché local y los listeners ya la muestran: la UI no debe esperar estas promesas.
export function crearDatos(db, uid) {
  const configRef = doc(db, 'users', uid, 'config', 'main');
  const movimientosRef = collection(db, 'users', uid, 'movimientos');
  const metasRef = collection(db, 'users', uid, 'metas');

  function error(mensaje) {
    return Object.assign(new Error(mensaje), { code: 'app/validacion' });
  }

  function limpiarMovimiento(m) {
    const limpio = {
      tipo: m.tipo,
      categoria: m.categoria.trim(),
      monto: m.monto,
      fecha: m.fecha,
      nota: (m.nota ?? '').trim(),
      medio: m.medio,
      creado: m.creado ?? Date.now(),
    };
    if (m.transferId) limpio.transferId = m.transferId;
    const problema = validarMovimiento(limpio);
    if (problema) throw error(problema);
    return limpio;
  }

  // Suma los efectos por medio y los aplica con una sola escritura al documento de configuración.
  function ajustarSaldos(batch, efectos) {
    const saldosCent = {};
    for (const [medio, delta] of efectos) {
      saldosCent[medio] = (saldosCent[medio] ?? 0) + delta;
    }
    for (const medio of Object.keys(saldosCent)) {
      if (saldosCent[medio] === 0) delete saldosCent[medio];
      else saldosCent[medio] = increment(saldosCent[medio]);
    }
    if (Object.keys(saldosCent).length) batch.set(configRef, { saldosCent }, { merge: true });
  }

  async function patasDeTransferencia(transferId) {
    const snap = await getDocs(query(movimientosRef, where('transferId', '==', transferId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return {
    // --- Lecturas ---

    escucharConfig(callback, alError) {
      return onSnapshot(configRef, (snap) => callback(normalizarConfig(snap.data())), alError);
    },

    // Rango inclusivo de fechas "YYYY-MM-DD"; el filtro por medio se hace en el cliente.
    escucharMovimientos(desde, hasta, callback, alError) {
      const q = query(
        movimientosRef,
        where('fecha', '>=', desde),
        where('fecha', '<=', hasta),
        orderBy('fecha', 'desc')
      );
      return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), alError);
    },

    // Solo para acciones explícitas ("Todo el historial", búsqueda, recalcular saldos): lee todo.
    async todosLosMovimientos() {
      const snap = await getDocs(query(movimientosRef, orderBy('fecha', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    escucharMetas(callback, alError) {
      return onSnapshot(metasRef, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), alError);
    },

    // --- Movimientos ---

    crearMovimiento(mov) {
      const datos = limpiarMovimiento(mov);
      const ref = doc(movimientosRef);
      const batch = writeBatch(db);
      batch.set(ref, datos);
      ajustarSaldos(batch, [[datos.medio, efectoCentimos(datos)]]);
      return { id: ref.id, listo: batch.commit() };
    },

    actualizarMovimiento(anterior, cambios) {
      if (anterior.transferId) throw error('Las transferencias se editan con actualizarTransferencia.');
      const datos = limpiarMovimiento({ ...anterior, ...cambios, creado: anterior.creado });
      const batch = writeBatch(db);
      batch.set(doc(movimientosRef, anterior.id), datos);
      ajustarSaldos(batch, [
        [anterior.medio, -efectoCentimos(anterior)],
        [datos.medio, efectoCentimos(datos)],
      ]);
      return batch.commit();
    },

    // Devuelve los documentos borrados para poder deshacer con restaurarMovimientos.
    async eliminarMovimiento(mov) {
      const borrados = mov.transferId ? await patasDeTransferencia(mov.transferId) : [mov];
      const batch = writeBatch(db);
      for (const m of borrados) batch.delete(doc(movimientosRef, m.id));
      ajustarSaldos(batch, borrados.map((m) => [m.medio, -efectoCentimos(m)]));
      return { borrados, listo: batch.commit() };
    },

    restaurarMovimientos(movs) {
      const batch = writeBatch(db);
      for (const m of movs) batch.set(doc(movimientosRef, m.id), limpiarMovimiento(m));
      ajustarSaldos(batch, movs.map((m) => [m.medio, efectoCentimos(m)]));
      return batch.commit();
    },

    // --- Transferencias: dos patas enlazadas por transferId, siempre en el mismo batch ---

    crearTransferencia({ origen, destino, monto, fecha, nota = '' }) {
      if (!MEDIOS.includes(origen) || !MEDIOS.includes(destino) || origen === destino) {
        throw error('Elige dos medios distintos.');
      }
      const transferId = doc(movimientosRef).id;
      const creado = Date.now();
      const comun = { categoria: CATEGORIA_TRANSFERENCIA, monto, fecha, nota, transferId, creado };
      const salida = limpiarMovimiento({ ...comun, tipo: 'gasto', medio: origen });
      const entrada = limpiarMovimiento({ ...comun, tipo: 'ingreso', medio: destino });
      const batch = writeBatch(db);
      batch.set(doc(movimientosRef), salida);
      batch.set(doc(movimientosRef), entrada);
      ajustarSaldos(batch, [
        [origen, efectoCentimos(salida)],
        [destino, efectoCentimos(entrada)],
      ]);
      return { transferId, listo: batch.commit() };
    },

    // La dirección no se edita: solo monto, fecha y nota de ambas patas.
    async actualizarTransferencia(transferId, { monto, fecha, nota }) {
      const patas = await patasDeTransferencia(transferId);
      const batch = writeBatch(db);
      const efectos = [];
      for (const p of patas) {
        const nueva = limpiarMovimiento({ ...p, monto, fecha, nota });
        batch.set(doc(movimientosRef, p.id), nueva);
        efectos.push([p.medio, -efectoCentimos(p)], [p.medio, efectoCentimos(nueva)]);
      }
      ajustarSaldos(batch, efectos);
      return batch.commit();
    },

    // --- Configuración ---

    // Se escribe la lista completa (no arrayUnion) para no perder las categorías por defecto
    // cuando el documento todavía no existe.
    guardarCategorias(tipo, lista) {
      const campo = tipo === 'ingreso' ? 'categoriasIngreso' : 'categoriasGasto';
      const limpia = [...new Set(lista.map((c) => c.trim()).filter(Boolean))];
      return setDoc(configRef, { [campo]: limpia }, { merge: true });
    },

    // tope vacío o 0 elimina el presupuesto de esa categoría.
    definirPresupuesto(medio, categoria, tope) {
      if (!MEDIOS.includes(medio)) throw error('Medio inválido.');
      if (tope && !(tope > 0)) throw error('El tope debe ser mayor que 0.');
      const valor = tope ? tope : deleteField();
      return setDoc(configRef, { presupuestos: { [medio]: { [categoria]: valor } } }, { merge: true });
    },

    // Recalcula los saldos desde todo el historial (tras importar o si alguna vez no cuadran).
    async recalcularSaldos() {
      const movs = await this.todosLosMovimientos();
      const saldosCent = { digital: 0, efectivo: 0 };
      for (const m of movs) saldosCent[m.medio] += efectoCentimos(m);
      await setDoc(configRef, { saldosCent }, { merge: true });
      return saldosCent;
    },

    // --- Metas (su dinero va aparte: no toca los saldos de Digital ni Efectivo) ---

    crearMeta({ nombre, objetivo, limite = '' }) {
      const datos = { nombre: nombre.trim(), objetivo, limite, aportes: [], creado: Date.now() };
      const problema = validarMeta(datos);
      if (problema) throw error(problema);
      const ref = doc(metasRef);
      return { id: ref.id, listo: setDoc(ref, datos) };
    },

    actualizarMeta(meta, { nombre, objetivo, limite = '' }) {
      const datos = { nombre: nombre.trim(), objetivo, limite };
      const problema = validarMeta(datos);
      if (problema) throw error(problema);
      return updateDoc(doc(metasRef, meta.id), datos);
    },

    eliminarMeta(meta) {
      return deleteDoc(doc(metasRef, meta.id));
    },

    // monto > 0 aporta, monto < 0 retira (no más de lo ahorrado).
    aportarAMeta(meta, monto, fecha) {
      monto = redondear(monto);
      if (!Number.isFinite(monto) || monto === 0) throw error('Ingresa un monto distinto de 0.');
      if (monto < 0 && -monto > ahorradoEnMeta(meta)) throw error('No puedes retirar más de lo ahorrado.');
      if (!esFecha(fecha)) throw error('Fecha inválida.');
      const aporte = { id: doc(metasRef).id, monto, fecha };
      return updateDoc(doc(metasRef, meta.id), { aportes: arrayUnion(aporte) });
    },
  };
}
