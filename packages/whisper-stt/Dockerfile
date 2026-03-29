FROM python:3.11-slim
WORKDIR /app

# ffmpeg required by Whisper for audio decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
# Install torch CPU-only first to keep layer small, then the rest
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY server.py ./

# Pre-download the default model at build time so the first request is fast
ARG WHISPER_MODEL=base
RUN python -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

RUN useradd -m sttuser && chown -R sttuser:sttuser /app
USER sttuser

ENV PYTHONUNBUFFERED=1 \
    WHISPER_MODEL=base

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:5000/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5000"]
