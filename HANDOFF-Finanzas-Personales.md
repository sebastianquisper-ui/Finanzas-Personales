# Traspaso: "Mis Finanzas" → app propia (PWA + Firebase)

Documento para Claude Code. Describe qué hace hoy la app (un artifact de claude.ai), qué hay que reemplazar y cómo reconstruirla en este repositorio.

- **Repo:** `sebastianquisper-ui/Finanzas-Personales` (público)
- **Publicación:** GitHub Pages
- **Backend:** Firebase, plan Spark (gratis, sin tarjeta)
- **Proyecto Firebase:** `finanzas-personales-edb47`
- **Ya configurado en la consola:** Authentication con Google habilitado, Firestore (edición Standard, modo producción, reglas cerradas) y una app web registrada.
- **Idioma de la interfaz:** español. **Moneda:** soles (S/).

> **Regla de seguridad.** El repo es público. Nunca subas contraseñas, claves de cuenta de servicio, archivos `.env` con secretos ni datos reales de gastos o ingresos. El `firebaseConfig` de la app web no es secreto (identifica el proyecto); lo que protege los datos son las reglas de Firestore.

---

## 1. Cómo es la app hoy (versión 2 en claude.ai)

Es un solo archivo HTML (~940 KB, de los cuales ~205 KB son Chart.js v4.4.0 pegado dentro y ~500 KB son dos copias del icono). Sin framework. Pensada para celular (se usa desde Android).

### Estructura de pantallas

- **Pantalla de acceso** con contraseña (se reemplaza por Google, ver sección 2).
- **Cabecera:** icono de la app, título "Mis Finanzas", botón para **ocultar montos** (difumina todos los números) y botón **Más opciones**.
- **Barra inferior** con 4 pestañas y un botón central flotante **+**: Inicio, Movimientos, [+], Presupuesto, Metas.
- **Hojas inferiores (bottom sheets)** para todos los formularios: registrar/editar movimiento, transferencia, meta, aporte, menú.

### Inicio

1. **Dos billeteras**, Digital y Efectivo, como tarjetas seleccionables. Cada una muestra su **saldo registrado** (todos los ingresos − todos los gastos de ese medio, incluidas las transferencias). La seleccionada se ve oscura con el saldo en dorado. Entre ambas hay un botón redondo **⇄** que abre la transferencia.
2. **Selector de periodo:** Día, Semana, Mes, Año, con flechas y botón "hoy". La semana empieza en lunes.
3. **Tarjetas** de Ingresos, Gastos y Balance del periodo (no cuentan las transferencias).
4. **Aviso de presupuesto** si alguna categoría llegó al 70 % (ámbar) o al 100 % (rojo). Al tocarlo lleva a Presupuesto.
5. **Gastos por categoría:** gráfico de dona con el total en el centro y una leyenda con monto y porcentaje. **Tocar una categoría de la leyenda abre Movimientos ya filtrado** por esa categoría.
6. **Tendencia del periodo:** barras de ingresos y gastos.
7. **Últimos movimientos** (5) con enlace "Ver todos".
8. **Comparar dos periodos** (desplegable): periodos A y B con tipo y fecha; muestra ingresos, gastos, balance, diferencia de gasto (A − B) y diferencia por categoría.

### Movimientos

- Selector Digital / Efectivo, selector de periodo, **búsqueda** (por nota, categoría o monto), filtros por tipo (Todos, Gastos, Ingresos), por categoría (chips con scroll horizontal) y un chip **"Todo el historial"** que ignora el periodo.
- Lista **agrupada por día** ("Hoy", "Ayer", "sábado 26 sep") con el neto del día.
- **Tocar un movimiento lo abre para editarlo.** Ahí también se elimina; al eliminar aparece un aviso con **Deshacer** durante 6 segundos.

### Registrar un movimiento (hoja inferior)

