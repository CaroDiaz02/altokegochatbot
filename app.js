/**
 * ALTOKEGO - Sarmiento, San Juan, Argentina
 * Sistema de viajes simplificado con mapa OpenStreetMap y cobros con Mercado Pago.
 */

(function () {
  'use strict';

  // --- REPRODUCTOR DE SONIDOS SIMPLIFICADO ---
  const SoundFX = {
    audioCtx: null,
    init() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
    },
    play(freq, duration) {
      try {
        this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) { /* Audio bloqueado hasta la primera interacción */ }
    }
  };

  // --- UBICACIONES DE SARMIENTO, SAN JUAN ---
  const LOCATIONS_SARMIENTO = {
    plaza: { name: 'Plaza San Martín, Media Agua', lat: -31.9822, lng: -68.4331 },
    hospital: { name: 'Hospital Ventarrón, Media Agua', lat: -31.9850, lng: -68.4350 },
    municipalidad: { name: 'Municipalidad de Sarmiento', lat: -31.9815, lng: -68.4320 },
    terminal: { name: 'Terminal de Ómnibus Media Agua', lat: -31.9800, lng: -68.4360 },
    losBerros: { name: 'Los Berros, Sarmiento', lat: -31.9420, lng: -68.6630 }
  };

  // --- ESTADO GLOBAL DE LA APLICACIÓN ---
  const State = {
    botStep: 'destination',
    trip: {
      origin: LOCATIONS_SARMIENTO.plaza,
      destination: LOCATIONS_SARMIENTO.hospital,
      vehicleName: 'Altoke Auto',
      price: 1500, // Precio en Pesos Argentinos (ARS)
      paymentMethod: 'Mercado Pago',
      driver: {
        name: 'Carlos Mendoza',
        car: 'Fiat Cronos Gris',
        plate: 'AF-123-JK',
        rating: 4.9
      },
      status: 'idle'
    }
  };

  // --- REFERENCIAS AL DOM ---
  let els = {};

  function refreshDOMElements() {
    els = {
      messagesContainer: document.getElementById('messagesContainer'),
      messagesBody: document.getElementById('messagesBody'),
      quickRepliesBar: document.getElementById('quickRepliesBar'),
      typingBubble: document.getElementById('typingBubble'),
      messageInput: document.getElementById('messageInput'),
      sendMessageBtn: document.getElementById('sendMessageBtn'),
      toastContainer: document.getElementById('toastContainer')
    };
  }

  // --- MAPA REAL CON LEAFLET / OPENSTREETMAP ---
  const AltokeMap = {
    map: null,
    markerDriver: null,
    markerOrigin: null,
    markerDest: null,
    routeLine: null,

    init() {
      const mapContainer = document.getElementById('map');
      if (!mapContainer || this.map) return;

      // Inicializa el mapa centrado en Media Agua, Sarmiento, San Juan
      this.map = L.map('map').setView([State.trip.origin.lat, State.trip.origin.lng], 14);

      // Capa de mapa real en tiempo real de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.updateMarkers();
    },

    updateMarkers() {
      if (!this.map) return;

      if (this.markerOrigin) this.map.removeLayer(this.markerOrigin);
      if (this.markerDest) this.map.removeLayer(this.markerDest);
      if (this.routeLine) this.map.removeLayer(this.routeLine);

      // Marcadores de Origen y Destino
      this.markerOrigin = L.marker([State.trip.origin.lat, State.trip.origin.lng])
        .addTo(this.map)
        .bindPopup(`<b>Origen:</b> ${State.trip.origin.name}`);

      this.markerDest = L.marker([State.trip.destination.lat, State.trip.destination.lng])
        .addTo(this.map)
        .bindPopup(`<b>Destino:</b> ${State.trip.destination.name}`);

      // Línea de ruta entre puntos
      const coords = [
        [State.trip.origin.lat, State.trip.origin.lng],
        [State.trip.destination.lat, State.trip.destination.lng]
      ];
      this.routeLine = L.polyline(coords, { color: '#00a884', weight: 4 }).addTo(this.map);
      this.map.fitBounds(this.routeLine.getBounds(), { padding: [30, 30] });
    },

    simulateDriverMovement(onFinish) {
      if (!this.map) return;

      let step = 0;
      const totalSteps = 100;
      const start = [State.trip.origin.lat, State.trip.origin.lng];
      const end = [State.trip.destination.lat, State.trip.destination.lng];

      if (this.markerDriver) this.map.removeLayer(this.markerDriver);
      this.markerDriver = L.marker(start).addTo(this.map).bindPopup('🚗 Conductor en camino');

      const interval = setInterval(() => {
        step++;
        const lat = start[0] + ((end[0] - start[0]) * step) / totalSteps;
        const lng = start[1] + ((end[1] - start[1]) * step) / totalSteps;

        this.markerDriver.setLatLng([lat, lng]);

        if (step >= totalSteps) {
          clearInterval(interval);
          if (onFinish) onFinish();
        }
      }, 100);
    }
  };

  // --- UTILIDADES ---
  function getTime() {
    const d = new Date();
    return `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, '0')} ${d.getHours() >= 12 ? 'pm' : 'am'}`;
  }

  function showToast(msg) {
    refreshDOMElements();
    if (!els.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function scrollToBottom() {
    refreshDOMElements();
    if (els.messagesBody) {
      els.messagesBody.scrollTop = els.messagesBody.scrollHeight;
    }
  }

  function showTyping(ms = 800) {
    refreshDOMElements();
    if (els.typingBubble) els.typingBubble.style.display = 'block';
    scrollToBottom();
    return new Promise(res => setTimeout(() => {
      if (els.typingBubble) els.typingBubble.style.display = 'none';
      res();
    }, ms));
  }

  // --- MENSAJES ---
  function addMessage(sender, text) {
    refreshDOMElements();
    if (!els.messagesContainer) return;

    const isUser = sender === 'user';
    const row = document.createElement('div');
    row.className = `wa-message-row ${isUser ? 'user-row' : 'bot-row'}`;
    row.style.cssText = `margin-bottom: 10px; text-align: ${isUser ? 'right' : 'left'};`;
    row.innerHTML = `
      <div class="wa-message-bubble ${isUser ? 'outgoing' : 'incoming'}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: ${isUser ? '#dcf8c6' : '#ffffff'}; max-width: 80%; text-align: left; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
        <div class="bubble-content-text">${text}</div>
        <div class="bubble-meta" style="font-size: 10px; color: #999; text-align: right; margin-top: 4px;">
          <span class="bubble-time">${getTime()}</span>
        </div>
      </div>
    `;
    els.messagesContainer.appendChild(row);
    scrollToBottom();
    SoundFX.play(isUser ? 440 : 660, 0.1);
  }

  function setQuickReplies(chips) {
    refreshDOMElements();
    if (!els.quickRepliesBar) return;
    els.quickRepliesBar.innerHTML = '';
    if (!chips || !chips.length) {
      els.quickRepliesBar.style.display = 'none';
      return;
    }
    els.quickRepliesBar.style.display = 'flex';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.className = 'quick-chip-btn';
      btn.style.cssText = 'padding: 6px 12px; background: #ffffff; border: 1px solid #00a884; color: #00a884; border-radius: 16px; cursor: pointer; font-size: 13px; white-space: nowrap;';
      btn.textContent = chip.label;
      btn.onclick = chip.action;
      els.quickRepliesBar.appendChild(btn);
    });
  }

  // --- FLUJO DE LA CONVERSACIÓN Y RESERVA ---
  function initBot() {
    refreshDOMElements();
    if (!els.messagesContainer) return;
    
    els.messagesContainer.innerHTML = '';
    AltokeMap.init();

    addMessage('bot', '¡Hola! 👋 Bienvenido a <strong>AltokeGo Sarmiento</strong>. Te conectamos al instante en Media Agua y zonas cercanas.');
    setTimeout(async () => {
      await showTyping();
      addMessage('bot', `📍 Ubicación actual: <strong>${State.trip.origin.name}</strong>.<br>¿A dónde deseas viajar?`);
      
      setQuickReplies([
        { label: 'Hospital Media Agua', action: () => selectDestination(LOCATIONS_SARMIENTO.hospital, 1500) },
        { label: 'Municipalidad', action: () => selectDestination(LOCATIONS_SARMIENTO.municipalidad, 1200) },
        { label: 'Terminal de Ómnibus', action: () => selectDestination(LOCATIONS_SARMIENTO.terminal, 1400) },
        { label: 'Los Berros', action: () => selectDestination(LOCATIONS_SARMIENTO.losBerros, 4500) }
      ]);
    }, 500);
  }

  async function selectDestination(destObj, priceARS) {
    State.trip.destination = destObj;
    State.trip.price = priceARS;
    
    addMessage('user', `Voy a: ${destObj.name}`);
    AltokeMap.updateMarkers();

    await showTyping();
    addMessage('bot', `Perfecto. El costo estimado hacia <strong>${destObj.name}</strong> es de <strong>$ ${priceARS.toLocaleString('es-AR')} ARS</strong>.`);
    
    setQuickReplies([
      { label: '💳 Pagar con Mercado Pago', action: () => startMercadoPagoPayment() },
      { label: '💵 Pagar en Efectivo', action: () => confirmTrip('Efectivo') }
    ]);
  }

  // --- INTEGRACIÓN CON MERCADO PAGO ---
  function startMercadoPagoPayment() {
    State.trip.paymentMethod = 'Mercado Pago';
    addMessage('user', 'Seleccioné Mercado Pago');

    const mpCheckoutUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=DEMO_ALTOKEGO_${Date.now()}`;

    addMessage('bot', `
      Haz clic abajo para abonar <strong>$ ${State.trip.price.toLocaleString('es-AR')} ARS</strong> mediante Mercado Pago:<br><br>
      <a href="${mpCheckoutUrl}" target="_blank" style="display:inline-block; padding:10px 15px; background:#009ee3; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
        <i class="fa-solid fa-wallet"></i> Pagar $ ${State.trip.price.toLocaleString('es-AR')} ARS con Mercado Pago
      </a>
    `);

    setQuickReplies([
      { label: '✅ Ya pagué, solicitar auto', action: () => confirmTrip('Mercado Pago') }
    ]);
  }

  async function confirmTrip(method) {
    State.trip.paymentMethod = method;
    addMessage('user', `Confirmar viaje con ${method}`);
    await showTyping(1000);

    // 💾 GUARDAR EN MONGODB A TRAVÉS DEL BACKEND
    try {
      const response = await fetch('http://localhost:3000/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengerName: 'Lucía Torres',
          origin: State.trip.origin,
          destination: State.trip.destination,
          priceARS: State.trip.price,
          paymentMethod: method,
          status: 'pending'
        })
      });
      const data = await response.json();
      if (data.success && data.trip) {
        State.trip.id = data.trip._id;
      }
    } catch (e) {
      console.warn('No se pudo guardar el viaje en MongoDB (modo offline).');
    }

    addMessage('bot', `🚗 <strong>¡Viaje Confirmado y Registrado!</strong><br>Conductor: <strong>${State.trip.driver.name}</strong> (${State.trip.driver.car})<br>Patente: <strong>${State.trip.driver.plate}</strong>.<br>Llegada estimada en 3 minutos.`);
    setQuickReplies([]);

    AltokeMap.simulateDriverMovement(async () => {
      addMessage('bot', '🏁 <strong>¡Has llegado a tu destino!</strong> Gracias por viajar con AltokeGo en Sarmiento.');
      
      // Actualizar estado a completado en MongoDB
      if (State.trip.id) {
        await fetch(`http://localhost:3000/api/trips/${State.trip.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
      }

      showToast('¡Viaje finalizado con éxito!');
    });
  }

  // --- ENVIAR MENSAJE DESDE INPUT ---
  function handleSendMessage() {
    refreshDOMElements();
    if (!els.messageInput) return;
    const txt = els.messageInput.value.trim();
    if (!txt) return;
    addMessage('user', txt);
    els.messageInput.value = '';

    setTimeout(async () => {
      await showTyping();
      addMessage('bot', 'Entendido. Selecciona una opción sugerida o un destino para calcular tu tarifa.');
    }, 600);
  }

  // --- PANELES DE CONTROL (CONDUCTOR Y ADMIN) ---
  async function loadDriverDashboard() {
    try {
      const res = await fetch('http://localhost:3000/api/trips');
      const data = await res.json();
      if (!data.success) return;

      const container = document.getElementById('driverRequestsContainer');
      if (!container) return;

      const acceptedTrips = data.trips.filter(t => t.status === 'completed' || t.status === 'accepted');
      
      // Métricas
      const totalTripsEl = document.getElementById('driverTotalTrips');
      const totalEarningsEl = document.getElementById('driverTotalEarnings');
      
      if (totalTripsEl) totalTripsEl.textContent = acceptedTrips.length;
      if (totalEarningsEl) {
        const totalEarnings = acceptedTrips.reduce((acc, t) => acc + (t.priceARS || 0), 0);
        totalEarningsEl.textContent = `$ ${totalEarnings.toLocaleString('es-AR')} ARS`;
      }

      // Solicitudes pendientes
      const pending = data.trips.filter(t => t.status === 'pending');
      if (pending.length === 0) {
        container.innerHTML = '<p style="color: #666;">No hay solicitudes de viaje pendientes en Media Agua.</p>';
        return;
      }

      container.innerHTML = '';
      pending.forEach(trip => {
        const card = document.createElement('div');
        card.style.cssText = 'border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #fff;';
        card.innerHTML = `
          <div>
            <p style="margin: 0 0 5px;"><strong>Origen:</strong> ${trip.origin.name}</p>
            <p style="margin: 0 0 5px;"><strong>Destino:</strong> ${trip.destination.name}</p>
            <p style="margin: 0; color: #00a884; font-weight: bold;">Tarifa: $ ${(trip.priceARS || 0).toLocaleString('es-AR')} ARS (${trip.paymentMethod})</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.updateTripStatus('${trip._id}', 'accepted')" style="padding: 8px 14px; background: #00a884; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Aceptar</button>
            <button onclick="window.updateTripStatus('${trip._id}', 'rejected')" style="padding: 8px 14px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Rechazar</button>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (e) {
      console.error('Error cargando panel de conductor:', e);
    }
  }

  async function loadAdminDashboard() {
    try {
      const res = await fetch('http://localhost:3000/api/trips');
      const data = await res.json();
      if (!data.success) return;

      const tbody = document.getElementById('adminTripsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      data.trips.forEach(trip => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';
        row.innerHTML = `
          <td style="padding: 10px; font-size: 11px; color: #666;">${trip._id}</td>
          <td style="padding: 10px;">${trip.passengerName || 'Lucía Torres'}</td>
          <td style="padding: 10px;">${trip.origin.name}</td>
          <td style="padding: 10px;">${trip.destination.name}</td>
          <td style="padding: 10px; font-weight: bold; color: #111;">$ ${(trip.priceARS || 0).toLocaleString('es-AR')}</td>
          <td style="padding: 10px;"><span style="padding: 3px 8px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-size: 12px; font-weight: bold;">${trip.paymentMethod}</span></td>
          <td style="padding: 10px;"><span style="font-weight: bold; color: ${trip.status === 'completed' ? '#00a884' : (trip.status === 'rejected' ? '#dc3545' : '#f59e0b')};">${trip.status}</span></td>
        `;
        tbody.appendChild(row);
      });
    } catch (e) {
      console.error('Error cargando panel admin:', e);
    }
  }

  window.updateTripStatus = async function(tripId, newStatus) {
    await fetch(`http://localhost:3000/api/trips/${tripId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    loadDriverDashboard();
    loadAdminDashboard();
  };

  // --- LISTENERS E INICIALIZACIÓN ---
  function bindEvents() {
    refreshDOMElements();
    if (els.sendMessageBtn) els.sendMessageBtn.onclick = handleSendMessage;
    if (els.messageInput) {
      els.messageInput.onkeypress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
      };
    }
  }

  // Exponer funciones globales para invocación desde auth.js
  window.initAltokeChat = function () {
    bindEvents();
    initBot();
  };

  window.loadDriverDashboard = loadDriverDashboard;
  window.loadAdminDashboard = loadAdminDashboard;

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
  });
})();