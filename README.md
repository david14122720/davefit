# DaveFit 💪

Plataforma de entrenamiento inteligente construida con Astro, React y Supabase.

## 🚀 Inicio Rápido

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Configurar entorno**:
    Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
    ```env
    PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
    PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
    ```

3.  **Ejecutar desarrollo**:
    ```bash
    npm run dev
    ```

## 🏗️ Estructura del Proyecto

-   `src/components`: Componentes reutilizables (Auth, Dashboard, UI)
-   `src/layouts`: Layouts principales (Base, Dashboard, Admin)
-   `src/pages`: Rutas de la aplicación
-   `src/lib`: Lógica de negocio (Supabase, Workout Engine)
-   `database`: Schema SQL para la base de datos

## 🔐 Roles y Permisos

-   **Usuario**: Acceso al Dashboard, Rutinas y Perfil.
-   **Admin**: Acceso al Panel de Administración para gestionar ejercicios.
    -   Para hacer admin a un usuario, cambia su rol a `admin` en la tabla `perfiles` de Supabase.

## 🧠 Características Clave

-   **Workout Engine**: Algoritmo de recomendación basado en objetivos y fatiga.
-   **Dashboard Interactivo**: Gráficas de progreso y seguimiento.
-   **Modo Oscuro Premium**: Diseño moderno y motivador.