- Tres opciones arriba: **Gasto**, **Ingreso**, **Transferir**.
- Campo de monto grande (teclado numérico, acepta coma o punto).
- **Medio:** Digital / Efectivo.
- **Categoría como botones** (chips) y un chip "+ Otra" para crear una nueva escribiendo su nombre.
- **Fecha** con atajos "Hoy" y "Ayer" y selector de fecha.
- Nota opcional. Enter guarda.
- Al guardar un gasto que lleva una categoría al 70 % o al 100 % de su presupuesto del mes, aparece un aviso.

### Transferencias entre Digital y Efectivo

- Se registran como **dos movimientos enlazados** por un mismo `transferId`: un gasto en el medio de origen y un ingreso en el de destino, ambos con categoría "Transferencia".
- **No cuentan** en los ingresos, gastos, balance del periodo, gráficos, comparaciones ni presupuestos. **Sí cuentan** en el saldo de cada billetera.
- Al editar una transferencia se actualizan monto, fecha y nota de las dos patas; al eliminarla se eliminan las dos. La dirección no se edita (se borra y se crea otra).

### Presupuesto

- Del **mes actual del calendario**, separado por medio (Digital / Efectivo).
- Resumen total y, por categoría de gasto: gastado / tope, barra (verde por debajo de 70 %, ámbar de 70 % a 99 %, roja desde 100 %), texto "Te quedan S/ X" o "Te pasaste por S/ X", y campo para editar el tope.

### Metas de ahorro

- Cada meta tiene nombre, monto objetivo y **fecha límite opcional**.
- Se muestra el avance con barra. Con fecha límite calcula cuánto ahorrar **al mes** para llegar a tiempo; si ya se cumplió muestra "¡Meta cumplida!".
- **Aportar o retirar:** el dinero de las metas se lleva aparte y **no cambia** el saldo de Digital ni Efectivo. No se puede retirar más de lo ahorrado.

### Más opciones

- Apariencia: Automático (sigue el celular), Claro u Oscuro. Se recuerda en el dispositivo.
- Ocultar montos.
- **Exportar respaldo (JSON):** descarga un archivo con todo el perfil. Si la descarga no está disponible, muestra el texto para copiarlo.
- Bloquear perfil (vuelve a pedir la contraseña).

### Categorías por defecto

- **Gasto:** ComerRico, Almuerzos, Tecnología, Pasajes, Extras
- **Ingreso:** Sueldo, Propina, Venta, Regalo
- El usuario puede agregar más desde el formulario.

### Diseño (conservar)

- **Fuentes:** Fraunces (títulos y cifras grandes) e IBM Plex Sans (texto), desde Google Fonts.
- **Colores, modo claro:** `--paper #F2EFE6`, `--card #FBFAF5`, `--ink #17211B`, `--ink-soft #5A655D`, `--line #DDD7C6`, `--gold #C99A2E`, `--green #2F7A55`, `--red #B3452D`, `--amber #B8842B`.
- **Modo oscuro:** `--paper #111713`, `--card #1A221D`, `--ink #ECE8DA`, `--gold #E0B348`, `--green #4FA57A`, `--red #E0806A`. Sigue el sistema, con opción manual.
- **Paleta de categorías en los gráficos:** `#C99A2E, #2F7A55, #7A6BB0, #B3452D, #8C9A8E, #4C8AA6, #9B6B43, #6B8E4E, #B0578D, #5F7391`.
- El elemento característico son las **dos billeteras** arriba (la activa oscura con saldo dorado). Lo demás es sobrio.
- **Icono de la app:** un cerdo con lentes y billetes (ilustración dorada y negra). Hay que conservarlo. Se usa como icono de la app, en la cabecera y en la pantalla de acceso. Los PNG de 192 y 512 px están en el HTML actual codificados en base64; al migrar, sacarlos a archivos normales del repo.
- Fechas y textos en español, moneda en soles (`S/`), formato `es-PE`.
- Interacciones: hojas inferiores, botón flotante central, avisos con "Deshacer", respeto de `prefers-reduced-motion`.

### Modelo de datos actual

Un solo documento por perfil con esta forma:

