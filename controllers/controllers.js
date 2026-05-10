const pool = require('../db/index');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. AUTENTICACIÓN
// ==========================================

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, correo, contraseña } = req.body;
        if (!nombre || !correo || !contraseña)
            return res.status(400).json({ error: "Faltan datos obligatorios" });

        const salt = await bcrypt.genSalt(10);
        const passHash = await bcrypt.hash(contraseña, salt);

        const [resultado] = await pool.query(
            "INSERT INTO usuarios (nombre, correo, password_hash) VALUES (?, ?, ?)",
            [nombre, correo, passHash]
        );
        res.status(201).json({ mensaje: "Usuario creado", id: resultado.insertId });
    } catch (error) {
        console.error("Error en registrarUsuario:", error);
        if (error.code === 'ER_DUP_ENTRY')
            return res.status(400).json({ error: "El correo ya existe" });
        res.status(500).json({ error: "Error en el servidor" });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;
        if (!correo || !contraseña)
            return res.status(400).json({ error: "Faltan datos obligatorios" });

        const [usuarios] = await pool.query(
            "SELECT * FROM usuarios WHERE correo = ?", [correo]
        );

        if (usuarios.length === 0)
            return res.status(401).json({ error: "Credenciales inválidas" });

        const usuario = usuarios[0];
        const esValida = await bcrypt.compare(contraseña, usuario.password_hash);
        if (!esValida)
            return res.status(401).json({ error: "Credenciales inválidas" });

        const token = jwt.sign(
            { id: usuario.id_usuario, nombre: usuario.nombre, isAdmin: usuario.is_admin === 1 },
            process.env.JWT_SECRET || 'clave_secreta_provisoria',
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: "Bienvenido",
            token,
            nombre: usuario.nombre,
            id: usuario.id_usuario,
            isAdmin: usuario.is_admin === 1
        });
    } catch (error) {
        console.error("Error en loginUsuario:", error);
        res.status(500).json({ error: "Error en el login" });
    }
};

// ==========================================
// 2. PERFIL / SEGUIDORES
// ==========================================

const obtenerPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const [[usuario]] = await pool.query(
            "SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = ?", [id]
        );
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        const [[{ seguidores }]] = await pool.query(
            "SELECT COUNT(*) AS seguidores FROM seguidores WHERE id_seguido = ?", [id]
        );
        const [[{ seguidos }]] = await pool.query(
            "SELECT COUNT(*) AS seguidos FROM seguidores WHERE id_seguidor = ?", [id]
        );

        let yoSigo = false;
        // req.usuario es poblado por verificarToken.opcional en la ruta,
        // por lo que estará definido si el usuario envió un token válido.
        if (req.usuario) {
            const [[rel]] = await pool.query(
                "SELECT 1 AS existe FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?",
                [req.usuario.id, id]
            );
            yoSigo = !!rel;
        }

        res.json({ ...usuario, seguidores, seguidos, yoSigo });
    } catch (error) {
        console.error("Error en obtenerPerfil:", error);
        res.status(500).json({ error: "Error al obtener perfil" });
    }
};

const obtenerSeguidores = async (req, res) => {
    try {
        const { id } = req.params;
        const [lista] = await pool.query(
            `SELECT u.id_usuario AS id, u.nombre
             FROM seguidores s JOIN usuarios u ON s.id_seguidor = u.id_usuario
             WHERE s.id_seguido = ?`, [id]
        );
        res.json(lista);
    } catch (error) {
        console.error("Error en obtenerSeguidores:", error);
        res.status(500).json({ error: "Error al obtener seguidores" });
    }
};

const obtenerSeguidos = async (req, res) => {
    try {
        const { id } = req.params;
        const [lista] = await pool.query(
            `SELECT u.id_usuario AS id, u.nombre
             FROM seguidores s JOIN usuarios u ON s.id_seguido = u.id_usuario
             WHERE s.id_seguidor = ?`, [id]
        );
        res.json(lista);
    } catch (error) {
        console.error("Error en obtenerSeguidos:", error);
        res.status(500).json({ error: "Error al obtener seguidos" });
    }
};

const seguirUsuario = async (req, res) => {
    try {
        const id_seguido  = parseInt(req.params.id);
        const id_seguidor = req.usuario.id;

        if (id_seguido === id_seguidor)
            return res.status(400).json({ error: "No podés seguirte a vos mismo" });

        await pool.query(
            "INSERT IGNORE INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)",
            [id_seguidor, id_seguido]
        );
        res.json({ mensaje: "Ahora seguís a este usuario", siguiendo: true });
    } catch (error) {
        console.error("Error en seguirUsuario:", error);
        res.status(500).json({ error: "Error al seguir" });
    }
};

