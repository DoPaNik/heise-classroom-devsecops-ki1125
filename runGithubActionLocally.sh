#!/bin/bash

# export DOCKER_HOST=unix:///var/run/docker.sock

# act \
#   --container-architecture linux/arm64 \
#   --container-daemon-socket unix:///var/run/docker.sock \
#   --container-options "--privileged" \
#   --secret-file my.secrets \

# Script zum lokalen Ausführen von GitHub Actions mit 'act'
# Für macOS mit Rancher Desktop

# Docker Socket Pfade für verschiedene Umgebungen
RANCHER_SOCKET="$HOME/.rd/docker.sock"
DOCKER_DESKTOP_SOCKET="$HOME/.docker/run/docker.sock"
STANDARD_SOCKET="/var/run/docker.sock"

# Erkenne welcher Socket verfügbar ist
if [ -S "$STANDARD_SOCKET" ]; then
    export DOCKER_HOST="unix://$STANDARD_SOCKET"
    SOCKET_PATH="$STANDARD_SOCKET"
    echo "✓ Standard Docker Socket erkannt"
elif [ -S "$DOCKER_DESKTOP_SOCKET" ]; then
    export DOCKER_HOST="unix://$DOCKER_DESKTOP_SOCKET"
    SOCKET_PATH="$DOCKER_DESKTOP_SOCKET"
    echo "✓ Docker Desktop erkannt"
elif [ -S "$RANCHER_SOCKET" ]; then
    export DOCKER_HOST="unix://$RANCHER_SOCKET"
    SOCKET_PATH="$RANCHER_SOCKET"
    echo "✓ Rancher Desktop erkannt"
else
    echo "❌ Fehler: Kein Docker Socket gefunden."
    echo "   Geprüfte Pfade:"
    echo "   - $RANCHER_SOCKET (Rancher Desktop)"
    echo "   - $DOCKER_DESKTOP_SOCKET (Docker Desktop)"
    echo "   - $STANDARD_SOCKET (Standard)"
    exit 1
fi

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Fehler: Docker ist nicht erreichbar oder läuft nicht."
    echo "   Bitte starten Sie Rancher Desktop / Docker Desktop."
    exit 1
fi

echo "✓ Docker Host: $DOCKER_HOST"
echo "✓ Docker läuft"
echo ""

# Führe act aus mit zusätzlichen Optionen
# --container-architecture: Verwende amd64 Architektur
# --container-daemon-socket: Socket auf dem Host
# --container-options: Mounte Socket in Container + privileged für Buildx
# workflow_dispatch: Simuliere manuellen Workflow-Trigger

act \
  --container-architecture linux/arm64 \
  --container-options "--privileged" \
  --secret-file my.secrets \
  --action-offline-mode \
  "$@"



# Alle Workflows ausführen
#./runGithubActionLocally.sh

# Spezifischen Workflow ausführen
#./runGithubActionLocally.sh -W .github/workflows/buildAndPushContainer.yml

# Spezifischen Job ausführen
#./runGithubActionLocally.sh -j build_and_push

# Dry-run ohne Ausführung
#./runGithubActionLocally.sh -n
