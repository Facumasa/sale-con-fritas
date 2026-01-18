# Restaurant SaaS

Sistema de gestión completo para restaurantes construido con tecnologías modernas.

## 🚀 Tecnologías

### Backend
- **Node.js** con **TypeScript**
- **Express** como framework web
- **Prisma** como ORM
- **PostgreSQL** como base de datos
- **JWT** para autenticación

### Frontend
- **React** con **TypeScript**
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **React Router** para navegación
- **Axios** para peticiones HTTP
- **Zustand** para estado global

## 📁 Estructura del Proyecto

```
restaurant-saas/
├── server/          # Backend (Node.js + Express + Prisma)
├── client/          # Frontend (React + Vite + Tailwind)
├── .gitignore
└── README.md
```

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)
- npm o yarn

### Backend (Server)

1. Navega a la carpeta del servidor:
```bash
cd server
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales de PostgreSQL:
```
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_saas?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
NODE_ENV=development
```

4. Genera el cliente de Prisma:
```bash
npm run prisma:generate
```

5. Ejecuta las migraciones:
```bash
npm run prisma:migrate
```

6. Inicia el servidor en modo desarrollo:
```bash
npm run dev
```

El servidor estará corriendo en `http://localhost:5000`

### Frontend (Client)

1. Navega a la carpeta del cliente:
```bash
cd client
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

El archivo `.env` debe contener:
```
VITE_API_URL=http://localhost:5000
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará corriendo en `http://localhost:3000`

## 📝 Scripts Disponibles

### Backend
- `npm run dev` - Inicia el servidor en modo desarrollo con hot-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en producción
- `npm run prisma:generate` - Genera el cliente de Prisma
- `npm run prisma:migrate` - Ejecuta las migraciones de la base de datos
- `npm run prisma:studio` - Abre Prisma Studio para gestionar la base de datos

### Frontend
- `npm run dev` - Inicia el servidor de desarrollo de Vite
- `npm run build` - Compila la aplicación para producción
- `npm run preview` - Previsualiza la build de producción

## 🗄️ Base de Datos

El proyecto utiliza Prisma como ORM. El esquema de la base de datos se define en `server/prisma/schema.prisma`.

Modelos principales:
- **User**: Usuarios del sistema
- **Restaurant**: Restaurantes gestionados por los usuarios
- **Menu**: Menús de los restaurantes
- **MenuItem**: Items individuales de los menús
- **Table**: Mesas de los restaurantes

## 🔐 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para la autenticación. El token debe ser incluido en el header `Authorization` con el formato:
```
Authorization: Bearer <token>
```

## 📦 Estructura Modular

El backend está organizado de forma modular por features en la carpeta `server/src/modules/`. Cada módulo puede contener sus propias rutas, controladores y servicios.

## 🎨 Frontend

El frontend utiliza Tailwind CSS para estilos. Los componentes reutilizables se encuentran en `client/src/components/` y las páginas en `client/src/pages/`.

El estado global se gestiona con Zustand en `client/src/store/`.

## 📄 Licencia

ISC

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request