const dejarDeSeguir = async (req, res) => {
    try {
        const id_seguido  = parseInt(req.params.id);
        const id_seguidor = req.usuario.id;

        await pool.query(
            "DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?",
            [id_seguidor, id_seguido]
        );
        res.json({ mensaje: "Dejaste de seguir a este usuario", siguiendo: false });
    } catch (error) {
        console.error("Error en dejarDeSeguir:", error);
        res.status(500).json({ error: "Error al dejar de seguir" });
    }
};

// ==========================================
// 3. PUBLICACIONES
// ==========================================

const obtenerPublicaciones = async (req, res) => {
    try {
        const [filas] = await pool.query(
            `SELECT p.id_publi          AS id,
                    p.texto             AS contenido,
                    p.fecha_de_creacion AS created_at,
                    p.me_gusta          AS likes,
                    p.no_me_gusta       AS dislikes,
                    p.total_comentarios AS total_comentarios,
                    p.id_usuario        AS autor_id,
                    u.nombre            AS autor
             FROM publicaciones p
             JOIN usuarios u ON p.id_usuario = u.id_usuario
             ORDER BY p.fecha_de_creacion DESC`
        );
        res.json(filas);
    } catch (error) {
        console.error("Error en obtenerPublicaciones:", error);
        res.status(500).json({ error: "Error al obtener posts", detalle: error.message });
    }
};

const obtenerPublicacion = async (req, res) => {
    try {
        const { id } = req.params;
        const [[fila]] = await pool.query(
            `SELECT p.id_publi          AS id,
                    p.texto             AS contenido,
                    p.fecha_de_creacion AS created_at,
                    p.me_gusta          AS likes,
                    p.no_me_gusta       AS dislikes,
                    p.total_comentarios,
                    p.id_usuario        AS autor_id,
                    u.nombre            AS autor
             FROM publicaciones p
             JOIN usuarios u ON p.id_usuario = u.id_usuario
             WHERE p.id_publi = ?`,
            [id]
        );
        if (!fila)
            return res.status(404).json({ error: "Publicación no encontrada" });

        res.json(fila);
    } catch (error) {
        console.error("Error en obtenerPublicacion:", error);
        res.status(500).json({ error: "Error al obtener la publicación" });
    }
};

const crearPublicacion = async (req, res) => {
    try {
        const { contenido } = req.body;
        const id_usuario = req.usuario.id;

        if (!contenido || !contenido.trim())
            return res.status(400).json({ error: "El contenido no puede estar vacío" });

        if (contenido.trim().length > 500)
            return res.status(400).json({ error: "El contenido no puede superar los 500 caracteres" });

        // Llama al stored procedure que valida el usuario e inserta la publicación
        const [[resultado]] = await pool.query(
            "CALL registrar_publicacion(?, ?)",
            [id_usuario, contenido.trim()]
        );

        res.status(201).json({
            id: resultado.id_publi,
            contenido: contenido.trim(),
            autor: req.usuario.nombre,
            autor_id: id_usuario,
            created_at: new Date(),
            likes: 0,
            dislikes: 0
        });
    } catch (error) {
        console.error("Error al crear post:", error);
        res.status(500).json({ error: "Error al publicar" });
    }
};

const eliminarPublicacion = async (req, res) => {
    try {
        const { id } = req.params;
        const id_usuario = req.usuario.id;
        const isAdmin    = req.usuario.isAdmin;

        let resultado;
        if (isAdmin) {
            [resultado] = await pool.query("DELETE FROM publicaciones WHERE id_publi = ?", [id]);
        } else {
            [resultado] = await pool.query(
                "DELETE FROM publicaciones WHERE id_publi = ? AND id_usuario = ?",
                [id, id_usuario]
            );
        }

        if (resultado.affectedRows === 0)
            return res.status(403).json({ error: "No tenés permiso o el post no existe" });

        res.json({ mensaje: "Publicación eliminada" });
    } catch (error) {
        console.error("Error en eliminarPublicacion:", error);
        res.status(500).json({ error: "Error al borrar" });
    }
};

