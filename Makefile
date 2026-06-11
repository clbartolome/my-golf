.PHONY: up down logs ps health reset-db clean seed-demo dev-capture dev-stats migrate
.PHONY: login-quay build-images push-images pull-images up-prod
.PHONY: build-db build-api build-capture build-stats
.PHONY: push-db push-api push-capture push-stats
.PHONY: openshift-ns openshift-apply openshift-deploy openshift-delete openshift-routes openshift-scc

# Registro Quay (override: make push-images QUAY=quay.io/miusuario TAG=v1)
QUAY ?= quay.io/calopezb
TAG ?= latest

IMAGE_DB = $(QUAY)/my-golf-db:$(TAG)
IMAGE_API = $(QUAY)/my-golf-api:$(TAG)
IMAGE_CAPTURE = $(QUAY)/my-golf-capture:$(TAG)
IMAGE_STATS = $(QUAY)/my-golf-stats:$(TAG)

up:
	podman compose up --build -d

down:
	podman compose down

# Para contenedores y borra la base de datos (volúmenes)
clean:
	podman compose down -v

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

# 10 rondas de prueba en «Campo Prueba» (requiere API en :8000)
seed-demo:
	python3 scripts/seed_demo_rounds.py --clean --rounds 10 --course "Campo Prueba"

# ---------------------------------------------------------------------------
# Quay.io — quay.io/calopezb/my-golf-<componente>
# ---------------------------------------------------------------------------

login-quay:
	podman login quay.io

build-db:
	podman build -t $(IMAGE_DB) ./db

build-api:
	podman build -t $(IMAGE_API) ./backend

build-capture:
	podman build --build-arg VITE_API_URL=/api -t $(IMAGE_CAPTURE) ./frontend/capture

build-stats:
	podman build --build-arg VITE_API_URL=/api -t $(IMAGE_STATS) ./frontend/stats

build-images: build-db build-api build-capture build-stats
	@echo "Imágenes listas:"
	@echo "  $(IMAGE_DB)"
	@echo "  $(IMAGE_API)"
	@echo "  $(IMAGE_CAPTURE)"
	@echo "  $(IMAGE_STATS)"

push-db: build-db
	podman push $(IMAGE_DB)

push-api: build-api
	podman push $(IMAGE_API)

push-capture: build-capture
	podman push $(IMAGE_CAPTURE)

push-stats: build-stats
	podman push $(IMAGE_STATS)

push-images: build-images
	podman push $(IMAGE_DB)
	podman push $(IMAGE_API)
	podman push $(IMAGE_CAPTURE)
	podman push $(IMAGE_STATS)

pull-images:
	podman pull $(IMAGE_DB)
	podman pull $(IMAGE_API)
	podman pull $(IMAGE_CAPTURE)
	podman pull $(IMAGE_STATS)

# Levantar stack desde imágenes de Quay (sin build local)
up-prod:
	podman compose -f docker-compose.prod.yml up -d

# ---------------------------------------------------------------------------
# OpenShift — manifiestos en openshift/
# ---------------------------------------------------------------------------

NS ?= my-golf
OC ?= oc
OPENSHIFT_MANIFESTS := $(filter-out openshift/00-namespace.yaml,$(wildcard openshift/*.yaml))

openshift-ns:
	$(OC) apply -f openshift/00-namespace.yaml

openshift-scc:
	$(OC) adm policy add-scc-to-user anyuid system:serviceaccount:$(NS):db
	$(OC) adm policy add-scc-to-user anyuid system:serviceaccount:$(NS):capture
	$(OC) adm policy add-scc-to-user anyuid system:serviceaccount:$(NS):stats

openshift-apply: openshift-ns openshift-scc
	$(OC) apply $(addprefix -f ,$(OPENSHIFT_MANIFESTS)) -n $(NS)

openshift-deploy: openshift-apply
	@echo "Despliegue aplicado en namespace $(NS)"
	@$(MAKE) openshift-routes NS=$(NS)

openshift-routes:
	@echo "Routes:"
	@$(OC) get routes -n $(NS) -o custom-columns=NAME:.metadata.name,URL:.spec.host

openshift-delete:
	$(OC) delete $(addprefix -f ,$(OPENSHIFT_MANIFESTS)) -n $(NS) --ignore-not-found
	$(OC) delete namespace $(NS) --ignore-not-found