```json
{
  "movimientos": [
    { "id": "1727400000000_ab12c", "tipo": "gasto | ingreso", "categoria": "Almuerzos",
      "monto": 12.5, "fecha": "2026-09-27", "nota": "", "medio": "digital | efectivo",
      "transferId": "opcional, solo en transferencias" }
  ],
  "presupuestos": { "digital": { "Almuerzos": 200 }, "efectivo": {} },
  "categoriasGasto": ["ComerRico", "Almuerzos", "Tecnología", "Pasajes", "Extras"],
  "categoriasIngreso": ["Sueldo", "Propina", "Venta", "Regalo"],
  "metas": [
    { "id": "...", "nombre": "Laptop nueva", "objetivo": 3200, "limite": "2027-05-28 o vacío",
      "aportes": [ { "id": "...", "monto": 850, "fecha": "2026-09-23" } ] }
  ]
}
```

Notas del código actual:

- Las fechas se guardan como texto `YYYY-MM-DD` en hora **local** (Perú) y se comparan por rango. Es importante no usar `toISOString()` para fechas locales: de noche daría el día siguiente.
- En `aportes`, un `monto` negativo es un retiro.
- Hay migraciones heredadas que se deben conservar al importar: movimientos sin `medio` cuentan como `digital`; el campo antiguo `efectivoMovs` se convierte en movimientos con `medio: "efectivo"` y categoría "Efectivo"; presupuestos planos pasan a `digital`.

---

## 2. Qué depende de claude.ai (y hay que reemplazar)

| Hoy | Problema | Reemplazo |
|---|---|---|
| `claude.use('db')`, documento `profiles/<hash>` | Solo existe dentro de claude.ai | **Firestore** |
| Acceso por contraseña: se calcula SHA-256 y ese hash es el nombre del documento | Quien conozca o adivine el hash puede leer el perfil. No es un inicio de sesión real | **Firebase Authentication con Google**; los datos se guardan bajo el `uid` del usuario |
| Respaldo en `localStorage` si no hay base de datos | Los datos quedan solo en un navegador | Firestore con persistencia local (modo sin conexión) |
| Chart.js pegado dentro del HTML | Archivo enorme, difícil de mantener | Instalar como dependencia (npm) o cargar desde CDN |
| Icono PNG en base64 dentro del HTML | Peso y desorden | Archivos de imagen normales en el repo |

**La contraseña actual no se migra ni se guarda en ningún lado.** El nuevo acceso es solo con Google.

---

## 3. Arquitectura propuesta

- **Sitio estático** en GitHub Pages. Recomendado: Vite + JavaScript (o TypeScript) sin framework pesado. Si se usa React, mantenerlo simple.
- **Firebase SDK modular** (`firebase/app`, `firebase/auth`, `firebase/firestore`). Configuración en `src/firebase-config.js` con el `firebaseConfig` que da la consola (se puede copiar desde Configuración del proyecto → Tus apps).
- **Inicio de sesión:** `signInWithPopup` con `GoogleAuthProvider`. En celular, si el popup da problemas, usar `signInWithRedirect`.
- **Base de datos con persistencia sin conexión** activada (`persistentLocalCache`), para que funcione en el metro o sin datos.
- **PWA:** `manifest.webmanifest` (nombre "Mis Finanzas", `display: standalone`, colores del tema, iconos 192 y 512 px) y un service worker que guarde en caché el "cascarón" de la app.
- **Ruta base:** si el sitio se publica en `sebastianquisper-ui.github.io/Finanzas-Personales/`, configurar `base: '/Finanzas-Personales/'` en Vite y que el manifest y el service worker usen esa ruta.
- **Despliegue:** GitHub Actions que construye y publica en GitHub Pages en cada push a `main`.

### Estructura de datos en Firestore

Un documento gigante con todos los movimientos crecería hasta chocar con el límite de tamaño de Firestore (1 MB por documento). Se separa así:

