/**
 * ALTOKEGO - NAVEGACIÓN Y MAPA GPS EN TIEMPO REAL
 * Localización: Media Agua, Sarmiento, San Juan, Argentina
 * Integrado con Leaflet / OpenStreetMap y OSRM (Open Source Routing Machine)
 */

const AltokeMap = (function () {
  'use strict';

  let map = null;
  let driverMarker = null;
  let originMarker = null;
  let destMarker = null;
  let routePolyline = null;
  let searchPulseCircle = null;

  let isSimulating = false;
  let simSpeedMultiplier = 1;
  let simInterval = null;
  let currentStepIndex = 0;
  let currentLeg = 'to_pickup';
  let currentTripData = null;
  let activeLegCoords = [];
  let onMapClickCallback = null;

  // Puntos de referencia en Media Agua / Sarmiento, San Juan
  const PRESET_LOCATIONS = {
    plazaMediaAgua: { name: "Plaza San Martín, Media Agua", lat: -31.9818, lng: -68.4285 },
    hospitalSanRoque: { name: "Hospital Ventarrón, Media Agua", lat: -31.9856, lng: -68.4298 },
    terminalMediaAgua: { name: "Terminal de Ómnibus, Media Agua", lat: -31.9785, lng: -68.4312 },
    losBerros: { name: "Los Berros, Sarmiento", lat: -31.9472, lng: -68.6417 }
  };

  // Cálculo de distancia en km (Haversine)
  function calculateApproxDistanceKm(start, end) {
    const R = 6371;
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLng = (end.lng - start.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // Generador de ruta alternativa si falla OSRM
  function generateFallbackRoute(start, end, numPoints = 40) {
    const coords = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      coords.push([lat, lng]);
    }
    return coords;
  }

  // Consulta de rutas por calles con OSRM
  async function fetchRealRoute(start, end) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          return {
            coords: route.geometry.coordinates.map(c => [c[1], c[0]]),
            distanceKm: Math.max(0.5, parseFloat((route.distance / 1000).toFixed(1))),
            durationMin: Math.max(2, Math.round(route.duration / 60))
          };
        }
      }
    } catch (e) {
      console.warn('Servidor de rutas no disponible, usando trazado estimado.');
    }

    const fallbackCoords = generateFallbackRoute(start, end);
    const dist = calculateApproxDistanceKm(start, end) * 1.2;
    return {
      coords: fallbackCoords,
      distanceKm: Math.max(0.5, parseFloat(dist.toFixed(1))),
      durationMin: Math.max(2, Math.round(dist * 2))
    };
  }

  // Geocodificación inversa con OpenStreetMap Nominatim
  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          const road = data.address.road || 'Calle sin nombre';
          const locality = data.address.town || data.address.village || 'Media Agua';
          return `${road}, ${locality}`;
        }
      }
    } catch (e) {}
    return `Media Agua (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  // Creación de íconos para el mapa
  function createCustomIcon(type) {
    const isCar = type === 'car';
    const bgColor = isCar ? '#009ee3' : (type === 'origin' ? '#00a884' : '#ea4335');
    const iconClass = isCar ? 'fa-car' : (type === 'origin' ? 'fa-location-dot' : 'fa-flag-checkered');

    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="background: ${bgColor}; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #fff;">
          <i class="fa-solid ${iconClass}"></i>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  // Inicialización del mapa
  function init() {
    const mapElement = document.getElementById('map') || document.getElementById('leafletMap');
    if (!mapElement || map) return;

    const initial = PRESET_LOCATIONS.plazaMediaAgua;
    map = L.map(mapElement.id).setView([initial.lat, initial.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    originMarker = L.marker([initial.lat, initial.lng], {
      icon: createCustomIcon('origin')
    }).addTo(map).bindPopup(`<b>Origen:</b> ${initial.name}`);

    map.on('click', async (e) => {
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      if (destMarker) map.removeLayer(destMarker);
      destMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: createCustomIcon('destination') }).addTo(map);
      destMarker.bindPopup(`<b>Destino:</b> ${address}`).openPopup();

      if (typeof onMapClickCallback === 'function') {
        onMapClickCallback({ name: address, lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
  }

  // Geolocalización del navegador
  function useRealGps(onSuccess, onError) {
    if (!navigator.geolocation) return onError && onError('GPS no soportado');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (map) {
          map.setView([lat, lng], 16);
          if (originMarker) originMarker.setLatLng([lat, lng]);
          const address = await reverseGeocode(lat, lng);
          if (onSuccess) onSuccess({ name: address, lat, lng });
        }
      },
      (err) => onError && onError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Simulación de viaje
  async function startTrip(tripDetails, onStatusUpdate, onTripCompleted) {
    currentTripData = tripDetails;
    isSimulating = true;
    currentStepIndex = 0;

    const origin = tripDetails.origin || PRESET_LOCATIONS.plazaMediaAgua;
    const destination = tripDetails.destination || PRESET_LOCATIONS.hospitalSanRoque;

    const driverStart = { lat: origin.lat + 0.003, lng: origin.lng - 0.003 };

    if (driverMarker) map.removeLayer(driverMarker);
    driverMarker = L.marker([driverStart.lat, driverStart.lng], { icon: createCustomIcon('car') }).addTo(map);

    const leg1 = await fetchRealRoute(driverStart, origin);
    const leg2 = await fetchRealRoute(origin, destination);

    currentLeg = 'to_pickup';
    activeLegCoords = leg1.coords;
    drawRoute(activeLegCoords, '#009ee3');

    if (onStatusUpdate) onStatusUpdate('assigned', { eta: `${leg1.durationMin} min` });

    simInterval = setInterval(() => {
      if (!isSimulating) return;

      if (currentStepIndex < activeLegCoords.length - 1) {
        currentStepIndex++;
        const coord = activeLegCoords[currentStepIndex];
        driverMarker.setLatLng(coord);
      } else {
        if (currentLeg === 'to_pickup') {
          currentLeg = 'to_destination';
          currentStepIndex = 0;
          activeLegCoords = leg2.coords;
          drawRoute(activeLegCoords, '#00a884');
          if (onStatusUpdate) onStatusUpdate('arrived_pickup');
        } else {
          isSimulating = false;
          clearInterval(simInterval);
          if (onStatusUpdate) onStatusUpdate('completed');
          if (onTripCompleted) onTripCompleted(currentTripData);
        }
      }
    }, 600 / simSpeedMultiplier);
  }

  function drawRoute(coords, color = '#009ee3') {
    if (routePolyline && map) map.removeLayer(routePolyline);
    if (map) routePolyline = L.polyline(coords, { color, weight: 5 }).addTo(map);
  }

  function cancelTrip() {
    isSimulating = false;
    if (simInterval) clearInterval(simInterval);
    if (routePolyline && map) map.removeLayer(routePolyline);
  }

  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 200);
  }

  return {
    init,
    startTrip,
    cancelTrip,
    useRealGps,
    invalidateSize,
    setOnMapClickCallback: (cb) => { onMapClickCallback = cb; },
    PRESET_LOCATIONS
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  AltokeMap.init();
});