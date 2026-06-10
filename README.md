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
