"""
AURIXA TTS (Text-to-Speech) module.
Supports OpenAI TTS and ElevenLabs. Pluggable for local models.
"""

import base64
import os
import httpx
from loguru import logger

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "openai")  # openai | elevenlabs | none
TTS_VOICE_OPENAI = os.getenv("TTS_VOICE_OPENAI", "alloy")  # alloy, echo, fable, onyx, nova, shimmer
TTS_VOICE_ELEVENLABS = os.getenv("TTS_VOICE_ELEVENLABS", "21m00Tcm4TlvDq8ikWAM")  # Rachel


def is_tts_available() -> bool:
    """Returns True if TTS is configured and a provider has a valid key."""
    if TTS_PROVIDER == "none":
        return False
    if TTS_PROVIDER == "openai":
        return bool(OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-placeholder"))
    if TTS_PROVIDER == "elevenlabs":
        return bool(ELEVENLABS_API_KEY and ELEVENLABS_API_KEY != "placeholder")
    return False


async def synthesize_openai(text: str) -> bytes | None:
    """Synthesize speech via OpenAI TTS (tts-1 model)."""
    if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("sk-placeholder"):
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "tts-1",
                    "input": text[:4096],  # TTS limit
                    "voice": TTS_VOICE_OPENAI,
                },
            )
            if r.status_code != 200:
                logger.warning("OpenAI TTS returned {}", r.status_code)
                return None
            return r.content
    except Exception as e:
        logger.warning("OpenAI TTS failed: {}", e)
    return None


async def synthesize_elevenlabs(text: str) -> bytes | None:
    """Synthesize speech via ElevenLabs."""
    if not ELEVENLABS_API_KEY or ELEVENLABS_API_KEY == "placeholder":
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{TTS_VOICE_ELEVENLABS}",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={"text": text[:4096], "model_id": "eleven_monolingual_v1"},
            )
            if r.status_code != 200:
                logger.warning("ElevenLabs TTS returned {}", r.status_code)
                return None
            return r.content
    except Exception as e:
        logger.warning("ElevenLabs TTS failed: {}", e)
    return None


async def synthesize(text: str) -> tuple[bytes | None, str]:
    """
    Synthesize speech from text.
    Returns (audio_bytes, mime_type) or (None, "") on failure.
    """
    if not text or not text.strip():
        return None, ""

    if TTS_PROVIDER == "openai":
        audio = await synthesize_openai(text)
        return audio, "audio/mpeg"
    if TTS_PROVIDER == "elevenlabs":
        audio = await synthesize_elevenlabs(text)
        return audio, "audio/mpeg"
    return None, ""


def to_base64(audio: bytes) -> str:
    """Encode audio bytes to base64 for WebSocket transport."""
    return base64.b64encode(audio).decode("ascii")
