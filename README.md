# 🚀 AltokeGo - Viajes al Instante estilo WhatsApp

Bienvenido a **AltokeGo**, una aplicación web de transporte y viajes con la interfaz y experiencia de usuario idéntica a **WhatsApp Web / Mobile**. Cuenta con un **chatbot interactivo**, **seguimiento GPS en tiempo real con mapas interactivos (Leaflet)** y un **sistema completo de medios de pago (Yape, Plin, Tarjeta y Efectivo)**.

---

## 📸 Características Principales

1. **Diseño Auténtico WhatsApp**:
   - Barra superior verde WhatsApp oficial.
   - Lista lateral de chats con estados en línea, insignias de verificación, miniaturas y contadores de mensajes no leídos.
   - Fondo clásico tipo doodle de WhatsApp con soporte completo para **Modo Claro** y **Modo Oscuro**.
   - Globos de mensaje con colas distintivas, marcas de tiempo y **doble check azul (✓✓)**.
   - Sonidos realistas de envío y recepción sintetizados con **Web Audio API** (sin dependencias de archivos de audio externos).
   - Simulación de notas de voz con reproductor de audio, grabador y adjuntos de ubicación GPS.

2. **🤖 Chatbot Inteligente de Viajes**:
   - Pregunta interactivamente: *¿A dónde quieres ir?*
   - Sugerencias rápidas de destinos en Lima (Jockey Plaza, Aeropuerto Jorge Chávez, San Isidro, Barranco, Centro Histórico) o cualquier destino personalizado por texto libre.
   - **Tarjetas interactivas de WhatsApp Business**:
     - 🛵 **Altoke Moto**: Tarifas económicas para esquivar el tráfico.
     - 🚗 **Altoke Auto**: Sedanes modernos con aire acondicionado (Recomendado).
     - 🚙 **Altoke Confort / XL**: Camionetas SUV familiares.

3. **📍 Seguimiento en Tiempo Real (GPS & Mapa)**:
   - Integración con **Leaflet.js** y mapa urbano Carto Voyager.
   - Animación de radar buscando conductores cercanos.
   - Asignación de conductor en tiempo real: **Carlos Mendoza** (⭐ 4.95, Toyota Yaris Gris, Placa: `ALT-404`).
   - El vehículo avanza en tiempo real a lo largo de las curvas de las calles con rotación dinámica según el rumbo.
   - Tacómetro en vivo: Velocímetro (km/h), tiempo estimado (ETA) y distancia restante.
   - Selector de velocidad de simulación: **1x**, **2x** y **5x**.
   - Botón de pánico / SOS 105 y compartir viaje.

4. **💳 Medios de Pago (Yape / Plin / Tarjetas / Efectivo)**:
   - **Yape / Plin**: Modal interactivo con código QR dinámico, número telefónico (+51 987 404 123) con botón de copiado de un clic y validación instantánea.
   - **Tarjeta Débito / Crédito**: Tarjeta visual estilizada con chip y formulario seguro.
   - **Efectivo**: Selección de pago exacto o vuelto para billetes de S/ 20 o S/ 50.
   - **Recibo Digital y Calificación**: Al completar la carrera, genera el comprobante digital y calificación de 5 estrellas con selección de propina.

---

## 🛠️ Cómo ejecutar localmente

El servidor ya se encuentra disponible en tu máquina local:

```bash
# Para iniciar el servidor si lo reinicias:
cd "C:\Users\cdyl0\.gemini\antigravity-ide\scratch\altokego"
node server.js
```

Abre en tu navegador favorito:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Estructura del Proyecto

- `index.html`: Estructura semántica WhatsApp, modales de pago y recibo digital.
- `styles.css`: Estilos visuales con paleta WhatsApp, microanimaciones, tema claro/oscuro y diseño responsivo.
- `app.js`: Motor conversacional, máquina de estados, sonido Web Audio y gestión de pagos.
- `map.js`: Motor de geolocalización, coordenadas, animación de vehículos y mapa Leaflet.
- `logo.jpg`: Logo oficial generado para AltokeGo.
- `driver.jpg`: Fotografía de perfil del conductor asignado Carlos Mendoza.
- `server.js`: Servidor HTTP ligero en Node.js sin dependencias.
