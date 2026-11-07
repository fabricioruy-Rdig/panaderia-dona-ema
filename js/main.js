/* Panadería Doña Ema: comportamiento de la página
   1. Carruseles (vitrina de la portada y anuncios de encargos)
   2. La pizarra
   3. Pedido por WhatsApp (demostración)
   4. Seguimiento del pedido en tiempo real (simulación)
   5. Cartel "Abierto ahora / Cerrado" con la hora de Montevideo */

const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Carruseles: pasan solos, flechas, puntos y deslizar con el dedo ---------- */
document.querySelectorAll(".vitrina").forEach((vitrina) => {
  const fila = vitrina.querySelector(".vitrina__fila");
  const items = [...fila.children];
  const puntos = vitrina.querySelector(".puntos");
  const ESPERA = vitrina.classList.contains("vitrina--anuncios") ? 6000 : 4000;
  const PAUSA_AL_TOCAR = 12000; // tiempo tranquilo después de usar las flechas
  let actual = 0, temporizador = null, encima = false;

  items.forEach((item, i) => {
    item.setAttribute("aria-label", `${i + 1} de ${items.length}`);
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Ver ${i + 1}`);
    b.addEventListener("click", () => { ir(i); pausar(); });
    puntos.append(b);
  });

  function ir(i) {
    actual = (i + items.length) % items.length;
    fila.style.transform = `translateX(-${actual * 100}%)`;
    [...puntos.children].forEach((b, j) => b.setAttribute("aria-current", j === actual));
    items.forEach((item, j) => (item.inert = j !== actual)); // lo que no se ve, no se puede tocar
  }
  function arrancar(espera = ESPERA) {
    clearTimeout(temporizador);
    if (sinMovimiento) return;
    temporizador = setTimeout(function paso() {
      if (!encima) ir(actual + 1);
      temporizador = setTimeout(paso, ESPERA);
    }, espera);
  }
  const pausar = () => arrancar(PAUSA_AL_TOCAR);

  vitrina.querySelector(".flecha--izq").addEventListener("click", () => { ir(actual - 1); pausar(); });
  vitrina.querySelector(".flecha--der").addEventListener("click", () => { ir(actual + 1); pausar(); });
  vitrina.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { ir(actual - 1); pausar(); }
    if (e.key === "ArrowRight") { ir(actual + 1); pausar(); }
  });
  vitrina.addEventListener("mouseenter", () => (encima = true));
  vitrina.addEventListener("mouseleave", () => (encima = false));
  vitrina.addEventListener("focusin", () => (encima = true));
  vitrina.addEventListener("focusout", () => (encima = false));

  let inicioX = null;
  fila.addEventListener("pointerdown", (e) => { inicioX = e.clientX; });
  fila.addEventListener("pointerup", (e) => {
    if (inicioX === null) return;
    const dx = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 40) { ir(actual + (dx < 0 ? 1 : -1)); pausar(); }
  });

  ir(0);
  arrancar();
});

/* ---------- 2. La pizarra ---------- */
const pizarra = document.getElementById("pizarra");
document.getElementById("abrir-pizarra").addEventListener("click", () => pizarra.showModal());
pizarra.addEventListener("click", (e) => { if (e.target === pizarra) pizarra.close(); });

/* ---------- 3. Pedido por WhatsApp (en la demo se muestra el mensaje) ---------- */
const demo = document.getElementById("demo");
document.querySelectorAll(".js-whatsapp").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("demo-mensaje").textContent = a.dataset.mensaje || "Hola, quiero hacer un pedido.";
    demo.returnValue = "";
    demo.showModal();
  });
});
demo.addEventListener("close", () => { if (demo.returnValue === "enviar") iniciarSeguimiento(); });

/* ---------- 4. Seguimiento del pedido (simulación de unos 45 segundos) ---------- */
const seguimiento = document.getElementById("seguimiento");
const recorrido = document.getElementById("seg-recorrido");
const moto = document.getElementById("seg-moto");
const estado = document.getElementById("seg-estado");
const pasos = [...document.querySelectorAll("#seg-pasos li")];
const largo = recorrido.getTotalLength();
recorrido.style.strokeDasharray = largo;

// Etapas: segundo en que empieza cada una
const ETAPAS = [
  { desde: 0, texto: "¡Recibimos tu pedido! Ya lo estamos anotando." },
  { desde: 5, texto: "Estamos armando tu pedido con pan recién salido." },
  { desde: 12, texto: "En camino" },
  { desde: 42, texto: "¡Entregado! Que lo disfrutes." }
];
const SALIDA = 12, LLEGADA = 42, MINUTOS_VIAJE = 14;
let animacion = null;

function iniciarSeguimiento() {
  cancelAnimationFrame(animacion);
  document.getElementById("seg-numero").textContent = Math.floor(1000 + Math.random() * 9000);
  seguimiento.hidden = false;
  const inicio = performance.now();
  let ultimaEtapa = -1, ultimoTexto = "";

  function cuadro(ahora) {
    const s = (ahora - inicio) / 1000;
    const etapa = ETAPAS.reduce((n, e, i) => (s >= e.desde ? i : n), 0);
    const avance = Math.min(Math.max((s - SALIDA) / (LLEGADA - SALIDA), 0), 1);

    // Moto y línea recorrida
    const punto = recorrido.getPointAtLength(avance * largo);
    moto.setAttribute("transform", `translate(${punto.x} ${punto.y})`);
    recorrido.style.strokeDashoffset = largo * (1 - avance);

    // Pasos y texto (solo se actualiza cuando cambia, para no saturar lectores de pantalla)
    if (etapa !== ultimaEtapa) {
      pasos.forEach((p, i) => p.classList.toggle("hecho", i <= etapa));
      ultimaEtapa = etapa;
    }
    let texto = ETAPAS[etapa].texto;
    if (etapa === 2) {
      const faltan = Math.max(1, Math.ceil(MINUTOS_VIAJE * (1 - avance)));
      texto = `En camino: llega en ${faltan} min.`;
    }
    if (texto !== ultimoTexto) { estado.textContent = texto; ultimoTexto = texto; }

    if (s < LLEGADA) animacion = requestAnimationFrame(cuadro);
  }
  animacion = requestAnimationFrame(cuadro);
}
// Ampliar / reducir el mapa del seguimiento
const velo = document.getElementById("velo-seguimiento");
const botonAmpliar = seguimiento.querySelector(".seguimiento__ampliar");
function ampliar(si) {
  seguimiento.classList.toggle("ampliado", si);
  velo.hidden = !si;
  botonAmpliar.setAttribute("aria-pressed", si);
  botonAmpliar.setAttribute("aria-label", si ? "Reducir el mapa" : "Ampliar el mapa");
}
botonAmpliar.addEventListener("click", () => ampliar(!seguimiento.classList.contains("ampliado")));
velo.addEventListener("click", () => ampliar(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && seguimiento.classList.contains("ampliado")) ampliar(false); });

seguimiento.querySelector(".seguimiento__cerrar").addEventListener("click", () => {
  cancelAnimationFrame(animacion);
  ampliar(false);
  seguimiento.hidden = true;
});

/* ---------- 5. Abierto o cerrado (abrimos todos los días del año) ----------
   Minutos desde la medianoche. 0 = domingo. */
const HORARIOS = {
  0: [450, 780],
  1: [420, 1230], 2: [420, 1230], 3: [420, 1230], 4: [420, 1230], 5: [420, 1230], 6: [420, 1230]
};
const DIAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function horaEnMontevideo() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Montevideo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const valor = (t) => partes.find((p) => p.type === t).value;
  return { dia: DIAS.indexOf(valor("weekday")), minutos: Number(valor("hour")) * 60 + Number(valor("minute")) };
}
function actualizarEstado() {
  const cartel = document.querySelector(".estado");
  const { dia, minutos } = horaEnMontevideo();
  const [abre, cierra] = HORARIOS[dia];
  const abierto = minutos >= abre && minutos < cierra;
  const texto = abierto ? "Abierto ahora" : "Cerrado ahora";
  if (cartel.textContent !== texto) cartel.textContent = texto;
  cartel.className = "estado " + (abierto ? "estado--abierto" : "estado--cerrado");
}
actualizarEstado();
setInterval(actualizarEstado, 60 * 1000);
