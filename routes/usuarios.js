const express = require('express');
const router  = express.Router();
const misControladores = require('../controllers/controllers');
const verificarToken   = require('../middleware/auth');

// --- RUTAS ESTÁTICAS PRIMERO (antes de /:id para evitar colisiones) ---

// Admin
router.get(   '/admin/lista',      verificarToken, misControladores.listarUsuariosAdmin);
router.delete('/admin/ban/:id',    verificarToken, misControladores.banearUsuario);
router.patch( '/admin/toggle/:id', verificarToken, misControladores.toggleAdmin);

// Votos del usuario logueado
router.get('/mis-votos', verificarToken, misControladores.misVotos);

// --- RUTAS DINÁMICAS (con parámetro :id) ---

// Perfil — usa middleware OPCIONAL: si hay token lo decodifica (para calcular yoSigo),
// pero no rechaza la request si el usuario no está logueado.
router.get('/:id/perfil', verificarToken.opcional, misControladores.obtenerPerfil);

// Seguidores / Seguidos
router.get('/:id/seguidores', misControladores.obtenerSeguidores);
router.get('/:id/seguidos',   misControladores.obtenerSeguidos);

// Seguir / Dejar de seguir (protegidas)
router.post(  '/:id/seguir', verificarToken, misControladores.seguirUsuario);
router.delete('/:id/seguir', verificarToken, misControladores.dejarDeSeguir);

module.exports = router;