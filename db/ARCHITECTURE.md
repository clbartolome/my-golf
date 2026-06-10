# Arquitectura de datos — My Golf

## ¿Relacional o no relacional?

**Relacional (PostgreSQL).**

| Criterio | Por qué relacional |
|----------|-------------------|
| Estructura | Ronda → hoyo → golpe es una jerarquía fija con integridad referencial |
| Estadísticas | Agregaciones (`COUNT`, `GROUP BY`, ventanas) sobre millones de golpes históricos |
| Transacciones | Guardar golpe + penalización + siguiente golpe debe ser atómico |
| Modelo | No necesitas esquema flexible; el formato del golpe está definido |

NoSQL tendría sentido si cada ronda fuera un documento muy distinto o sin relaciones entre rondas. Aquí lo contrario: quieres cruzar todas tus rondas (“todos mis drivers en par 4”).

## ¿Por qué PostgreSQL?

- Contenedor oficial estable; muy usado en **OpenShift** (Operators: Crunchy PostgreSQL, CloudNativePG).
- `ENUM`, `CHECK`, vistas, funciones para stats derivadas (GIR, putts, FIR).
- PersistentVolume para datos; backup estándar (`pg_dump`).
- Un solo usuario no exige escalar horizontalmente la BBDD.

Alternativas descartadas para este caso:

- **MongoDB** — consultas de stats más incómodas sin catálogo variable.
- **SQLite** — válido en local, peor encaje con OpenShift multi-réplica y volumen compartido.
- **MySQL/MariaDB** — viable, pero PostgreSQL encaja mejor con tipos ENUM y analítica.

## Despliegue en OpenShift (orientativo)

```
┌─────────────────┐     ┌─────────────────┐
│  Web captura    │     │  Web stats      │
│  (responsive)   │     │  (responsive)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │ HTTP
              ┌──────▼──────┐
              │  API (1 pod) │  ← stateless, N réplicas posibles
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │  ← StatefulSet + PVC
              └─────────────┘
```

- **API + frontends**: Deployments stateless, imagen en Quay/Internal Registry.
- **PostgreSQL**: StatefulSet o Operator con PVC (ReadWriteOnce).
- **Migraciones**: ejecutar `schema.sql` / Flyway / Liquibase en init container o Job al desplegar.
- **Secretos**: `DATABASE_URL` en Secret de OpenShift, no en imagen.

Stack de aplicación: **Python 3.12 + FastAPI + SQLAlchemy + PostgreSQL** (`backend/`).

## Desarrollo local con Podman

Requisitos: `podman` y el plugin `podman compose` (paquete `podman-compose` en Fedora).

```bash
# Arrancar BBDD + API
make up
# o: podman compose up --build -d

# Health check
curl http://localhost:8000/health

# Documentación interactiva
# http://localhost:8000/docs

# Logs
make logs

# Parar
make down

# Recrear BBDD desde cero (borra volúmenes)
make reset-db
```

En Fedora con SELinux los bind mounts llevan sufijo `:Z` en `docker-compose.yml`.

Imagen de la API: `backend/Dockerfile` (Python 3.12-slim). PostgreSQL aplica `db/schema.sql` al crear el volumen por primera vez.

## API REST (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/rounds` | Crear ronda |
| GET | `/rounds` | Listar rondas |
| GET | `/rounds/{id}` | Ronda con hoyos y golpes |
| PATCH | `/rounds/{id}` | Actualizar estado / notas |
| POST | `/rounds/{id}/holes` | Iniciar hoyo (par + distancia tee) |
| GET | `/holes/{id}` | Detalle de hoyo |
| POST | `/holes/{id}/shots` | Registrar golpe |
| POST | `/holes/{id}/penalties` | Penalización + hint siguiente golpe |
| GET | `/stats/overview` | Stats globales |
| GET | `/stats/rounds/{id}` | Stats de una ronda |

## Próximo paso

Frontends responsive (captura en móvil, stats en escritorio) contra esta API.

| App | Puerto | Uso |
|-----|--------|-----|
| Captura | :3000 | Registrar rondas en el campo |
| Stats | :3001 | Dashboard, rondas, campos |

- `rounds.course_name`: texto libre para agrupar (“Las Rejas”, “Home course”).
- Cada `holes`: tú introduces **par** y **starting_distance** al iniciar el hoyo.
- No hay tablas `courses` ni `course_holes`; si repites un campo, el nombre coincide por texto.

## Reglas de negocio (app, no BBDD)

1. **Golpe 1**: `distance_before` = `holes.starting_distance`.
2. **Golpe normal tras otro normal**: `distance_before` = `distance_after` del anterior.
3. **Penalización**: fila `shot_type = penalty`; incrementa score, sin palo ni distancia.
4. **Rejuego**: siguiente golpe normal con `distance_before` = `distance_before` del golpe que causó la pena.
5. **Drop**: siguiente golpe normal con `distance_before` = valor que introduces tras soltar.
6. **Hoyo completado**: último golpe con `result = holed` o `distance_after = 0`; marcar `holes.completed`.
7. **Putts / GIR / FIR**: calcular en API o vistas ampliadas; no se almacenan.

## Próximo paso

Definir API REST (crear ronda, iniciar hoyo, registrar golpe, resolver penalización) y elegir stack del contenedor de aplicación.
