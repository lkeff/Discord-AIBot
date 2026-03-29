# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ffmpeg \
        libffi-dev \
        libopus-dev \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m botuser

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=botuser:botuser . .

RUN mkdir -p /app/data /app/logs /app/data/image_cache /app/models \
    && chown -R botuser:botuser /app/data /app/logs

USER botuser

ENV PYTHONUNBUFFERED=1

CMD ["python", "bot.py"]
