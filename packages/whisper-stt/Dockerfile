# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m sttuser

COPY requirements.txt ./
# Install CPU-only PyTorch first (smaller wheel), then remaining deps
RUN pip install --no-cache-dir \
        torch \
        torchaudio \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=sttuser:sttuser server.py ./

# Pre-download the default model at build time for fast cold-start
ARG WHISPER_MODEL=base
RUN python -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

USER sttuser

ENV PYTHONUNBUFFERED=1 \
    WHISPER_MODEL=base

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:5000/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5000"]
