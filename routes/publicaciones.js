const express = require('express');
const router  = express.Router();
const misControladores = require('../controllers/controllers');
const verificarToken   = require('../middleware/auth');

// --- RUTAS ESTÁTICAS PRIMERO (antes de /:id para evitar colisiones) ---
router.delete('/comentarios/:id',       verificarToken, misControladores.eliminarComentario);
router.post(  '/comentarios/:id/votar', verificarToken, misControladores.votarComentario);

// --- RUTAS PÚBLICAS ---
router.get('/',                misControladores.obtenerPublicaciones);
router.get('/:id',             misControladores.obtenerPublicacion);
router.get('/:id/comentarios', misControladores.obtenerComentarios);

// --- RUTAS PROTEGIDAS (requieren JWT) ---
router.post(  '/',                  verificarToken, misControladores.crearPublicacion);
router.put(   '/:id',               verificarToken, misControladores.actualizarPublicacion);
router.delete('/:id',               verificarToken, misControladores.eliminarPublicacion);
router.post(  '/:id/votar',         verificarToken, misControladores.votarPublicacion);
router.post(  '/:id/comentarios',   verificarToken, misControladores.crearComentario);

module.exports = router;
