# MapAnim Studio — Supabase SaaS & Cloud Roadmap

Documento de arquitectura y funcionalidades para la transformación de **MapAnim (Route Motion Studio)** en un producto **SaaS Open-Source / Cloud-First** potenciado por el ecosistema de **Supabase**.

---

## 1. Estado Actual de la Infraestructura

El proyecto se encuentra conectado y desplegado en el proyecto Supabase **Route Editor** (`wbdrnqilmqpokmhebvms`):

| Componente | Configuración / Estado |
| :--- | :--- |
| **Database Engine** | PostgreSQL 17.6 (ARM64) |
| **Claves de API** | Publishable Key (`sb_publishable_your_key_here-RGNFxK`) |
| **Tablas Core** | `public.profiles`, `public.projects` |
| **Seguridad RLS** | Políticas `select`, `insert`, `update`, `delete` restringidas por `(select auth.uid()) = user_id` |
| **Disparadores** | `on_auth_user_created` para aprovisionamiento instantáneo de perfiles al registrarse |
| **Storage Buckets** | `project-assets` para fotos, música e iconos personalizados con políticas de usuario |
| **Cliente Frontend** | `@supabase/supabase-js` v2 con auto-refresh y persistencia en sesión |

---

## 2. Módulos y Nuevas Funcionalidades SaaS

```
                                  ┌──────────────────────────────┐
                                  │   MapAnim Web & Desktop      │
                                  └──────────────┬───────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  │                              │                              │
         ┌────────▼────────┐            ┌────────▼────────┐            ┌────────▼────────┐
         │ Supabase Auth   │            │ Postgres 17 RLS │            │ Supabase Storage│
         │ Usuarios & RBAC │            │ Proyectos JSONB │            │ Assets, Audio,  │
         └─────────────────┘            └────────┬────────┘            │ Videos MP4      │
                                                 │                     └─────────────────┘
                                  ┌──────────────┴──────────────┐
                                  │                             │
                         ┌────────▼────────┐           ┌────────▼────────┐
                         │Realtime Sync &  │           │ PostGIS & IA    │
                         │Presencia Figma  │           │ Rutas & pgvector│
                         └─────────────────┘           └─────────────────┘
```

---

### Módulo 1: Enlaces Compartibles, Galería Comunitaria y Virales (Growth Loop)

#### 1.1 Visor Web Público (`/share/:slug`)
- **Acceso universal sin login**: Cualquier usuario puede generar un enlace público único para su itinerario.
- **Reproductor embebible (`<iframe>`)**: Modo widget minimalista para blogs de viajes, páginas de turismo y portales de reservas.
- **Controles del visor**: Reproducir/pausar, velocidad (1x, 1.5x, 2x), pantalla completa y selector de paradas interactivo.

#### 1.2 Galería de la Comunidad ("Community Showcase")
- **Explorar itinerarios destacados**: Colección pública de viajes legendarios (Ruta 66, Camino de Santiago, Ruta de la Seda, Costa Oeste de EE.UU.).
- **Botón "Fork / Clonar Ruta"**: Permite a un nuevo usuario tomar un itinerario público existente y empezar a editar sobre él en su propia cuenta con 1 click.
- **Métricas de viralidad**: Conteo de reproducciones (`views_count`), favoritos (`likes_count`) y bifurcaciones (`forks_count`).

---

### Módulo 2: Supabase Storage para Multimedia Enriquecida

#### 2.1 Tarjetas de Parada con Fotos Reales
- **Subida de fotos por parada**: Los usuarios pueden subir fotografías o postales de cada ciudad o punto de interés.
- **Efecto cinemático**: Al llegar el vehículo a la parada, la tarjeta emergente (*Stop Card*) despliega la foto con un zoom suave (*Ken Burns Effect*) antes de continuar el viaje.

#### 2.2 Música de Fondo y Efectos de Sonido
- **Pistas musicales personalizadas**: Subida de archivos `.mp3` o `.wav` alojados directamente en el bucket de Storage de cada usuario.
- **SFX sincronizados**: Efectos de sonido temáticos (despegue de avión, aceleración de coche, oleaje de barco) que se disparan en los keyframes de la animación.

#### 2.3 Iconos de Vehículos y Pines Personalizados
- **Biblioteca de modelos SVG / 3D**: Subida de avatares de transporte propios (furgoneta camper, moto clásica, tren de alta velocidad, logotipo corporativo de agencias).

#### 2.4 Almacenamiento de Videos Renderizados en la Nube
- Guardar el archivo MP4 exportado en Supabase Storage para descargarlo en cualquier momento o enviarlo por WhatsApp/Telegram sin ocupar espacio local.

---

