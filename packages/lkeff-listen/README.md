# lkeff-listen

Python voice/TTS/image/accessibility Discord bot, packaged as a workspace service.

## Source

Source code lives in [lkeff/lkeff-listen](https://github.com/lkeff/lkeff-listen).
This directory provides the Docker wrapper and environment configuration to run it
alongside the other services in the `discord-aibot` monorepo.

## Features

- **Voice/STT** — Whisper + DeepSpeech speech-to-text, VAD
- **TTS** — Azure, Google Cloud, and Windows Narrator text-to-speech
- **Image generation** — DALL-E 3 with accessibility adaptations
- **Code audit** — Library standards and security analysis
- **House system** — Community faction/house membership
- **Centralized logging** — Structured logs, startup validator, health checks

## Populating source

```bash
# Clone lkeff-listen source into this directory
git clone https://github.com/lkeff/lkeff-listen.git .
```

## Key commands

| Discord Command | Description |
|---|---|
| `/join` / `/leave` | Join/leave voice channel |
| `/listen` / `/stop_listening` | Start/stop STT |
| `/voiceresponse on\|off` | Toggle voice TTS responses |
| `/image <prompt>` | Generate image with DALL-E 3 |
| `/auditcode` | Audit uploaded code file |
| `/ask <question>` | Ask the AI |
| `/ping` / `/health_check` | Bot status |

See the [lkeff-listen README](https://github.com/lkeff/lkeff-listen#readme) for full command reference.

## Environment

Copy `.env.example` values into the root `.env` file. The service reads all
vars from the shared env file injected by docker-compose.