// FIX #6: Admin puede editar cualquier publicación (igual que puede borrar cualquiera)
const actualizarPublicacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto } = req.body;
        const id_usuario = req.usuario.id;
        const isAdmin    = req.usuario.isAdmin;

        let resultado;
        if (isAdmin) {
            [resultado] = await pool.query(
                "UPDATE publicaciones SET texto = ? WHERE id_publi = ?",
                [texto, id]
            );
        } else {
            [resultado] = await pool.query(
                "UPDATE publicaciones SET texto = ? WHERE id_publi = ? AND id_usuario = ?",
                [texto, id, id_usuario]
            );
        }

        if (resultado.affectedRows === 0)
            return res.status(403).json({ error: "No tenés permiso o el post no existe" });

        res.json({ mensaje: "Publicación actualizada" });
    } catch (error) {
        console.error("Error en actualizarPublicacion:", error);
        res.status(500).json({ error: "Error al actualizar" });
    }
};

// FIX #4: Mapa fijo de columnas — nunca se interpola input externo en el SQL.
// FIX #5: Los votos se persisten en la BD (tabla votos_publicaciones), no en localStorage.
//         El frontend debe consultar /api/usuarios/mis-votos al cargar para sincronizar estado.
const COLS_PUBLI = {
    like:    { sumar: 'me_gusta',    restar: 'no_me_gusta' },
    dislike: { sumar: 'no_me_gusta', restar: 'me_gusta'    },
};

const votarPublicacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body;
        const idUsuario = req.usuario?.id;

        if (!idUsuario) return res.status(401).json({ error: "Se requiere autenticación" });

        const tiposValidos = ['like', 'dislike', 'unlike', 'undislike'];
        if (!tiposValidos.includes(tipo))
            return res.status(400).json({ error: "Tipo inválido" });

        const [[votoExistente]] = await pool.query(
            "SELECT tipo FROM votos_publicaciones WHERE id_usuario = ? AND id_publi = ?",
            [idUsuario, id]
        );

        if (tipo === 'unlike' || tipo === 'undislike') {
            if (votoExistente) {
                // FIX #4: columna elegida del mapa fijo, nunca del input del usuario
                const cols = COLS_PUBLI[votoExistente.tipo];
                await pool.query(
                    `UPDATE publicaciones SET ${cols.sumar} = GREATEST(${cols.sumar} - 1, 0) WHERE id_publi = ?`,
                    [id]
                );
                await pool.query(
                    "DELETE FROM votos_publicaciones WHERE id_usuario = ? AND id_publi = ?",
                    [idUsuario, id]
                );
            }
        } else {
            const cols = COLS_PUBLI[tipo]; // FIX #4: mapa fijo
            if (votoExistente && votoExistente.tipo !== tipo) {
                // Cambiar voto: restar el anterior, sumar el nuevo
                const colsAnt = COLS_PUBLI[votoExistente.tipo];
                await pool.query(
                    `UPDATE publicaciones SET ${cols.sumar} = ${cols.sumar} + 1, ${colsAnt.sumar} = GREATEST(${colsAnt.sumar} - 1, 0) WHERE id_publi = ?`,
                    [id]
                );
                await pool.query(
                    "UPDATE votos_publicaciones SET tipo = ? WHERE id_usuario = ? AND id_publi = ?",
                    [tipo, idUsuario, id]
                );
            } else if (!votoExistente) {
                // Voto nuevo — FIX #5: se persiste en BD
                await pool.query(
                    `UPDATE publicaciones SET ${cols.sumar} = ${cols.sumar} + 1 WHERE id_publi = ?`,
                    [id]
                );
                await pool.query(
                    "INSERT INTO votos_publicaciones (id_usuario, id_publi, tipo) VALUES (?, ?, ?)",
                    [idUsuario, id, tipo]
                );
            }
            // Si ya tenía el mismo voto → no hacer nada
        }

        const [[pub]] = await pool.query(
            "SELECT me_gusta AS likes, no_me_gusta AS dislikes FROM publicaciones WHERE id_publi = ?", [id]
        );

        res.json(pub);
    } catch (error) {
        console.error("Error en votarPublicacion:", error);
        res.status(500).json({ error: "Error al registrar voto" });
    }
};

// ==========================================
// 4. COMENTARIOS
// ==========================================

const obtenerComentarios = async (req, res) => {
    try {
        const { id } = req.params;

        const [filas] = await pool.query(
            `SELECT c.id_coment         AS id,
                    c.texto             AS contenido,
                    c.fecha_de_creacion AS created_at,
                    c.me_gusta          AS likes,
                    c.no_me_gusta       AS dislikes,
                    c.id_usuario        AS autor_id,
                    u.nombre            AS autor
             FROM comentarios c
             JOIN usuarios u ON c.id_usuario = u.id_usuario
             WHERE c.id_publi = ?
             ORDER BY c.fecha_de_creacion ASC`,
            [id]
        );
        res.json(filas);
    } catch (error) {
        console.error("Error al obtener comentarios:", error);
        res.status(500).json({ error: "Error al cargar comentarios" });
    }
};

