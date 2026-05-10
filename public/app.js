const API          = '/api/publicaciones';
const API_AUTH     = '/api/auth';
const API_USUARIOS = '/api/usuarios';

// ─── ESTADO LOCAL ────────────────────────────────
const state = {
    publicaciones: [],
    votes: JSON.parse(localStorage.getItem('votes') || '{}'),
    commentsOpen: new Set(),
    darkMode: false,
    menuOpen: false,
    deleteTarget: null,
    currentProfileId: null,        // FIX: guardamos el id del perfil abierto
    currentProfileSiguiendo: false,// FIX: estado de seguimiento actual
    token:   localStorage.getItem('token')  || null,
    usuario: localStorage.getItem('usuario')|| null,
    userId:  localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null,
    isAdmin: localStorage.getItem('isAdmin') === 'true',
};

// ─── HELPERS DE AUTH ────────────────────────────
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
    };
}

function estaLogueado() { return !!state.token; }

// =========================================
//  INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    initCharCounter();
    actualizarUIAuth();
    verificarTokenAlCargar().then(() => cargarPublicaciones());
});

// Verifica si el token guardado sigue siendo válido.
// Si el servidor lo rechaza, cierra la sesión automáticamente.
async function verificarTokenAlCargar() {
    if (!state.token) return;
    try {
        const res = await fetch(`${API_USUARIOS}/mis-votos`, {
            headers: getAuthHeaders()
        });
        if (res.status === 401 || res.status === 403) {
            cerrarSesion();
        } else if (res.ok) {
            // FIX: sincronizar votos del servidor al cargar la página
            const votos = await res.json();
            state.votes = {};
            votos.forEach(v => {
                const key = v.tipo === 'post' ? `post_${v.id}` : `comment_${v.id}`;
                state.votes[key] = v.voto;
            });
            localStorage.setItem('votes', JSON.stringify(state.votes));
        }
    } catch (e) {
        // Error de red real → no cerrar sesión
    }
}

// Carga los votos del usuario desde el servidor y actualiza state.votes
async function sincronizarVotosDelServidor() {
    if (!state.token) return;
    try {
        const res = await fetch(`${API_USUARIOS}/mis-votos`, { headers: getAuthHeaders() });
        if (res.ok) {
            const votos = await res.json();
            state.votes = {};
            votos.forEach(v => {
                const key = v.tipo === 'post' ? `post_${v.id}` : `comment_${v.id}`;
                state.votes[key] = v.voto;
            });
            localStorage.setItem('votes', JSON.stringify(state.votes));
        }
    } catch (e) { /* error de red silencioso */ }
}

function actualizarUIAuth() {
    const headerArea    = document.getElementById('headerUserArea');
    const menuNoSesion  = document.getElementById('menuNoSesion');
    const menuConSesion = document.getElementById('menuConSesion');

    if (estaLogueado()) {
        headerArea.style.display   = 'flex';
        menuNoSesion.style.display = 'none';
        menuConSesion.style.display = 'block';

        const avatar       = document.getElementById('headerAvatar');
        const newPostAvatar= document.getElementById('newPostAvatar');
        const inicial      = state.usuario ? state.usuario[0].toUpperCase() : 'U';

        avatar.textContent        = inicial;
        avatar.style.background   = avatarColor(state.usuario);
        newPostAvatar.textContent = inicial;
        newPostAvatar.style.background = avatarColor(state.usuario);

        document.getElementById('headerUsername').textContent = state.usuario || '';
        if (state.isAdmin) {
            document.getElementById('headerAdminBadge').style.display = 'block';
            document.getElementById('menuAdminBtn').style.display = 'flex';
        } else {
            document.getElementById('menuAdminBtn').style.display = 'none';
        }
    } else {
        headerArea.style.display    = 'none';
        menuNoSesion.style.display  = 'block';
        menuConSesion.style.display = 'none';
    }
}

// =========================================
//  HELPERS VISUALES
// =========================================

/**
 * Genera un color de fondo consistente a partir del nombre del usuario.
 * FIX: antes era una función vacía — no retornaba nada.
 */
function avatarColor(nombre) {
    const colores = [
        '#e74c3c','#e67e22','#f1c40f','#2ecc71',
        '#1abc9c','#3498db','#9b59b6','#e91e63',
        '#00bcd4','#ff5722','#607d8b','#795548'
    ];
    if (!nombre) return colores[0];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
        hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
}

/**
 * Escapa caracteres HTML para evitar XSS.
 * FIX: antes era una función vacía.
 */
function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Muestra un toast de notificación.
 * FIX: antes era una función vacía.
 */
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show' + (isError ? ' toast-error' : '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

