// Sonido sintetizado: no descarga archivos ni necesita instalar una aplicación.
// CAMBIA SOLO ESTE NOMBRE y guarda para probar otro sonido al añadir una bebida.
// Opciones: "copas", "hielos", "campanita", "burbuja", "confirmacion".
// Déjalo en "" para desactivar el sonido y conservar la vibración.
const SONIDO_ACTIVO = "";

// Son aproximaciones sintetizadas, no grabaciones reales.
const SONIDOS = {
  copas: { // Dos tintineos brillantes, como un brindis.
    frecuencias: [1850, 2760, 4120], golpes: [0, 0.075],
    duracion: 0.25, volumen: 0.035, afinacion: 1.08,
  },
  hielos: { // Tres pequeños golpes agudos y secos.
    frecuencias: [2400, 3600], golpes: [ 0, 0.13],
    duracion: 0.19, volumen: 0.03, afinacion: 1,
  },
  campanita: { // Una campana suave, con una cola más larga.
    frecuencias: [1046.5, 2093, 3139.5], golpes: [0],
    duracion: 0.48, volumen: 0.045, afinacion: 1,
  },
  burbuja: { // Un pequeño «pop» que desciende de tono.
    frecuencias: [680, 1020], golpes: [0],
    duracion: 0.12, volumen: 0.055, afinacion: 1, descenso: 0.35,
  },
  confirmacion: { // Dos notas ascendentes de confirmación.
    frecuencias: [660, 1320], golpes: [0, 0.11],
    duracion: 0.18, volumen: 0.04, afinacion: 1.25,
  },
};

export function createCartFeedback() {
  let context;
  let lastPlayed = -Infinity;
  let disposed = false;

  function chink() {
    if (disposed || context.state !== "running") return;
    const now = context.currentTime;
    // Evita acumular volumen cuando se pulsa varias veces seguidas.
    if (now - lastPlayed < 0.12) return;
    lastPlayed = now;
    // Si hay una errata en el nombre, conserva el sonido de copas.
    const sonido = SONIDOS[SONIDO_ACTIVO] ?? SONIDOS.copas;
    sonido.golpes.forEach((delay, hit) => {
      sonido.frecuencias.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const start = now + delay;
        oscillator.type = "sine";
        const tono = frequency * sonido.afinacion ** hit;
        oscillator.frequency.setValueAtTime(tono, start);
        if (sonido.descenso) {
          oscillator.frequency.exponentialRampToValueAtTime(tono * sonido.descenso, start + sonido.duracion);
        }
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(sonido.volumen / (index + 1), start + 0.003);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + sonido.duracion);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + sonido.duracion + 0.02);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      });
    });
  }

  return {
    play() {
      if (disposed) return;
      try {
        // Se llama directamente desde el clic, nunca desde un efecto.
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          navigator.vibrate?.([70]);
        }
      } catch { /* La vibración es opcional según el navegador. */ }
      if (!SONIDO_ACTIVO) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context ??= new AudioContext();
        if (context.state === "suspended") {
          context.resume().then(chink).catch(() => {});
        } else {
          chink();
        }
      } catch { /* El pedido funciona aunque el dispositivo bloquee el sonido. */ }
    },
    dispose() {
      disposed = true;
      context?.close().catch(() => {});
    },
  };
}
