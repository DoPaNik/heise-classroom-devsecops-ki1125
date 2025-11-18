# =============================================================================
# MULTI-STAGE BUILD FÜR FLASK-ANWENDUNG
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Builder-Stage
# Kompiliert Dependencies und erstellt Python-Wheels für optimale Performance
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

# Setze Arbeitsverzeichnis
WORKDIR /build

# Installiere Build-Dependencies für kompilierte Python-Pakete
# Minimiere Layer durch Kombination von Befehlen und Cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
        libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Kopiere nur Requirements zuerst (Docker Layer Caching Optimierung)
COPY requirements.txt .

# Erstelle Virtual Environment und installiere Dependencies
# --no-cache-dir: Verhindert unnötigen Cache
RUN python -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# STAGE 2: Runtime-Stage
# Minimales Production-Image mit nur notwendigen Komponenten
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# Security: Erstelle non-root User für Container-Ausführung
RUN groupadd -r appuser && \
    useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Setze Arbeitsverzeichnis
WORKDIR /app

# Installiere nur Runtime-Dependencies (falls benötigt, z.B. für PostgreSQL)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 && \
    rm -rf /var/lib/apt/lists/* && \
    # Erstelle Verzeichnisse mit korrekten Berechtigungen
    mkdir -p /app/logs /app/tmp && \
    chown -R appuser:appuser /app

# Kopiere Virtual Environment aus Builder-Stage
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# Kopiere Anwendungscode
COPY --chown=appuser:appuser . .

# Environment Variables für Python und Flask
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=8080

# Security: Wechsle zu non-root User
USER appuser

# Health Check für Container-Orchestrierung
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# Exponiere Port (dokumentativ, nicht bindend)
EXPOSE ${PORT}

# Starte Flask mit Gunicorn für Production
# --bind: Binde an alle Interfaces im Container
# --workers: Anzahl Worker-Prozesse (2-4 x CPU-Cores)
# --threads: Threads pro Worker
# --timeout: Request-Timeout
# --access-logfile: Logging zu stdout für Container-Logs
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--threads", "2", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "app:app"]