```
users/{uid}/config/main
    categoriasGasto:   ["ComerRico", "Almuerzos", ...]
    categoriasIngreso: ["Sueldo", "Propina", ...]
    presupuestos:      { digital: { "Almuerzos": 200 }, efectivo: {} }

users/{uid}/movimientos/{id}
    tipo, categoria, monto, fecha ("YYYY-MM-DD"), nota, medio, transferId (opcional)

users/{uid}/metas/{id}
    nombre, objetivo, limite (opcional), aportes: [ { id, monto, fecha } ]
```

Las dos patas de una transferencia comparten `transferId`; al crearlas o borrarlas conviene usar un **batch** de Firestore para que nunca quede una sola.

Para cargar el periodo visible, consultar por `fecha` (rango) y filtrar por `medio` en el cliente, así se cuidan las lecturas gratuitas (50 000 al día).

### Reglas de seguridad de Firestore (obligatorias)

Cada usuario solo puede leer y escribir lo suyo. Reemplazar las reglas actuales (`if false`) por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Validar además en el cliente y, si se puede, en las reglas: `monto` numérico mayor que 0, `tipo` solo `gasto` o `ingreso`, `medio` solo `digital` o `efectivo`, `fecha` con formato `YYYY-MM-DD`; en metas, `objetivo` mayor que 0.

### Dominios autorizados

Para que el inicio de sesión con Google funcione desde el sitio publicado, agregar `sebastianquisper-ui.github.io` en Firebase Console → Authentication → Configuración → Dominios autorizados. (`localhost` ya viene autorizado para desarrollo.)

---

## 4. Migración de datos existentes

Los datos actuales viven en el guardado de claude.ai, no en Firebase. Para llevarlos:

1. **La app actual ya tiene el botón "Exportar respaldo (JSON)"** (Más opciones). Descarga `{ app, version, exportado, perfil }`, donde `perfil` tiene la forma de la sección 1.
2. **En la app nueva** se agrega **"Importar desde JSON"**, que lee ese archivo, aplica las migraciones heredadas si hacen falta y escribe movimientos, presupuestos, categorías y metas en Firestore bajo el `uid` de quien inició sesión (respetando `transferId`).
3. El archivo exportado contiene datos personales de dinero: **no se sube al repo**. Añadir los JSON de respaldo a `.gitignore` y borrarlos del celular cuando termine.

---

## 5. Plan sugerido de trabajo

1. Crear el proyecto (Vite), instalar `firebase` y `chart.js`, y conectar `firebaseConfig`.
2. Inicio de sesión con Google y pantalla de acceso nueva (sin contraseña).
3. Modelo de datos en Firestore + reglas de seguridad + pruebas de que un usuario no puede leer los datos de otro.
4. Portar las pantallas: tarjetas, periodos, gráficos, lista de movimientos, modal.
5. Portar presupuestos, comparación de periodos, transferencias, metas y la billetera Efectivo.
6. Importar datos desde JSON.
7. PWA: manifest, service worker, iconos, prueba de instalación en Android.
8. GitHub Actions y publicación en GitHub Pages; autorizar el dominio en Firebase.
9. Revisión final: sin secretos en el repo, reglas probadas, funciona sin conexión.

## 6. Criterios de "terminado"

- Iniciar sesión con Google y ver solo mis datos.
- Registrar, ver y borrar movimientos, en Digital y en Efectivo.
- Presupuestos, comparación de periodos, transferencias y metas funcionan igual que en la app actual.
- Puedo importar mis datos anteriores desde el JSON.
- Se instala en el celular con icono y nombre propios, y abre a pantalla completa.
- Ningún secreto ni dato personal en el repositorio.

---

## 7. Prompt sugerido para iniciar en Claude Code

> Lee `HANDOFF-Finanzas-Personales.md` en la raíz del repo. Vamos a reconstruir "Mis Finanzas" (versión 2, con transferencias y metas) como PWA con Firebase (Auth con Google + Firestore) y publicarla en GitHub Pages. Empieza por el punto 1 del plan (Vite + Firebase + Chart.js) y confírmame la estructura antes de portar las pantallas. Recuerda: el repo es público, no subas secretos ni datos reales.
