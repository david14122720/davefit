# Guía de Despliegue Universal en Dokploy

Esta guía describe el proceso general para desplegar cualquier proyecto en el servidor de Dokploy dentro de la red local.

## � Información del Servidor
- **IP del Servidor**: `192.168.101.133`

## �🚀 Pasos para el Despliegue

### 1. Preparación en GitHub
- El código debe estar subido a un repositorio de GitHub.
- No utilizar Git manual; usar la integración nativa de **GitHub** en Dokploy para mayor facilidad y automatización.
- Asegurarse de que el repositorio tenga un `Dockerfile` configurado o sea compatible con el autodescubrimiento de Dokploy.

### 2. Configuración de la Aplicación
1.  **Crear Elemento**: En el panel de Dokploy, crear una nueva **Application**.
2.  **Fuente (Source)**: Seleccionar **GitHub**.
3.  **Vincular Repositorio**: Elegir el repositorio del proyecto y la rama (usualmente `main`).
4.  **Tipo de Construcción (Build Mode)**: 
    - Seleccionar **Dockerfile** si el proyecto tiene uno.
    - Seleccionar **Nixpacks** si quieres que Dokploy detecte el lenguaje automáticamente.

### 3. Configuración de Red (Puertos) ⚠️
Esta es la parte más importante para que el proyecto sea accesible desde otros PCs de la red. En la sección de **Ports**, configurar lo siguiente de forma manual:

| Campo | Configuración | Descripción |
| :--- | :--- | :--- |
| **Published Port** | `[TU_ELECCIÓN]` | El puerto que tú decidas (ej: 8085, 9000, etc.) |
| **Published Port Mode** | **Host** | **Obligatorio** para acceso por IP directa. |
| **Target Port** | `[INTERNO]` | El puerto que usa la app dentro (ej: 80 para Nginx). |
| **Protocol** | `TCP` | Estándar para aplicaciones web. |

### 4. Acceso Final
Una vez realizado el despliegue, la aplicación será accesible en:
`http://192.168.101.133:[TU_PUERTO]`

---
*Documento generado para David - Configuración Universal de Red Local.*