/**
 * Formatea una fecha ISO a texto legible.
 * FIX: función faltante — usada en crearPostCard pero nunca definida.
 */
function formatearFecha(fechaISO) {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diffMs  = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMin / 60);
    const diffD   = Math.floor(diffH / 24);

    if (diffMin < 1)  return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH   < 24) return `hace ${diffH} h`;
    if (diffD   < 7)  return `hace ${diffD} día${diffD !== 1 ? 's' : ''}`;

    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Muestra u oculta el estado de carga.
 * FIX: función faltante — llamada en cargarPublicaciones.
 */
function mostrarLoading(visible) {
    document.getElementById('loadingState').style.display = visible ? 'flex' : 'none';
}

/**
 * Muestra un mensaje de error en el feed.
 * FIX: función faltante — llamada en cargarPublicaciones.
 */
function mostrarError(msg) {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'flex';
    emptyState.querySelector('p') && (emptyState.querySelector('p').textContent = msg);
}

/**
 * Inicializa el contador de caracteres del textarea de nueva publicación.
 * FIX: función faltante — llamada en DOMContentLoaded.
 */
function initCharCounter() {
    const textarea = document.getElementById('newPostContent');
    const counter  = document.getElementById('charCounter');
    if (!textarea || !counter) return;
    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        counter.textContent = `${len} / 500`;
        counter.style.color = len > 480 ? '#ef4444' : '';
    });
}

// =========================================
//  MENÚ DROPDOWN
// =========================================

function toggleDropdown() {
    const menu = document.getElementById('dropdownMenu') || document.querySelector('.dropdown-menu');
    if (!menu) return;
    state.menuOpen = !state.menuOpen;
    menu.style.display = state.menuOpen ? 'block' : 'none';
}

function closeDropdown() {
    const menu = document.getElementById('dropdownMenu') || document.querySelector('.dropdown-menu');
    if (menu) menu.style.display = 'none';
    state.menuOpen = false;
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu') && !e.target.closest('.header-user-avatar')) {
        closeDropdown();
    }
});

// =========================================
//  MODAL LOGIN / REGISTER
// =========================================

