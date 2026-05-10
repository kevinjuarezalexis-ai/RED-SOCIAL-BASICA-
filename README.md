# Rey Magi – Red Social Básica

Aplicación web full-stack de red social desarrollada como Trabajo Práctico N°3 para la materia Programación III.

**Alumno:** Juárez Kevin Alexis

---

## Descripción

Rey Magi es una red social básica donde los usuarios pueden registrarse, iniciar sesión, publicar contenido, comentar, votar publicaciones y seguir a otros usuarios. Cuenta con un panel de administración para gestionar usuarios y contenido.

---

## Tecnologías utilizadas

- **Backend: Node.js + Express** — servidor web
- **Base de datos: MySQL** — (administrada con phpMyAdmin / XAMPP)
- **Autenticación: JWT (jsonwebtoken) bcryptjs** — Autenticacion de usuarios con JWT y hash de contraseñas
- **Frontend: HTML + CSS + JavaScript** — frontend vanilla

> Nota: el TP solicita PostgreSQL, pero se utilizó MySQL por usar phpmyadmin ya que eso usamos en base de datos 2

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/kevinjuarezalexis-ai/RED-SOCIAL-BASICA-.git
cd tp3-app
```

### 2. Instalar dependencias

```bash
npm install
npm install mysql2
npm install jsonwebtoken bcryptjs
```



### 3. Crear la base de datos

Crear la base de datos
Abrir XAMPP y darle Start a MySQL
Ir a http://localhost/phpmyadmin
Crear una base de datos llamada redsocial_db
Seleccionarla, ir a la pestaña SQL, pegar el contenido de database.txt y ejecutar

### 4. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=reymagi
DB_PORT=3306
PORT=3000
JWT_SECRET=tu_clave_secreta

```
### 5. Iniciar el servidor

# Modo desarrollo (reinicia automáticamente al guardar cambios)
npm run dev

# Modo producción
npm start

La aplicación estará disponible en `http://localhost:3000`


## Explicación de BD — Procedimiento, Trigger y Transacción

### Stored Procedure — `registrar_publicacion`

Procedimiento almacenado que recibe el `id_usuario` y el texto de la publicación. Antes de insertar, verifica que el usuario exista en la tabla `usuarios`. Si no existe, lanza un error con `SIGNAL SQLSTATE`. Si existe, realiza el `INSERT` y devuelve el ID de la nueva publicación. Es llamado desde el controller con `CALL registrar_publicacion(?, ?)` en lugar de hacer el INSERT directo desde Node.js.

### Trigger — `after_delete_publicacion`

Se dispara automáticamente después de cada `DELETE` en la tabla `publicaciones`. Inserta un registro en la tabla `log_eliminaciones` con el ID de la publicación borrada, el ID del usuario dueño y la fecha. No requiere ninguna llamada desde Node.js — MySQL lo ejecuta solo cada vez que se borra una publicación.

### Transacción — `crearComentario`

Al crear un comentario, se utiliza una transacción con `BEGIN`, `COMMIT` y `ROLLBACK`. La operación realiza dos queries de forma atómica: inserta el comentario en la tabla `comentarios` y actualiza el contador `total_comentarios` en la tabla `publicaciones`. Si cualquiera de los dos falla, se ejecuta `ROLLBACK` y ningún cambio queda guardado, manteniendo la consistencia de los datos.

---

## Estructura del proyecto

tp3-app/
├── server.js                       # Punto de entrada, configura Express y monta las rutas
├── .env                            # Variables de entorno (NO subir)
├── .env.example                    # Ejemplo de variables de entorno (sí subir)
├── .gitignore                      # Archivos ignorados por Git
├── base de datos.txt               # Script SQL completo (tablas, procedure, trigger)
├── package.json                    # Dependencias y scripts del proyecto
├── db/
│   └── index.js                    # Pool de conexiones MySQL
├── controllers/
│   └── controllers.js              # Lógica de negocio de todos los endpoints
├── routes/
│   ├── auth.js                     # Rutas de autenticación
│   ├── publicaciones.js            # Rutas de publicaciones y comentarios
│   └── usuarios.js                 # Rutas de usuarios, seguidores y admin
├── middleware/
│   └── auth.js                     # Middlewares de verificación JWT
└── public/
    ├── assert/
    │   └── logoxd.png              # Logo facherito de la aplicacion xd
    ├── index.html                  # Frontend (HTML5 semántico)
    ├── style.css                   # Estilos (CSS3)
    └── app.js                      # Lógica del frontend (JS Vanilla)


---

## Endpoints de la API

> ✅ Requiere token JWT en el header `Authorization: Bearer <token>`
> ❌ Público — no requiere autenticación

### 🔐 Autenticación `/api/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/api/auth/register` | Registrar nuevo usuario | ❌ |
| `POST` | `/api/auth/login` | Iniciar sesión y obtener token | ❌ |

