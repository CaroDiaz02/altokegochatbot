/**
 * ALTOKEGO - AUTENTICACIÓN Y ROLES (SARMIENTO, SAN JUAN)
 */

const AltokeAuth = (function () {
  'use strict';

  // Repositorio de usuarios Demo
  const USERS = {
    'pasajero@altokego.com.ar': {
      id: 'usr_pasajero_01',
      name: 'Lucía Torres',
      email: 'pasajero@altokego.com.ar',
      role: 'pasajero',
      phone: '+54 264 455-1200'
    },
    'conductor@altokego.com.ar': {
      id: 'usr_conductor_01',
      name: 'Carlos Mendoza',
      email: 'conductor@altokego.com.ar',
      role: 'conductor',
      phone: '+54 264 404-1234',
      vehicle: 'Fiat Cronos Gris',
      plate: 'AF-123-JK'
    },
    'admin@altokego.com.ar': {
      id: 'usr_admin_01',
      name: 'Admin Sarmiento',
      email: 'admin@altokego.com.ar',
      role: 'admin'
    }
  };

  let currentUser = null;

  // Notificación visual rápida
  function notify(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = "background: #323232; color: #fff; padding: 10px 16px; border-radius: 6px; margin-top: 10px; font-size: 14px;";
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Cambiar entre pantallas/vistas
  function switchView(role) {
    const authView = document.getElementById('authView');
    const passengerView = document.getElementById('passengerView');
    const driverView = document.getElementById('driverView');
    const adminView = document.getElementById('adminView');

    // Ocultar todas las pantallas
    if (authView) authView.style.display = 'none';
    if (passengerView) passengerView.style.display = 'none';
    if (driverView) driverView.style.display = 'none';
    if (adminView) adminView.style.display = 'none';

    if (!role) {
      if (authView) authView.style.display = 'flex';
      return;
    }

    if (role === 'pasajero') {
      if (passengerView) passengerView.style.display = 'block';

      // 1. Iniciar el chat de AltokeGo inmediatamente
      if (typeof window.initAltokeChat === 'function') {
        window.initAltokeChat();
      }

      // 2. Renderizar / redimensionar el mapa GPS
      if (window.AltokeMap) {
        setTimeout(() => {
          if (typeof window.AltokeMap.init === 'function') {
            window.AltokeMap.init();
          }
          if (typeof window.AltokeMap.invalidateSize === 'function') {
            window.AltokeMap.invalidateSize();
          }
        }, 150);
      }
    } else if (role === 'conductor') {
      if (driverView) driverView.style.display = 'block';

      // 3. Cargar el panel de control del conductor con MongoDB
      if (typeof window.loadDriverDashboard === 'function') {
        window.loadDriverDashboard();
      }
    } else if (role === 'admin') {
      if (adminView) adminView.style.display = 'block';

      // 4. Cargar la tabla de administración con todos los datos y métodos de pago
      if (typeof window.loadAdminDashboard === 'function') {
        window.loadAdminDashboard();
      }
    }
  }

  // Iniciar Sesión
  function login(email) {
    const key = (email || '').trim().toLowerCase();
    let user = USERS[key];

    if (!user) {
      if (key.includes('conductor') || key.includes('carlos')) {
        user = USERS['conductor@altokego.com.ar'];
      } else if (key.includes('admin')) {
        user = USERS['admin@altokego.com.ar'];
      } else {
        user = { id: 'usr_custom', name: email.split('@')[0] || 'Pasajero', email: key, role: 'pasajero' };
      }
    }

    currentUser = user;
    try {
      localStorage.setItem('altokego_session_user', JSON.stringify(user));
    } catch (e) {}

    notify(`¡Bienvenido/a ${user.name}!`);
    switchView(user.role);
    return true;
  }

  // Cerrar Sesión
  function logout() {
    currentUser = null;
    try {
      localStorage.removeItem('altokego_session_user');
    } catch (e) {}
    notify('Sesión cerrada.');
    switchView(null);
  }

  // Inicializar Eventos
  function init() {
    // 1. Eventos de botones de acceso rápido (Demo)
    const btnPass = document.getElementById('quickLoginPassenger');
    const btnDriver = document.getElementById('quickLoginDriver');
    const btnAdmin = document.getElementById('quickLoginAdmin');

    if (btnPass) btnPass.onclick = () => login('pasajero@altokego.com.ar');
    if (btnDriver) btnDriver.onclick = () => login('conductor@altokego.com.ar');
    if (btnAdmin) btnAdmin.onclick = () => login('admin@altokego.com.ar');

    // 2. Evento del Formulario
    const form = document.getElementById('authLoginForm');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('authEmailInput');
        login(input ? input.value : 'pasajero@altokego.com.ar');
      };
    }

    // 3. Botones de Cierre de Sesión
    ['passengerLogoutBtn', 'driverLogoutBtn', 'adminLogoutBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = logout;
    });

    // 4. Restaurar sesión guardada
    try {
      const saved = JSON.parse(localStorage.getItem('altokego_session_user'));
      if (saved && saved.role) {
        currentUser = saved;
        switchView(saved.role);
        return;
      }
    } catch (e) {}

    switchView(null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { login, logout, switchView };
})();

window.AltokeAuth = AltokeAuth;