function showModal(tab = 'login') {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modal-content');

    if (tab === 'login') {
        content.innerHTML = `
            <h2 class="modal-title">Iniciar sesión</h2>
            <div class="modal-field">
                <label>Correo</label>
                <input type="email" id="loginEmail" placeholder="tu@correo.com" class="modal-field-input">
            </div>
            <div class="modal-field">
                <label>Contraseña</label>
                <input type="password" id="loginPass" placeholder="••••••••" class="modal-field-input">
            </div>
            <button class="modal-submit" onclick="hacerLogin()">Entrar</button>
            <p class="modal-switch">¿No tenés cuenta? <a href="#" onclick="showModal('register')">Registrate</a></p>
        `;
    } else {
        content.innerHTML = `
            <h2 class="modal-title">Crear cuenta</h2>
            <div class="modal-field">
                <label>Nombre</label>
                <input type="text" id="registerName" placeholder="Tu nombre" class="modal-field-input">
            </div>
            <div class="modal-field">
                <label>Correo</label>
                <input type="email" id="registerEmail" placeholder="tu@correo.com" class="modal-field-input" oninput="validarEmailRegistro()">
                <span class="field-hint" id="emailHint"></span>
            </div>
            <div class="modal-field">
                <label>Contraseña</label>
                <input type="password" id="registerPass" placeholder="••••••••" class="modal-field-input" oninput="actualizarIndicadorPass()">
                <div class="pass-strength-bar" id="passStrengthBar">
                    <div class="pass-strength-fill" id="passStrengthFill"></div>
                </div>
                <span class="pass-strength-label" id="passStrengthLabel"></span>
                <ul class="pass-requirements" id="passReqs">
                    <li id="req-len">✗ Al menos 8 caracteres</li>
                    <li id="req-upper">✗ Una letra mayúscula</li>
                    <li id="req-num">✗ Un número</li>
                </ul>
            </div>
            <button class="modal-submit" onclick="hacerRegistro()">Registrarse</button>
            <p class="modal-switch">¿Ya tenés cuenta? <a href="#" onclick="showModal('login')">Iniciá sesión</a></p>
        `;
    }

    overlay.style.display = 'flex';
    closeDropdown();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// =========================================
//  AUTH: LOGIN / REGISTRO / LOGOUT
// =========================================

async function hacerLogin() {
    const correo    = document.getElementById('loginEmail').value.trim();
    const contraseña = document.getElementById('loginPass').value;

    if (!correo || !contraseña) { showToast('Completá todos los campos', true); return; }

    try {
        const res  = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contraseña })
        });
        const data = await res.json();

        if (res.ok) {
            // FIX: limpiar votos del usuario anterior antes de setear el nuevo
            state.votes = {};
            localStorage.removeItem('votes');

            state.token   = data.token;
            state.usuario = data.nombre;
            state.userId  = data.id;
            state.isAdmin = data.isAdmin;

            localStorage.setItem('token',   data.token);
            localStorage.setItem('usuario', data.nombre);
            localStorage.setItem('userId',  data.id);
            localStorage.setItem('isAdmin', data.isAdmin);

            closeModal();
            actualizarUIAuth();
            // FIX: sincronizar votos del servidor para este usuario
            sincronizarVotosDelServidor().then(() => cargarPublicaciones());
            showToast(`Bienvenido ${data.nombre}`);
        } else {
            showToast(data.error || 'Credenciales inválidas', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

// ─── VALIDACIÓN REGISTRO ────────────────────────────────

function validarEmailRegistro() {
    const input = document.getElementById('registerEmail');
    const hint  = document.getElementById('emailHint');
    if (!input || !hint) return;
    const val = input.value.trim();
    const ok  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && val.includes('.com');
    hint.textContent  = val ? (ok ? '✓ Correo válido' : '✗ Debe incluir @ y .com') : '';
    hint.style.color  = ok ? '#22c55e' : '#ef4444';
    return ok;
}

function evaluarFortalezaPass(pass) {
    let puntos = 0;
    const tieneLen   = pass.length >= 8;
    const tieneUpper = /[A-Z]/.test(pass);
    const tieneNum   = /[0-9]/.test(pass);
    const tieneEsp   = /[^A-Za-z0-9]/.test(pass);
    if (tieneLen)   puntos++;
    if (tieneUpper) puntos++;
    if (tieneNum)   puntos++;
    if (tieneEsp)   puntos++;
    return { puntos, tieneLen, tieneUpper, tieneNum };
}

function actualizarIndicadorPass() {
    const input = document.getElementById('registerPass');
    if (!input) return;
    const pass = input.value;
    const { puntos, tieneLen, tieneUpper, tieneNum } = evaluarFortalezaPass(pass);

    const fill  = document.getElementById('passStrengthFill');
    const label = document.getElementById('passStrengthLabel');
    const reqLen   = document.getElementById('req-len');
    const reqUpper = document.getElementById('req-upper');
    const reqNum   = document.getElementById('req-num');

    if (!fill) return;

    // Actualizar requisitos
    if (reqLen)   { reqLen.textContent   = (tieneLen   ? '✓' : '✗') + ' Al menos 8 caracteres'; reqLen.style.color   = tieneLen   ? '#22c55e' : '#ef4444'; }
    if (reqUpper) { reqUpper.textContent = (tieneUpper ? '✓' : '✗') + ' Una letra mayúscula';    reqUpper.style.color = tieneUpper ? '#22c55e' : '#ef4444'; }
    if (reqNum)   { reqNum.textContent   = (tieneNum   ? '✓' : '✗') + ' Un número';              reqNum.style.color   = tieneNum   ? '#22c55e' : '#ef4444'; }

    // Barra de fortaleza
    const colores = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
    const labels  = ['', 'Muy débil', 'Débil', 'Media', 'Fuerte'];
    fill.style.width      = pass.length === 0 ? '0' : `${(puntos / 4) * 100}%`;
    fill.style.background = colores[puntos] || '';
    if (label) { label.textContent = pass.length === 0 ? '' : labels[puntos]; label.style.color = colores[puntos] || ''; }
}

async function hacerRegistro() {
    const nombre    = document.getElementById('registerName').value.trim();
    const correo    = document.getElementById('registerEmail').value.trim();
    const contraseña = document.getElementById('registerPass').value;

    if (!nombre || !correo || !contraseña) { showToast('Completá todos los campos', true); return; }

    // Validar email
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && correo.includes('.com');
    if (!emailOk) { showToast('El correo debe incluir @ y .com', true); return; }

    // Validar contraseña
    const { tieneLen, tieneUpper, tieneNum } = evaluarFortalezaPass(contraseña);
    if (!tieneLen)   { showToast('La contraseña necesita al menos 8 caracteres', true); return; }
    if (!tieneUpper) { showToast('La contraseña necesita al menos una mayúscula', true); return; }
    if (!tieneNum)   { showToast('La contraseña necesita al menos un número', true); return; }

    try {
        const res  = await fetch(`${API_AUTH}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, contraseña })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Cuenta creada. Iniciá sesión.');
            showModal('login');
        } else {
            showToast(data.error || 'Error al registrarse', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

function cerrarSesion() {
    state.token   = null;
    state.usuario = null;
    state.userId  = null;
    state.isAdmin = false;
    // FIX: limpiar votos al cerrar sesión para que no persistan entre cuentas
    state.votes   = {};

    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('votes');

    actualizarUIAuth();
    cargarPublicaciones();
    showToast('Sesión cerrada');
    closeDropdown();
    // FIX: recargar la página para limpiar cualquier estado visual residual
    // (avatar, nombre en el compositor de publicaciones, etc.)
    setTimeout(() => location.reload(), 800);
}

// =========================================
//  PUBLICACIONES
// =========================================

async function cargarPublicaciones() {
    mostrarLoading(true);
    try {
        const res = await fetch(API);
        if (!res.ok) throw new Error('Error al cargar');
        const data = await res.json();
        state.publicaciones = data;
        renderFeed(data);
    } catch (err) {
        mostrarLoading(false);
        mostrarError('No se pudieron cargar las publicaciones.');
    }
}

function renderFeed(publicaciones) {
    const container = document.getElementById('postsContainer');
    container.querySelectorAll('.post-card').forEach(c => c.remove());
    document.getElementById('loadingState').style.display = 'none';

    if (publicaciones.length === 0) {
        document.getElementById('emptyState').style.display = 'flex';
        return;
    }
    document.getElementById('emptyState').style.display = 'none';
    publicaciones.forEach(pub => container.appendChild(crearPostCard(pub)));
}

function crearPostCard(pub) {
    const card = document.createElement('article');
    card.className  = 'post-card';
    card.dataset.id = pub.id;

    const puedeBorrar = estaLogueado() && (pub.autor_id === state.userId || state.isAdmin);

    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar post-avatar-link"
                 onclick="verMiPerfil(${pub.autor_id})"
                 style="background:${avatarColor(pub.autor)}">
                ${pub.autor ? pub.autor[0].toUpperCase() : '?'}
            </div>
            <div class="post-meta">
                <span class="post-author">${escapeHtml(pub.autor || 'Anónimo')}</span>
                <span class="post-time">${formatearFecha(pub.created_at)}</span>
            </div>
            ${puedeBorrar ? `
                <button class="delete-post-btn" onclick="confirmarEliminar(${pub.id})" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            ` : ''}
        </div>
        <div class="post-body"><p class="post-text">${escapeHtml(pub.contenido)}</p></div>
        <div class="post-actions">
            <div class="vote-group">
                <button class="vote-btn ${state.votes[`post_${pub.id}`] === 'like' ? 'vote-active' : ''}" id="like-btn-${pub.id}"   onclick="votar(${pub.id}, 'like')">Like <span id="likes-${pub.id}">${pub.likes || 0}</span></button>
                <button class="vote-btn ${state.votes[`post_${pub.id}`] === 'dislike' ? 'vote-active' : ''}" id="dislike-btn-${pub.id}" onclick="votar(${pub.id}, 'dislike')">Dislike <span id="dislikes-${pub.id}">${pub.dislikes || 0}</span></button>
            </div>
            <button class="comment-toggle-btn" onclick="toggleComentarios(${pub.id})">💬 Comentarios <span class="comment-count-badge" id="comment-count-${pub.id}">${pub.total_comentarios > 0 ? pub.total_comentarios : ''}</span></button>
        </div>
        <div class="comments-section" id="comments-${pub.id}" style="display:none;"></div>
    `;
    return card;
}

async function crearPublicacion() {
    if (!estaLogueado()) { showToast('Tenés que iniciar sesión', true); return; }

    const textarea  = document.getElementById('newPostContent');
    const contenido = textarea.value.trim();
    if (!contenido) { showToast('Escribí algo antes de publicar', true); return; }
    if (contenido.length > 500) { showToast('Máximo 500 caracteres', true); return; }

    try {
        const res  = await fetch(API, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ contenido })
        });
        const data = await res.json();

        if (res.ok) {
            textarea.value = '';
            document.getElementById('charCounter').textContent = '0 / 500';
            // FIX: recargar desde el servidor para que el id de la publicación
            // sea el real de la BD (el stored procedure puede no devolver id_publi correcto).
            // Esto garantiza que los botones like/dislike funcionen de inmediato.
            await cargarPublicaciones();
            showToast('Publicación creada');
        } else {
            showToast(data.error || 'Error al publicar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

// ─── VOTAR PUBLICACIÓN ───────────────────────────
// Permite: votar, quitar el voto (click mismo botón), o cambiar a la otra opción
async function votar(postId, tipo) {
    if (!estaLogueado()) { showToast('Iniciá sesión para votar', true); return; }

    const voteKey    = `post_${postId}`;
    const votoActual = state.votes[voteKey]; // 'like', 'dislike', o undefined

    // Determinar la acción: si ya tenía ese voto → quitar; si tenía el otro → cambiar; si no tenía → poner
    let accion = tipo;          // 'like' o 'dislike'  → suma 1
    let deshacer = false;
    if (votoActual === tipo) {
        // Click en el mismo botón → quitar el voto
        accion   = tipo === 'like' ? 'unlike' : 'undislike';
        deshacer = true;
    }

    try {
        const res  = await fetch(`${API}/${postId}/votar`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tipo: accion, votoAnterior: votoActual })
        });
        const data = await res.json();

        if (res.ok) {
            if (deshacer) {
                delete state.votes[voteKey];
            } else {
                state.votes[voteKey] = tipo;
            }
            localStorage.setItem('votes', JSON.stringify(state.votes));
            document.getElementById(`likes-${postId}`).textContent    = data.likes;
            document.getElementById(`dislikes-${postId}`).textContent = data.dislikes;
            actualizarBotonesVoto(postId, state.votes[voteKey]);
        } else {
            showToast(data.error || 'Error al votar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

// Actualiza el estado visual de los botones de voto de una publicación
function actualizarBotonesVoto(postId, votoActivo) {
    const likeBtn    = document.getElementById(`like-btn-${postId}`);
    const dislikeBtn = document.getElementById(`dislike-btn-${postId}`);
    if (!likeBtn || !dislikeBtn) return;

    // Resetear
    likeBtn.disabled    = false; likeBtn.style.opacity    = '1'; likeBtn.style.cursor = 'pointer'; likeBtn.classList.remove('vote-active');
    dislikeBtn.disabled = false; dislikeBtn.style.opacity = '1'; dislikeBtn.style.cursor = 'pointer'; dislikeBtn.classList.remove('vote-active');

    if (votoActivo === 'like') {
        likeBtn.classList.add('vote-active');
    } else if (votoActivo === 'dislike') {
        dislikeBtn.classList.add('vote-active');
    }
}

// ─── ELIMINAR PUBLICACIÓN ────────────────────────

/**
 * FIX: antes usaba confirm(). Ahora abre el modal de confirmación del HTML.
 */
function confirmarEliminar(postId) {
    state.deleteTarget = postId;
    document.getElementById('deleteOverlay').style.display = 'flex';

    // Asignamos el handler al botón de confirmación
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = () => eliminarPublicacion(postId);
}

function closeDeleteModal() {
    document.getElementById('deleteOverlay').style.display = 'none';
    state.deleteTarget = null;
}

async function eliminarPublicacion(postId) {
    closeDeleteModal();
    try {
        const res = await fetch(`${API}/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (res.ok) {
            state.publicaciones = state.publicaciones.filter(p => p.id !== postId);
            renderFeed(state.publicaciones);
            showToast('Publicación eliminada');
        } else {
            showToast(data.error || 'No se pudo eliminar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

// =========================================
//  COMENTARIOS
// =========================================

async function toggleComentarios(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (!section) return;

    if (state.commentsOpen.has(postId)) {
        // Cerrar
        section.style.display = 'none';
        state.commentsOpen.delete(postId);
        return;
    }

    // Abrir y cargar
    section.style.display = 'block';
    state.commentsOpen.add(postId);
    section.innerHTML = '<p style="padding:8px;opacity:.6">Cargando...</p>';

    try {
        const res = await fetch(`${API}/${postId}/comentarios`);
        if (!res.ok) throw new Error();
        const comentarios = await res.json();
        renderComentarios(section, postId, comentarios);
    } catch (e) {
        section.innerHTML = '<p style="padding:8px;color:#ef4444">Error al cargar comentarios.</p>';
    }
}

function renderComentarios(section, postId, comentarios) {
    const items = comentarios.map(c => {
        const puedeBorrar = estaLogueado() && (c.autor_id === state.userId || state.isAdmin);
        return `
            <div class="comment" id="comment-item-${c.id}">
                <div class="comment-avatar" style="background:${avatarColor(c.autor)}">${(c.autor || '?')[0].toUpperCase()}</div>
                <div class="comment-body">
                    <span class="comment-author">${escapeHtml(c.autor)}</span>
                    <p class="comment-text">${escapeHtml(c.contenido)}</p>
                    <div class="comment-votes">
                        <button class="comment-vote-btn" onclick="votarComentario(${c.id}, 'like', ${postId})">👍 <span id="comment-likes-${c.id}">${c.likes || 0}</span></button>
                        <button class="comment-vote-btn" onclick="votarComentario(${c.id}, 'dislike', ${postId})">👎 <span id="comment-dislikes-${c.id}">${c.dislikes || 0}</span></button>
                        ${puedeBorrar ? `<button class="delete-comment-btn" onclick="eliminarComentario(${c.id}, ${postId})">Eliminar</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    section.innerHTML = `
        <div class="comments-list" id="comment-list-${postId}">${items || '<p style="padding:8px;opacity:.6">No hay comentarios aún.</p>'}</div>
        <div class="comment-input-area">
            <textarea class="comment-textarea" id="new-comment-${postId}" placeholder="Comentar..."></textarea>
            <button class="post-comment-btn" onclick="publicarComentario(${postId})">Comentar</button>
        </div>
    `;
}

async function publicarComentario(postId) {
    if (!estaLogueado()) { showToast('Iniciá sesión para comentar', true); return; }

    const textarea = document.getElementById(`new-comment-${postId}`);
    const contenido = textarea.value.trim();
    if (!contenido) return;

    try {
        const res  = await fetch(`${API}/${postId}/comentarios`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ contenido })
        });
        const data = await res.json();

        if (res.ok) {
            textarea.value = '';
            // Agregar el nuevo comentario al DOM sin recargar todo
            const lista = document.getElementById(`comment-list-${postId}`);
            const puedeBorrar = true; // es tuyo
            const div = document.createElement('div');
            div.className = 'comment';
            div.id = `comment-item-${data.id}`;
            div.innerHTML = `
                <div class="comment-avatar" style="background:${avatarColor(data.autor)}">${data.autor[0].toUpperCase()}</div>
                <div class="comment-body">
                    <span class="comment-author">${escapeHtml(data.autor)}</span>
                    <p class="comment-text">${escapeHtml(data.contenido)}</p>
                    <div class="comment-votes">
                        <button class="comment-vote-btn" onclick="votarComentario(${data.id}, 'like', ${postId})">👍 <span id="comment-likes-${data.id}">0</span></button>
                        <button class="comment-vote-btn" onclick="votarComentario(${data.id}, 'dislike', ${postId})">👎 <span id="comment-dislikes-${data.id}">0</span></button>
                        <button class="delete-comment-btn" onclick="eliminarComentario(${data.id}, ${postId})">Eliminar</button>
                    </div>
                </div>
            `;
            // Limpiar el mensaje de "no hay comentarios" si existe
            if (lista.querySelector('p')) lista.innerHTML = '';
            lista.appendChild(div);
            // FIX: actualizar el contador del botón
            const badge = document.getElementById(`comment-count-${postId}`);
            if (badge) {
                const actual = parseInt(badge.textContent) || 0;
                badge.textContent = actual + 1;
            }
        } else {
            showToast(data.error || 'Error al comentar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

/**
 * FIX: la versión original usaba una lógica rota para encontrar el postId.
 * Ahora recibe postId como parámetro directamente.
 */
async function votarComentario(commentId, tipo, postId) {
    if (!estaLogueado()) { showToast('Iniciá sesión para votar', true); return; }

    const voteKey    = `comment_${commentId}`;
    const votoActual = state.votes[voteKey]; // 'like', 'dislike', o undefined

    // Igual que YouTube: mismo botón → quitar; botón opuesto → cambiar
    let accion = tipo;
    let deshacer = false;
    if (votoActual === tipo) {
        accion   = tipo === 'like' ? 'unlike' : 'undislike';
        deshacer = true;
    }

    try {
        const res  = await fetch(`/api/publicaciones/comentarios/${commentId}/votar`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tipo: accion, votoAnterior: votoActual })
        });
        const data = await res.json();

        if (res.ok) {
            if (deshacer) {
                delete state.votes[voteKey];
            } else {
                state.votes[voteKey] = tipo;
            }
            localStorage.setItem('votes', JSON.stringify(state.votes));
            document.getElementById(`comment-likes-${commentId}`).textContent    = data.likes;
            document.getElementById(`comment-dislikes-${commentId}`).textContent = data.dislikes;
            actualizarBotonesVotoComentario(commentId, state.votes[voteKey]);
        } else {
            showToast(data.error || 'Error al votar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

function actualizarBotonesVotoComentario(commentId, votoActivo) {
    const btns = document.querySelectorAll(`#comment-item-${commentId} .comment-vote-btn`);
    btns.forEach(b => {
        b.disabled = false;
        b.style.opacity = '1';
        b.style.cursor = 'pointer';
        b.classList.remove('vote-active');
    });
    if (votoActivo === 'like') {
        const likeBtn = document.querySelector(`#comment-item-${commentId} .comment-vote-btn`);
        if (likeBtn) likeBtn.classList.add('vote-active');
    } else if (votoActivo === 'dislike') {
        const allBtns = document.querySelectorAll(`#comment-item-${commentId} .comment-vote-btn`);
        if (allBtns[1]) allBtns[1].classList.add('vote-active');
    }
}

async function eliminarComentario(commentId, postId) {
    try {
        const res = await fetch(`/api/publicaciones/comentarios/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const el = document.getElementById(`comment-item-${commentId}`);
            if (el) el.remove();
            showToast('Comentario eliminado');
        } else {
            showToast('Error al eliminar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

// =========================================
//  PERFILES Y SEGUIDORES
// =========================================

/**
 * FIX: la versión original no guardaba el id del perfil abierto,
 * lo que rompía verListaDesdeModal y toggleSeguir sin argumento.
 * Ahora se llama también sin argumento desde "Mi perfil" en el menú.
 */
async function verMiPerfil(id) {
    const targetId = id !== undefined ? id : state.userId;
    if (!targetId) return;

    try {
        const headers = estaLogueado() ? getAuthHeaders() : {};
        const res  = await fetch(`/api/usuarios/${targetId}/perfil`, { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();

        // FIX: guardamos el id y el estado de seguimiento en state
        state.currentProfileId       = targetId;
        state.currentProfileSiguiendo = data.yoSigo;

        document.getElementById('pmName').textContent      = escapeHtml(data.nombre);
        document.getElementById('pmSeguidores').textContent = data.seguidores;
        document.getElementById('pmSeguidos').textContent   = data.seguidos;
        document.getElementById('pmAvatar').textContent     = data.nombre[0].toUpperCase();
        document.getElementById('pmAvatar').style.background = avatarColor(data.nombre);

        const btn = document.getElementById('followBtn');
        if (estaLogueado() && targetId !== state.userId) {
            btn.style.display = 'block';
            btn.textContent   = data.yoSigo ? 'Dejar de seguir' : 'Seguir';
        } else {
            btn.style.display = 'none';
        }

        document.getElementById('profileOverlay').classList.add('open');
    } catch (e) {
        showToast('Error al cargar perfil', true);
    }
}

/**
 * FIX: la versión original recibía parámetros que el HTML no pasaba.
 * Ahora usa state.currentProfileId y state.currentProfileSiguiendo.
 */
async function toggleSeguir() {
    const id        = state.currentProfileId;
    const yaSeguia  = state.currentProfileSiguiendo;
    if (!id) return;

    const method = yaSeguia ? 'DELETE' : 'POST';
    try {
        await fetch(`/api/usuarios/${id}/seguir`, { method, headers: getAuthHeaders() });
        closeProfileModal();
        verMiPerfil(id); // Recargar con estado actualizado
    } catch (e) {
        showToast('Error', true);
    }
}

/**
 * FIX: la versión original leía dataset.userId de pmName, que nunca se seteaba.
 * Ahora usa state.currentProfileId.
 */
async function verListaDesdeModal(tipo) {
    const id = state.currentProfileId;
    if (!id) return;

    const url = tipo === 'seguidores'
        ? `/api/usuarios/${id}/seguidores`
        : `/api/usuarios/${id}/seguidos`;

    try {
        const res  = await fetch(url);
        const lista = await res.json();

        const body = document.getElementById('listModalBody');
        body.innerHTML = lista.length
            ? lista.map(u => `
                <div class="list-item" onclick="verMiPerfil(${u.id}); closeListModal();">
                    <div class="list-item-avatar" style="background:${avatarColor(u.nombre)}">${u.nombre[0].toUpperCase()}</div>
                    <span class="list-item-name">${escapeHtml(u.nombre)}</span>
                </div>
              `).join('')
            : '<p style="padding:16px;opacity:.6">Lista vacía</p>';

        document.getElementById('listModalTitle').textContent =
            tipo === 'seguidores' ? 'Seguidores' : 'Siguiendo';
        document.getElementById('listOverlay').classList.add('open');
    } catch (e) {
        showToast('Error al cargar lista', true);
    }
}

// Atajos del menú que llaman a verMiPerfil con el propio usuario
function verMisSeguidores() {
    if (!estaLogueado()) return;
    verMiPerfil(state.userId).then(() => verListaDesdeModal('seguidores'));
    closeDropdown();
}

function verMisSeguidos() {
    if (!estaLogueado()) return;
    verMiPerfil(state.userId).then(() => verListaDesdeModal('seguidos'));
    closeDropdown();
}

function closeProfileModal() {
    document.getElementById('profileOverlay').classList.remove('open');
}

function closeListModal() {
    document.getElementById('listOverlay').classList.remove('open');
}

// =========================================
//  PANEL ADMIN
// =========================================

let _adminTab = 'pubs'; // tab activa

function abrirPanelAdmin() {
    if (!state.isAdmin) { showToast('Acceso denegado', true); return; }
    closeDropdown();
    _adminTab = 'pubs';
    actualizarTabsAdmin();
    cargarTabAdmin();
    document.getElementById('adminOverlay').classList.add('open');
}

function cerrarPanelAdmin() {
    document.getElementById('adminOverlay').classList.remove('open');
}

function adminCambiarTab(tab) {
    _adminTab = tab;
    actualizarTabsAdmin();
    cargarTabAdmin();
}

function actualizarTabsAdmin() {
    document.getElementById('tabPubs').classList.toggle('active', _adminTab === 'pubs');
    document.getElementById('tabUsers').classList.toggle('active', _adminTab === 'users');
}

async function cargarTabAdmin() {
    const contenido = document.getElementById('adminContent');
    contenido.innerHTML = '<p style="padding:16px;opacity:.6">Cargando...</p>';

    if (_adminTab === 'pubs') {
        await cargarAdminPublicaciones(contenido);
    } else {
        await cargarAdminUsuarios(contenido);
    }
}

async function cargarAdminPublicaciones(contenido) {
    try {
        const res  = await fetch(API);
        const pubs = await res.json();

        contenido.innerHTML = `
            <div class="admin-section">
                <h3 class="admin-section-title">📋 Publicaciones (${pubs.length})</h3>
                <div class="admin-table-wrap">
                    <table class="admin-table">
                        <thead><tr><th>ID</th><th>Autor</th><th>Contenido</th><th>👍</th><th>👎</th><th>Acción</th></tr></thead>
                        <tbody>
                            ${pubs.map(p => `
                                <tr>
                                    <td>${p.id}</td>
                                    <td>${escapeHtml(p.autor)}</td>
                                    <td class="admin-cell-content">${escapeHtml(p.contenido.substring(0,80))}${p.contenido.length > 80 ? '…' : ''}</td>
                                    <td>${p.likes}</td>
                                    <td>${p.dislikes}</td>
                                    <td><button class="admin-del-btn" onclick="adminEliminarPub(${p.id})">Eliminar</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        contenido.innerHTML = '<p style="padding:16px;color:#ef4444">Error al cargar publicaciones.</p>';
    }
}

async function cargarAdminUsuarios(contenido) {
    try {
        const res   = await fetch(`${API_USUARIOS}/admin/lista`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error();
        const users = await res.json();

        contenido.innerHTML = `
            <div class="admin-section">
                <h3 class="admin-section-title">👥 Usuarios (${users.length})</h3>
                <div class="admin-table-wrap">
                    <table class="admin-table">
                        <thead><tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead>
                        <tbody id="adminUsersBody">
                            ${users.map(u => renderAdminUserRow(u)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        contenido.innerHTML = '<p style="padding:16px;color:#ef4444">Error al cargar usuarios.</p>';
    }
}

function renderAdminUserRow(u) {
    const esMismoAdmin = u.id_usuario === state.userId;
    return `
        <tr id="admin-user-row-${u.id_usuario}">
            <td>${u.id_usuario}</td>
            <td>${escapeHtml(u.nombre)}</td>
            <td>${escapeHtml(u.correo)}</td>
            <td><span class="admin-role-badge ${u.is_admin ? 'admin' : 'user'}">${u.is_admin ? '⚡ Admin' : '👤 Usuario'}</span></td>
            <td class="admin-actions-cell">
                ${esMismoAdmin ? '<span style="opacity:.4;font-size:.8rem">—</span>' : `
                    <button class="admin-toggle-btn" onclick="adminToggleAdmin(${u.id_usuario}, ${!!u.is_admin})">
                        ${u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button class="admin-ban-btn" onclick="adminBanear(${u.id_usuario}, '${escapeHtml(u.nombre)}')">
                        Banear
                    </button>
                `}
            </td>
        </tr>
    `;
}

async function adminEliminarPub(postId) {
    try {
        const res = await fetch(`${API}/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            state.publicaciones = state.publicaciones.filter(p => p.id !== postId);
            renderFeed(state.publicaciones);
            showToast('Publicación eliminada');
            cargarTabAdmin();
        } else {
            showToast('Error al eliminar', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

async function adminToggleAdmin(userId, esAdminActual) {
    try {
        const res  = await fetch(`${API_USUARIOS}/admin/toggle/${userId}`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje);
            cargarTabAdmin(); // Refrescar tabla
        } else {
            showToast(data.error || 'Error al cambiar rol', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}

async function adminBanear(userId, nombre) {
    if (!confirm(`¿Seguro que querés banear a "${nombre}"? Esta acción es irreversible.`)) return;
    try {
        const res  = await fetch(`${API_USUARIOS}/admin/ban/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`${nombre} fue baneado`);
            cargarTabAdmin();
        } else {
            showToast(data.error || 'Error al banear', true);
        }
    } catch (e) {
        showToast('Error de red', true);
    }
}