const crearComentario = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const { contenido } = req.body;
        const id_usuario = req.usuario.id;

        if (!contenido || !contenido.trim())
            return res.status(400).json({ error: "El comentario no puede estar vacío" });

        await conn.beginTransaction();

        // Inserta el comentario
        const [resultado] = await conn.query(
            "INSERT INTO comentarios (id_publi, id_usuario, texto) VALUES (?, ?, ?)",
            [id, id_usuario, contenido.trim()]
        );

        // Actualiza el contador de comentarios en la publicación
        await conn.query(
            "UPDATE publicaciones SET total_comentarios = total_comentarios + 1 WHERE id_publi = ?",
            [id]
        );

        await conn.commit();

        res.status(201).json({
            id: resultado.insertId,
            contenido: contenido.trim(),
            autor: req.usuario.nombre,
            autor_id: id_usuario,
            created_at: new Date(),
            likes: 0,
            dislikes: 0
        });
    } catch (error) {
        await conn.rollback();
        console.error("Error en crearComentario:", error);
        res.status(500).json({ error: "Error al publicar comentario" });
    } finally {
        conn.release();
    }
};

const eliminarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const id_usuario = req.usuario.id;
        const isAdmin    = req.usuario.isAdmin;

        let resultado;
        if (isAdmin) {
            [resultado] = await pool.query("DELETE FROM comentarios WHERE id_coment = ?", [id]);
        } else {
            [resultado] = await pool.query(
                "DELETE FROM comentarios WHERE id_coment = ? AND id_usuario = ?",
                [id, id_usuario]
            );
        }

        if (resultado.affectedRows === 0)
            return res.status(403).json({ error: "No tenés permiso" });

        res.json({ mensaje: "Comentario eliminado" });
    } catch (error) {
        console.error("Error en eliminarComentario:", error);
        res.status(500).json({ error: "Error al borrar comentario" });
    }
};

// FIX #4: Mismo patrón de mapa fijo para comentarios
const COLS_COMENT = {
    like:    { sumar: 'me_gusta',    restar: 'no_me_gusta' },
    dislike: { sumar: 'no_me_gusta', restar: 'me_gusta'    },
};

// FIX #5: Votos de comentarios también persisten en BD (tabla votos_comentarios)
const votarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body;
        const idUsuario = req.usuario?.id;

        if (!idUsuario) return res.status(401).json({ error: "Se requiere autenticación" });

        const tiposValidos = ['like', 'dislike', 'unlike', 'undislike'];
        if (!tiposValidos.includes(tipo))
            return res.status(400).json({ error: "Tipo inválido" });

        const [[votoExistente]] = await pool.query(
            "SELECT tipo FROM votos_comentarios WHERE id_usuario = ? AND id_coment = ?",
            [idUsuario, id]
        );

        if (tipo === 'unlike' || tipo === 'undislike') {
            if (votoExistente) {
                const cols = COLS_COMENT[votoExistente.tipo]; // FIX #4
                await pool.query(
                    `UPDATE comentarios SET ${cols.sumar} = GREATEST(${cols.sumar} - 1, 0) WHERE id_coment = ?`,
                    [id]
                );
                await pool.query(
                    "DELETE FROM votos_comentarios WHERE id_usuario = ? AND id_coment = ?",
                    [idUsuario, id]
                );
            }
        } else {
            const cols = COLS_COMENT[tipo]; // FIX #4
            if (votoExistente && votoExistente.tipo !== tipo) {
                const colsAnt = COLS_COMENT[votoExistente.tipo];
                await pool.query(
                    `UPDATE comentarios SET ${cols.sumar} = ${cols.sumar} + 1, ${colsAnt.sumar} = GREATEST(${colsAnt.sumar} - 1, 0) WHERE id_coment = ?`,
                    [id]
                );
                await pool.query(
                    "UPDATE votos_comentarios SET tipo = ? WHERE id_usuario = ? AND id_coment = ?",
                    [tipo, idUsuario, id]
                );
            } else if (!votoExistente) {
                // FIX #5: persiste en BD
                await pool.query(
                    `UPDATE comentarios SET ${cols.sumar} = ${cols.sumar} + 1 WHERE id_coment = ?`,
                    [id]
                );
                await pool.query(
                    "INSERT INTO votos_comentarios (id_usuario, id_coment, tipo) VALUES (?, ?, ?)",
                    [idUsuario, id, tipo]
                );
            }
        }

        const [[com]] = await pool.query(
            "SELECT me_gusta AS likes, no_me_gusta AS dislikes FROM comentarios WHERE id_coment = ?", [id]
        );

        res.json(com);
    } catch (error) {
        console.error("Error en votarComentario:", error);
        res.status(500).json({ error: "Error al votar comentario" });
    }
};

