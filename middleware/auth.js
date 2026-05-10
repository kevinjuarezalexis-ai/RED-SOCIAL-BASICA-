const jwt = require('jsonwebtoken');

/**
 * Middleware OBLIGATORIO — rechaza la request si no hay token válido.
 */
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. Se requiere un token." });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_provisoria');
        next();
    } catch (error) {
        res.status(403).json({ error: "Token inválido o expirado" });
    }
};

/**
 * Middleware OPCIONAL — si hay token lo decodifica y pone req.usuario,
 * pero si no hay token (o es inválido) deja pasar igual sin error.
 * Útil para rutas públicas que cambian de comportamiento si el usuario está logueado.
 */
const verificarTokenOpcional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_provisoria');
        } catch (_) {
            // Token inválido o expirado → se ignora, req.usuario queda undefined
        }
    }

    next();
};

module.exports = verificarToken;
module.exports.opcional = verificarTokenOpcional;
