# 🎨 Integrar Salud | Frontend Premium v2.0
> **SaaS Interface v2.0** - Experiencia de usuario de alta fidelidad para gestión médica.

Este repositorio contiene la interfaz de usuario (Frontend) de **Integrar Salud**, desarrollada con las tecnologías más modernas para garantizar velocidad, fluidez y una estética premium. En esta versión 2.0, el sistema ha sido ampliado para cubrir todas las necesidades operativas de un consultorio o centro médico.

---

## 🌟 Características Destacadas (v2.0)
- **Módulo de Agenda:** Calendario avanzado y gestión de turnos interactiva.
- **Módulo de Pacientes:** Historias clínicas digitales, antecedentes y seguimientos.
- **Motor de Finanzas Avanzado:** Gestión completa de ingresos, egresos, honorarios, categorías de gastos y reportes financieros.
- **Gestión de Personal y Consultorios:** Administración de médicos, secretarias, horarios y asignación de salas físicas.
- **Inventario de Medicamentos:** Control de stock y vademécum interno.
- **Dashboard de Inteligencia (Reportes):** Visualización de métricas críticas (KPIs) en tiempo real con gráficos dinámicos.
- **Sala Virtual (Virtual Room):** Soporte para videoconsultas integradas.
- **Landing Page Pública:** Portal de presentación y captación de pacientes.
- **Seguridad Garantizada:** Gestión de sesiones segura con JWT y control de acceso basado en roles.
- **Estética Curada:** Uso de Glassmorphism, animaciones suaves con Framer Motion y tipografía moderna.

---

## 🛠️ Stack Tecnológico
- **Framework:** [React 19](https://react.dev/)
- **Bundler:** [Vite 6](https://vitejs.dev/)
- **Estado Global:** [Zustand](https://github.com/pmndrs/zustand)
- **Estilos:** [TailwindCSS v4](https://tailwindcss.com/) y CSS Vanilla modular.
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **PWA:** Soporte progresivo para web apps (vite-plugin-pwa).

---

## 📦 Guía de Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/Jmpyy/integrar-salud.git
    cd integrar-salud/frontend
    ```
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Configurar Entorno:**
    Crea un archivo `.env` basado en `.env.example`:
    ```env
    VITE_API_URL=http://localhost/api-integrar/api
    ```
4.  **Iniciar Modo Desarrollo:**
    ```bash
    npm run dev
    ```

---

## 🚀 Despliegue (Producción)
Para generar la versión optimizada para el servidor:
```bash
npm run build
```
Luego, el contenido generado en la carpeta `/dist` se puede subir a tu servidor Nginx/Apache o configurar mediante un pipeline de CI/CD.

---

**© 2026 Integrar Salud - Redefiniendo la gestión médica.**
