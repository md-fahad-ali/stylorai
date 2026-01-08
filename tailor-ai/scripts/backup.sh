#!/bin/bash
# Backup script for Dockerized Postgres
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
docker-compose exec -t postgres pg_dump -U postgres tailorai_db > backup_$TIMESTAMP.sql
echo "Backup created: backup_$TIMESTAMP.sql"
