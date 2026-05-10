const express = require('express');
const path    = require('path');
require('dotenv').config();

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos de la carpeta 'public' (CSS, JS del frontend)
app.use(express.static(path.join(__dirname, 'public')));

// --- DEFINICIÓN DE RUTAS ---
// 1. Importamos los archivos de rutas
const authRoutes     = require('./routes/auth');
const publiRoutes    = require('./routes/publicaciones');
const usuariosRoutes = require('./routes/usuarios');

// 2. Vinculamos las rutas a un prefijo (como pide el PDF)
app.use('/api/auth',          authRoutes);      // Rutas de registro y login
app.use('/api/publicaciones', publiRoutes);     // Rutas del muro de la red social
app.use('/api/usuarios',      usuariosRoutes);  // Rutas de perfil y seguimiento

// Ruta principal para cargar el frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ENCENDER SERVIDOR ---
// Usamos el puerto del .env o el 3000 por defecto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
});
