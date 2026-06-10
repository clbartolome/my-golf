.PHONY: up down logs ps health reset-db dev-capture migrate

up:
	podman compose up --build -d

down:
	podman compose down

logs:
	podman compose logs -f

ps:
	podman compose ps

health:
	curl -s http://localhost:8000/health | python3 -m json.tool

migrate:
	podman exec -i my-golf_db_1 psql -U mygolf -d mygolf < db/migrations/001_add_meters.sql
	podman exec -i my-golf_db_1 psql -U mygolf -d mygolf < db/migrations/002_handicap_bag.sql
	podman exec -i my-golf_db_1 psql -U mygolf -d mygolf < db/migrations/003_shot_miss_line.sql

# Borra volúmenes (recrea BBDD desde schema.sql)
reset-db:
	podman compose down -v
	podman compose up --build -d

# Solo front de captura en dev (API en :8000)
dev-capture:
	cd frontend/capture && npm install && npm run dev

# Solo front de stats en dev (API en :8000)
dev-stats:
	cd frontend/stats && npm install && npm run dev
