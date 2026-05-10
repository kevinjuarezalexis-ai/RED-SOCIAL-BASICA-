const express = require('express');
const router = express.Router();
const misControladores = require('../controllers/controllers');

router.post('/register', misControladores.registrarUsuario);
router.post('/login', misControladores.loginUsuario);   // ← faltaba esto

module.exports = router;