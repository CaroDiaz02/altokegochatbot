const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const PORT = 3000;

// --- 1. CONEXIÓN A MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/altokego_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB (AltokeGo)'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// --- 2. MODELO DE VIAJES (Mongoose Schema Actualizado) ---
const TripSchema = new mongoose.Schema({
  passengerName: { type: String, default: 'Lucía Torres' },
  origin: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destination: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  priceARS: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Mercado Pago', 'Efectivo'], default: 'Mercado Pago' },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  driver: {
    name: { type: String, default: 'Carlos Mendoza' },
    car: { type: String, default: 'Fiat Cronos Gris' },
    plate: { type: String, default: 'AF-123-JK' }
  },
  createdAt: { type: Date, default: Date.now }
});

const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

// Tipos de archivos permitidos para el frontend
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// --- 3. SERVIDOR HTTP CON SOPORTE PARA MONGODB ---
const server = http.createServer(async (req, res) => {
  // Configurar CORS para permitir peticiones locales
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- RUTA API: CREAR UN VIAJE (POST /api/trips) ---
  if (req.url === '/api/trips' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const newTrip = new Trip(data);
        const savedTrip = await newTrip.save();
        
        res.writeHead(201, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, trip: savedTrip }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // --- RUTA API: VER TODOS LOS VIAJES (GET /api/trips) ---
  if (req.url === '/api/trips' && req.method === 'GET') {
    try {
      const trips = await Trip.find().sort({ createdAt: -1 });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: true, trips }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // --- RUTA API: ACTUALIZAR ESTADO DEL VIAJE (PATCH /api/trips/:id/status) ---
  if (req.url.startsWith('/api/trips/') && req.method === 'PATCH') {
    const parts = req.url.split('/');
    const tripId = parts[3];
    
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { status } = JSON.parse(body);
        const updatedTrip = await Trip.findByIdAndUpdate(tripId, { status }, { new: true });
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, trip: updatedTrip }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // --- SERVIR ARCHIVOS DEL FRONTEND (HTML, CSS, JS) ---
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 AltokeGo con MongoDB corriendo en http://localhost:${PORT}`);
});