### Módulo 3: Colaboración en Tiempo Real (Supabase Realtime)

#### 3.1 Presencia y Edición Multiusuario (Estilo Figma / Google Docs)
- **Cursores en vivo**: Ver en tiempo real la posición del cursor de otros colaboradores sobre el mapa interactivo.
- **Edición concurrente**: Si un usuario arrastra una parada en Madrid, el cambio se refleja instantáneamente en el navegador del otro usuario mediante canales `broadcast` de Supabase Realtime.
- **Bloqueo suave de paradas**: Indicar visualmente qué parada está siendo ajustada por un miembro del equipo para evitar colisiones de edición.

#### 3.2 Notificaciones en Tiempo Real
- Avisos instantáneos cuando un colaborador deja un comentario o cuando un video finaliza su exportación.

---

### Módulo 4: Renderizado de Video en la Nube (Cloud Video Rendering)

#### 4.1 Desacoplamiento del Navegador
- **Problema**: El renderizado a 4K 60fps en el navegador del usuario consume 100% de CPU/GPU y puede tardar varios minutos en equipos modestos.
- **Solución**:
  1. El usuario hace click en **"Exportar en la Nube (4K / 60 FPS)"**.
  2. El frontend envía el estado del proyecto a una **Supabase Edge Function**.
  3. La función encola la tarea en **Supabase Queues (`pgmq`)**.
  4. Un worker con GPU ejecuta el script headless existente (`scripts/render-video.ts`) con Playwright y FFmpeg.
  5. El archivo `.mp4` resultante se sube a Supabase Storage y se notifica al usuario con un enlace de descarga directa.

---

### Módulo 5: Inteligencia Geoespacial Avanzada (PostGIS)

Supabase incluye nativamente la extensión espacial **PostGIS**:

- **Búsqueda de Puntos de Interés Cercanos (`ST_DWithin`)**:
  - Sugerir automáticamente paradas interesantes (monumentos, miradores, gasolineras históricas) situadas a menos de $X$ kilómetros del trazado del usuario.
- **Detección Automática de Fronteras y Países**:
  - Detectar qué países o regiones cruza la ruta para generar animaciones automáticas de cambio de país (ej. banderas flotantes, sellos de pasaporte vintage).
- **Simplificación y Suavizado de Polilíneas en Base de Datos**:
  - Al importar archivos GPX gigantescos (ej. 50.000 puntos GPS), procesar y suavizar la geometría en servidor mediante `ST_SimplifyVW(geom, tolerance)` antes de enviarla al cliente.

---

### Módulo 6: Asistente IA de Itinerarios con `pgvector`

- **Búsqueda Semántica de Destinos**:
  - Búsqueda por lenguaje natural: *"Quiero una ruta de 5 días con viñedos y arquitectura medieval cerca de Burdeos"*.
  - Base de datos vectorial indexada en Postgres (`vector(1536)`) para emparejar preferencias del usuario con rutas recomendadas.
- **Generador de Itinerarios Inteligente**:
  - El Copiloto IA actual se conecta con la base de datos para generar rutas con distancias lógicas, tiempos de parada equilibrados y transportes recomendados automáticamente.

---

### Módulo 7: Modelo de Negocio SaaS (Freemium & Planes)

| Característica | Plan Gratuito (Open-Source / Free) | Plan Pro / Agencia |
| :--- | :--- | :--- |
| **Almacenamiento** | Local ilimitado + 3 proyectos en la Nube | Proyectos ilimitados en la Nube |
| **Resolución** | Hasta 1080p (Full HD) | 4K Ultra HD (60 FPS) |
| **Exportación** | En navegador (Local) | Renderizado en la Nube con GPU |
| **Marca de agua** | Logo discreto de MapAnim | Marca blanca (sin logo / logo del cliente) |
| **Colaboración** | 1 usuario por proyecto | Equipos de hasta 10 miembros con Realtime |
| **Storage de Audio / Fotos** | 50 MB | 25 GB de almacenamiento en Storage |
| **Enlaces Públicos** | Enlace estándar | Dominio personalizado / enlaces protegidos con contraseña |

---

## 3. Próximos Pasos de Implementación Recomendados

1. **Paso 1 (Completado)**: Base de datos Postgres 17, tablas, RLS, Storage y autenticación por Publishable Key.
2. **Paso 2**: Implementar la vista pública `/share/:slug` con reproductor cinemático de solo lectura.
3. **Paso 3**: Habilitar subida de fotos por parada usando el bucket `project-assets`.
4. **Paso 4**: Integrar canales de presencia Realtime para colaboración simultánea.
5. **Paso 5**: Desplegar worker de renderizado en background para exportación 4K en la nube.
