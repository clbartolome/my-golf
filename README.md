# My Golf

App personal de golf: captura de rondas en el campo y estadísticas.

| Servicio | URL |
|----------|-----|
| Captura | http://localhost:3000 |
| Estadísticas | http://localhost:3001 |
| API | http://localhost:8000 |

## Requisitos

- [Podman](https://podman.io/)
- `podman compose` (incluido en Podman reciente, o `podman-compose`)
- `make`
- `python3` (solo para datos de prueba)

## Levantar todo

Desde la raíz del proyecto:

```bash
make up
```

Construye las imágenes, levanta PostgreSQL, API y los dos frontends en segundo plano.

Comprobar que la API responde:

```bash
make health
```

Ver contenedores en marcha:

```bash
make ps
```

Ver logs:

```bash
make logs
```

## Datos de prueba

Con los servicios levantados, genera 10 rondas de ejemplo en «Campo Prueba» (borra las previas de ese campo):

```bash
make seed-demo
```

Tarda ~30 s. Luego abre http://localhost:3001 y filtra por **Campo Prueba**.

## Copia de seguridad

En http://localhost:3001/backup puedes **exportar** todos los datos (bolsa, rondas, hoyos y golpes) a un archivo JSON y **importarlo** después de levantar la app de nuevo.

Flujo típico antes de apagar:

1. `make up` → jugar / capturar rondas
2. Estadísticas → **Copia** → **Descargar copia de seguridad**
3. `make down` o `make clean`

Para recuperar:

1. `make up` (o `make reset-db` si quieres BBDD vacía)
2. Estadísticas → **Copia** → subir el `.json` → **Reemplazar todo**

## Parar y limpiar

**Parar** contenedores (los datos de la BBDD se conservan):

```bash
make down
```

**Limpiar todo**: para contenedores y **borra la base de datos** (volúmenes):

```bash
make clean
```

**Reset completo**: limpia y vuelve a levantar con BBDD vacía (schema desde cero):

```bash
make reset-db
```

## Resumen de comandos `make`

| Comando | Descripción |
|---------|-------------|
| `make up` | Levantar stack con Podman |
| `make down` | Parar contenedores |
| `make clean` | Parar y borrar volúmenes (BBDD) |
| `make reset-db` | Limpiar BBDD y levantar de nuevo |
| `make seed-demo` | Rondas de prueba en «Campo Prueba» |
| `make health` | Comprobar API |
| `make ps` | Estado de contenedores |
| `make logs` | Logs en vivo |
| `make up-prod` | Levantar con imágenes de Quay (compose prod) |
| `make openshift-deploy` | Desplegar en OpenShift |
| `make openshift-routes` | Ver URLs de Routes |
| `make openshift-delete` | Quitar despliegue OpenShift |

## Imágenes en Quay.io

Componentes publicados en `quay.io/calopezb/my-golf-<componente>`:

| Imagen | Componente |
|--------|------------|
| `my-golf-db` | PostgreSQL + schema inicial |
| `my-golf-api` | Backend FastAPI |
| `my-golf-capture` | Frontend captura |
| `my-golf-stats` | Frontend estadísticas |

**Login** (una vez, o cuando caduque la sesión):

```bash
make login-quay
```

**Construir** todas las imágenes localmente:

```bash
make build-images
```

**Subir** a Quay (construye y hace push):

```bash
make push-images
```

Etiqueta distinta de `latest`:

```bash
make push-images TAG=v0.1.0
```

**Bajar** imágenes desde Quay:

```bash
make pull-images
```

**Levantar** con imágenes de Quay (sin build local):

```bash
make pull-images   # opcional si no están en local
make up-prod
```

Usa `docker-compose.prod.yml` en lugar del compose de desarrollo.

## OpenShift

Manifiestos en [`openshift/`](openshift/): Namespace, Secret, PVC (storage class por defecto), Deployments, Services y Routes (capture + stats). La API solo es interna; los frontends hacen proxy de `/api` al Service `api`.

**Requisitos:** `oc` logueado con permisos de admin (para asignar SCC), imágenes en Quay (`make push-images`).

El deploy asigna **anyuid** a los ServiceAccounts `db`, `capture` y `stats` (Postgres y nginx necesitan permisos de escritura en rutas del sistema).

**Desplegar** (reconstruye y sube la imagen `db` si cambió el Dockerfile):

```bash
make push-db
oc delete pvc db-data -n my-golf   # necesario si ya falló un arranque previo
make openshift-deploy
```

Ver URLs de las Routes:

```bash
make openshift-routes
```

**Borrar** todo el despliegue:

```bash
make openshift-delete
```

Namespace por defecto: `my-golf` (`make openshift-deploy NS=otro-nombre`).
