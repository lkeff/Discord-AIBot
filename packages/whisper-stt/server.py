"""whisper-stt: lightweight FastAPI wrapper around OpenAI Whisper.

Endpoints
---------
GET  /health       -- liveness / readiness probe
POST /transcribe   -- transcribe an uploaded audio file
"""
from __future__ import annotations

import os
import tempfile
import time
from pathlib import Path
from typing import Optional

import whisper
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
MODEL_NAME: str = os.getenv("WHISPER_MODEL", "base")
_model: Optional[whisper.Whisper] = None


def get_model() -> whisper.Whisper:
    """Return the cached Whisper model, loading it on first call."""
    global _model  # noqa: PLW0603
    if _model is None:
        _model = whisper.load_model(MODEL_NAME)
    return _model


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(title="whisper-stt", version="1.0.0")


@app.on_event("startup")
async def _startup() -> None:
    """Eagerly load model so the first request is not slow."""
    get_model()


@app.get("/health")
async def health() -> JSONResponse:
    """Readiness probe -- returns 200 when the model is loaded."""
    try:
        model = get_model()
        return JSONResponse(
            {"status": "ok", "model": MODEL_NAME, "device": str(model.device)}
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(
        ...,
        description="Audio file (mp3, wav, ogg, m4a, webm, ...)",
    ),
    language: Optional[str] = Form(
        None,
        description="ISO-639-1 language code, e.g. 'en'. Auto-detected if omitted.",
    ),
    task: str = Form(
        "transcribe",
        description="'transcribe' or 'translate' (outputs English).",
    ),
) -> JSONResponse:
    """Transcribe an uploaded audio file and return the text."""
    if task not in ("transcribe", "translate"):
        raise HTTPException(
            status_code=400,
            detail="task must be 'transcribe' or 'translate'",
        )

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    t0 = time.perf_counter()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        model = get_model()
        options: dict = {"task": task}
        if language:
            options["language"] = language
        result = model.transcribe(tmp_path, **options)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exc}",
        ) from exc
    finally:
        os.unlink(tmp_path)

    elapsed = round(time.perf_counter() - t0, 3)
    return JSONResponse(
        {
            "text": result["text"].strip(),
            "language": result.get("language"),
            "segments": len(result.get("segments", [])),
            "elapsed_s": elapsed,
            "model": MODEL_NAME,
        }
    )