const misVotos = async (req, res) => {
    try {
        const idUsuario = req.usuario?.id;
        if (!idUsuario) return res.status(401).json({ error: "Se requiere autenticación" });

        const [pubVotos] = await pool.query(
            "SELECT id_publi AS id, tipo AS voto FROM votos_publicaciones WHERE id_usuario = ?",
            [idUsuario]
        );
        const [comVotos] = await pool.query(
            "SELECT id_coment AS id, tipo AS voto FROM votos_comentarios WHERE id_usuario = ?",
            [idUsuario]
        );

        const resultado = [
            ...pubVotos.map(v => ({ tipo: 'post',    id: v.id, voto: v.voto })),
            ...comVotos.map(v => ({ tipo: 'comment', id: v.id, voto: v.voto })),
        ];
        res.json(resultado);
    } catch (error) {
        console.error("Error en misVotos:", error);
        res.status(500).json({ error: "Error al obtener votos" });
    }
};

// ==========================================
// 5. ADMIN
// ==========================================

const listarUsuariosAdmin = async (req, res) => {
    try {
        if (!req.usuario || !req.usuario.isAdmin) {
            return res.status(403).json({ error: "Acceso denegado: se requiere rol administrador" });
        }
        const [usuarios] = await pool.query(
            "SELECT id_usuario, nombre, correo, is_admin FROM usuarios ORDER BY id_usuario ASC"
        );
        res.json(usuarios);
    } catch (error) {
        console.error("Error en listarUsuariosAdmin:", error);
        res.status(500).json({ error: "Error al listar usuarios" });
    }
};

// Banear (eliminar) un usuario — solo admin
const banearUsuario = async (req, res) => {
    try {
        if (!req.usuario || !req.usuario.isAdmin) {
            return res.status(403).json({ error: "Acceso denegado: se requiere rol administrador" });
        }
        const { id } = req.params;
        if (parseInt(id) === req.usuario.id) {
            return res.status(400).json({ error: "No podés banearte a vos mismo" });
        }
        const [resultado] = await pool.query(
            "DELETE FROM usuarios WHERE id_usuario = ?", [id]
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: "Usuario no encontrado" });
        res.json({ mensaje: "Usuario baneado correctamente" });
    } catch (error) {
        console.error("Error en banearUsuario:", error);
        res.status(500).json({ error: "Error al banear usuario" });
    }
};

// Promover/degradar admin — solo admin
const toggleAdmin = async (req, res) => {
    try {
        if (!req.usuario || !req.usuario.isAdmin) {
            return res.status(403).json({ error: "Acceso denegado: se requiere rol administrador" });
        }
        const { id } = req.params;
        if (parseInt(id) === req.usuario.id) {
            return res.status(400).json({ error: "No podés modificar tu propio rol" });
        }
        const [[usuario]] = await pool.query(
            "SELECT id_usuario, is_admin FROM usuarios WHERE id_usuario = ?", [id]
        );
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        const nuevoRol = usuario.is_admin ? 0 : 1;
        await pool.query("UPDATE usuarios SET is_admin = ? WHERE id_usuario = ?", [nuevoRol, id]);
        res.json({ mensaje: nuevoRol ? "Usuario promovido a admin" : "Admin degradado a usuario", isAdmin: !!nuevoRol });
    } catch (error) {
        console.error("Error en toggleAdmin:", error);
        res.status(500).json({ error: "Error al cambiar rol" });
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    obtenerPerfil,
    obtenerSeguidores,
    obtenerSeguidos,
    seguirUsuario,
    dejarDeSeguir,
    obtenerPublicaciones,
    obtenerPublicacion,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    votarPublicacion,
    obtenerComentarios,
    crearComentario,
    eliminarComentario,
    votarComentario,
    misVotos,
    listarUsuariosAdmin,
    banearUsuario,
    toggleAdmin,
};