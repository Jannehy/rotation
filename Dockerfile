FROM python:3.12-slim

# tzdata so local days and hours are bucketed in the configured zone
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY rotation ./rotation
COPY static ./static
COPY templates ./templates

ENV ROTATION_DATA=/data \
    NAVIDROME_DB=/navidrome/navidrome.db \
    ROTATION_PORT=8770 \
    PYTHONUNBUFFERED=1

EXPOSE 8770
VOLUME ["/data"]

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8770/health').status==200 else 1)"

# One worker with threads: every request is a short read against SQLite, and
# the sign-in tokens live in this process's memory.
CMD ["gunicorn", "--bind", "0.0.0.0:8770", "--workers", "1", "--threads", "8", \
     "--timeout", "60", "--access-logfile", "-", "rotation.app:create_app()"]
