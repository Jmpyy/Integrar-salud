<div align="center">
  <h1>🩺 Integrar Salud | Frontend Premium</h1>
  <p><strong>Experiencia de usuario de alta fidelidad, rendimiento extremo y gestión médica avanzada.</strong></p>

  <p>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 6" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="TailwindCSS" /></a>
    <a href="https://github.com/pmndrs/zustand"><img src="https://img.shields.io/badge/Zustand-State-black?style=flat-square&logo=react" alt="Zustand" /></a>
  </p>
</div>

---

Este repositorio contiene la interfaz de usuario (Frontend) de **Integrar Salud**, diseñada con las tecnologías más modernas para garantizar velocidad, fluidez y una estética premium. El sistema destaca por su enfoque arquitectónico en la seguridad médica y su interfaz ultra-optimizada.

## 🚀 Innovaciones y Rendimiento (v3.0)

- **Optimización de Renderizado (Zero-Lag):** Rediseño profundo del Glassmorphism y anulaciones de hardware para garantizar fluidez (60fps) en dispositivos móviles y computadoras de bajos recursos sin depender de aceleración gráfica.
- **Arquitectura Zero-Trust:** Migración a HttpOnly Cookies, eliminando por completo el uso de `localStorage` para tokens JWT, mitigando vulnerabilidades críticas (XSS).
- **WebSockets Ultra-Seguros:** Sincronización en tiempo real mejorada. El servidor Node.js autentica conexiones extrayendo tokens directamente de cookies seguras de forma transparente.
- **Sala Virtual Nativa:** Refactorización del flujo de conexión WebSocket para videollamadas médicas, garantizando reconexiones sin condiciones de carrera.

## 🌟 Características Principales

*   **📅 Módulo de Agenda:** Calendario avanzado y gestión de turnos interactiva con atajos rápidos de evolución.
*   **🏥 Módulo de Pacientes:** Historias clínicas digitales, antecedentes y sistema de alertas médicas.
*   **💰 Motor de Finanzas:** Gestión completa de ingresos, egresos, honorarios, facturación AFIP y reportes.
*   **👥 Gestión Operativa:** Administración de médicos, secretarias, horarios y asignación de salas físicas.
*   **💊 Vadémecum:** Inventario de medicamentos y control de stock integrado.
*   **📊 Dashboard Inteligente:** KPIs en tiempo real, gráficos dinámicos y alertas de fugas de dinero/ausencias.
*   **⭐ Motor de Reseñas:** Calificación post-consulta inteligente que deriva reseñas positivas a Google Maps.

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
| :--- | :--- |
| **Core** | React 19, Vite 6 |
| **Estilos** | TailwindCSS v4, CSS Vanilla modular |
| **Estado & Lógica** | Zustand, React Router DOM |
| **UI / UX** | Framer Motion, Lucide React, Recharts |
| **Infraestructura** | Vite PWA Plugin, Axios |

---

## 💻 Guía de Instalación Local

### Requisitos Previos
*   [Node.js](https://nodejs.org/) v18+ 
*   npm o yarn

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Jmpyy/integrar-salud.git
   cd integrar-salud/frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo `.env` en la raíz del frontend (puedes basarte en `.env.example`):
   ```env
   VITE_API_URL=http://localhost/api-integrar/api
   VITE_WS_URL=http://localhost:3000
   ```

4. **Levantar Entorno de Desarrollo:**
   ```bash
   npm run dev
   ```
   > 💡 *El entorno estará disponible típicamente en `http://localhost:5173`*

---

## 📦 Despliegue en Producción

Para compilar la aplicación y generar los archivos estáticos listos para producción:

```bash
npm run build
```

El resultado se generará en la carpeta `dist/`. Puedes servir estos archivos utilizando Nginx, Apache, o cualquier servicio de hosting moderno (Vercel, Netlify, Cloudflare Pages).

### Configuración Nginx Recomendada
Asegúrate de redirigir todo el tráfico a `index.html` para que el enrutamiento de React (SPA) funcione correctamente:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---
<div align="center">
  <b>© 2026 Integrar Salud</b> — Redefiniendo la gestión médica institucional.
</div>