---

### 📝 Publicaciones `/api/publicaciones`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/publicaciones` | Obtener todas las publicaciones | ❌ |
| `GET` | `/api/publicaciones/:id` | Obtener una publicación por ID | ❌ |
| `POST` | `/api/publicaciones` | Crear nueva publicación | ✅ |
| `PUT` | `/api/publicaciones/:id` | Editar publicación propia | ✅ |
| `DELETE` | `/api/publicaciones/:id` | Eliminar publicación propia o como admin | ✅ |
| `POST` | `/api/publicaciones/:id/votar` | Like o Dislike en una publicación | ✅ |

---

### 💬 Comentarios `/api/publicaciones`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/publicaciones/:id/comentarios` | Obtener comentarios de una publicación | ❌ |
| `POST` | `/api/publicaciones/:id/comentarios` | Agregar comentario | ✅ |
| `DELETE` | `/api/publicaciones/comentarios/:id` | Eliminar comentario propio o como admin | ✅ |
| `POST` | `/api/publicaciones/comentarios/:id/votar` | Like o Dislike en un comentario | ✅ |

---

### 👤 Usuarios `/api/usuarios`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/usuarios/:id/perfil` | Ver perfil de un usuario | ❌ |
| `GET` | `/api/usuarios/:id/seguidores` | Ver lista de seguidores | ❌ |
| `GET` | `/api/usuarios/:id/seguidos` | Ver lista de usuarios seguidos | ❌ |
| `POST` | `/api/usuarios/:id/seguir` | Seguir a un usuario | ✅ |
| `DELETE` | `/api/usuarios/:id/seguir` | Dejar de seguir a un usuario | ✅ |
| `GET` | `/api/usuarios/mis-votos` | Obtener los votos del usuario logueado | ✅ |

---

### ⚙️ Admin `/api/usuarios/admin`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/usuarios/admin/lista` | Listar todos los usuarios | ✅ Admin |
| `DELETE` | `/api/usuarios/admin/ban/:id` | Banear (eliminar) un usuario | ✅ Admin |
| `PATCH` | `/api/usuarios/admin/toggle/:id` | Promover o degradar rol de admin | ✅ Admin |

---

## Preguntas Conceptuales

**1. ¿Qué es un servidor web y cómo funciona el ciclo request-response?**

Un servidor web es un programa que escucha solicitudes HTTP de clientes (navegadores) y devuelve respuestas. El ciclo es: el cliente envía un request con un método (GET, POST, etc.) y una ruta; el servidor lo recibe, procesa la lógica necesaria (consulta a la BD, validaciones) y devuelve una response con un código de estado y los datos solicitados.

**2. ¿Qué es Express y por qué lo usamos en lugar de usar solo Node.js?**

Express es un framework para Node.js que simplifica la creación de servidores web. Con Node.js puro habría que manejar manualmente el parsing de rutas, métodos HTTP y el cuerpo de las requests. Express provee un sistema de rutas, middlewares y manejo de requests y responses de forma mucho más simple y organizada.

**3. ¿Qué es un JWT y cómo se diferencia de guardar la sesión en el servidor?**

Un JWT es un token firmado que contiene información del usuario (id, nombre, rol). A diferencia de las sesiones tradicionales donde el servidor guarda el estado del usuario en memoria o BD, con JWT el servidor no guarda nada — simplemente verifica la firma del token en cada request. Esto lo hace más escalable ya que cualquier instancia del servidor puede verificarlo.

**4. ¿Qué ventaja tiene usar un stored procedure en lugar de escribir ese SQL desde Node.js?**

El stored procedure encapsula la lógica en la propia base de datos, lo que permite reutilizarla desde cualquier aplicación que se conecte. Además, la BD puede optimizar su ejecución internamente. En este caso, el procedure verifica que el usuario exista antes de insertar, centralizando esa validación en la BD y no solo en Node.

**5. ¿Por qué es importante usar transacciones? Poné un ejemplo de cuando un ROLLBACK salva la integridad de los datos.**

Las transacciones garantizan que un conjunto de operaciones se ejecute completo o no se ejecute ninguna. Por ejemplo: al crear un comentario se inserta en `comentarios` y se actualiza el contador en `publicaciones`. Si el UPDATE falla después del INSERT, sin transacción quedaría un comentario huérfano con el contador desactualizado. Con ROLLBACK, el INSERT también se deshace y los datos quedan consistentes.

**6. ¿Qué es un trigger? Describí el trigger que implementaste y en qué momento se dispara.**

Un trigger es una acción automática que la base de datos ejecuta cuando ocurre un evento en una tabla. El trigger `after_delete_publicacion` se dispara después de cada DELETE en la tabla `publicaciones` e inserta un registro en `log_eliminaciones` con el ID de la publicación y del usuario. Se activa automáticamente sin necesidad de llamarlo desde el código.
