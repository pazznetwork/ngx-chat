#!/bin/bash
set -e

# Start environment
echo "Starting Docker environment..."
docker-compose -f docker/test-env/docker-compose.yml up -d

# Wait for healthy
echo "Waiting for ejabberd to be healthy..."
cnt=0
while true; do
  container_id=$(docker-compose -f docker/test-env/docker-compose.yml ps -q ejabberd)
  
  if [ -n "$container_id" ]; then
    status=$(docker inspect --format '{{.State.Health.Status}}' "$container_id")
    echo "Attempt $cnt: Container status is '$status'"
    if [ "$status" = "healthy" ]; then
      echo "Ejabberd is healthy!"
      break
    fi
  else
    echo "Attempt $cnt: Container not found..."
  fi

  cnt=$((cnt+1))
  if [ $cnt -ge 60 ]; then
    echo "Timed out waiting for ejabberd!"
    exit 1
  fi
  sleep 5
done

# Register Admin
# NOTE: The 'users' table in our SQL schema (01-schema...) does NOT contain the admin user.
# In CI, this user is registered via an explicit 'ejabberdctl register' command in the workflow.
# This script mirrors that behavior for local development to ensure the environment is consistent.
echo "Registering local-admin user..."
docker-compose -f docker/test-env/docker-compose.yml exec -T ejabberd \
  /home/ejabberd/bin/ejabberdctl --node ejabberd@local-jabber.entenhausen.pazz.de \
  register local-admin local-jabber.entenhausen.pazz.de AdminLocalPassword123! || echo "Admin registration failed (already exists?)"

echo "Environment ready!"
