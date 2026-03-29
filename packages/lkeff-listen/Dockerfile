FROM python:3.11-slim
WORKDIR /app

# System dependencies: ffmpeg for audio, libopus for voice, curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libopus-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source (populated from lkeff/lkeff-listen)
COPY . .

# Create data directories
RUN mkdir -p /app/data /app/logs /app/data/image_cache /app/models

# Non-root user
RUN useradd -m botuser && chown -R botuser:botuser /app
USER botuser

ENV PYTHONUNBUFFERED=1

CMD ["python", "bot.py"]
