FROM docker.io/library/postgres:16-alpine

COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql

# OpenShift: no initdb en la raíz del PVC (chmod falla en el mount)
ENV PGDATA=/var/lib/postgresql/data/pgdata
