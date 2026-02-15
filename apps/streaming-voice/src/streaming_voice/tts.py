"""
AURIXA TTS (Text-to-Speech) module.
Primary: OSS (Piper, edge-tts) - free, no API keys.
Fallback: Proprietary (OpenAI, ElevenLabs).
"""

import asyncio
import base64
import io
import os
from concurrent.futures import ThreadPoolExecutor

import httpx
from loguru import logger

# --- OSS (free, no keys) ---
PIPER_MODEL_PATH = os.getenv("PIPER_MODEL_PATH", "/models/piper/en_US-lessac-medium.onnx")
EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "en-US-JennyNeural")

# --- Proprietary (keys required) ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

TTS_VOICE_OPENAI = os.getenv("TTS_VOICE_OPENAI", "alloy")
TTS_VOICE_ELEVENLABS = os.getenv("TTS_VOICE_ELEVENLABS", "21m00Tcm4TlvDq8ikWAM")

# Primary = OSS first, then proprietary. Works with zero API keys.
TTS_PROVIDER_ORDER = os.getenv(
    "TTS_PROVIDER_ORDER",
    "piper,edge_tts,openai,elevenlabs",
)

_executor = ThreadPoolExecutor(max_workers=2)
_piper_voice = None


def _piper_configured() -> bool:
    if not PIPER_MODEL_PATH or not os.path.isfile(PIPER_MODEL_PATH):
        return False
    try:
        import piper  # noqa: F401
        return True
    except ImportError:
        return False


def _edge_tts_configured() -> bool:
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False


def _openai_configured() -> bool:
    return bool(OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-placeholder"))


def _elevenlabs_configured() -> bool:
    return bool(ELEVENLABS_API_KEY and ELEVENLABS_API_KEY != "placeholder")


def is_tts_available() -> bool:
    """True if any TTS provider (OSS or proprietary) is available."""
    return bool(configured_providers())


def configured_providers() -> list[str]:
    """List of configured TTS provider names."""
    out = []
    if _piper_configured():
        out.append("piper")
    if _edge_tts_configured():
        out.append("edge_tts")
    if _openai_configured():
        out.append("openai")
    if _elevenlabs_configured():
        out.append("elevenlabs")
    return out


def _wav_to_mp3(wav_bytes: bytes) -> bytes | None:
    """Convert WAV bytes to MP3 using pydub."""
    try:
        from pydub import AudioSegment
        seg = AudioSegment.from_wav(io.BytesIO(wav_bytes))
        buf = io.BytesIO()
        seg.export(buf, format="mp3", bitrate="128k")
        return buf.getvalue()
    except Exception as e:
        logger.warning("WAV→MP3 conversion failed: {}", e)
        return None


def _synthesize_piper_sync(text: str) -> bytes | None:
    """Synchronous Piper synthesis. Run in executor."""
    global _piper_voice
    if not _piper_configured():
        return None
    try:
        from piper import PiperVoice

        if _piper_voice is None:
            _piper_voice = PiperVoice.load(PIPER_MODEL_PATH, use_cuda=False)
        # synthesize() yields AudioChunk objects with audio_int16_bytes
        chunks = list(_piper_voice.synthesize(text[:4096]))
        if not chunks:
            return None
        import wave
        buf = io.BytesIO()
        sample_rate = getattr(chunks[0], "sample_rate", 22050) or 22050
        with wave.open(buf, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            for c in chunks:
                wav.writeframes(getattr(c, "audio_int16_bytes", b""))
        return buf.getvalue()
    except Exception as e:
        logger.warning("Piper TTS failed: {}", e)
        return None


async def synthesize_piper(text: str) -> bytes | None:
    """Piper TTS - local, no API key."""
    loop = asyncio.get_running_loop()
    wav = await loop.run_in_executor(_executor, _synthesize_piper_sync, text)
    if wav:
        mp3 = _wav_to_mp3(wav)
        return mp3 if mp3 else wav  # fallback to WAV if conversion fails
    return None


async def synthesize_edge_tts(text: str) -> bytes | None:
    """edge-tts - free Microsoft TTS, no API key, requires internet."""
    if not _edge_tts_configured():
        return None
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text[:4096], EDGE_TTS_VOICE)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        if not chunks:
            return None
        return b"".join(chunks)
    except Exception as e:
        logger.warning("edge-tts failed: {}", e)
        return None


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


_PROVIDERS = {
    "piper": synthesize_piper,
    "edge_tts": synthesize_edge_tts,
    "openai": synthesize_openai,
    "elevenlabs": synthesize_elevenlabs,
}


async def synthesize(text: str) -> tuple[bytes | None, str]:
    """
    Synthesize speech from text. OSS first, then proprietary fallbacks.
    Returns (audio_bytes, mime_type) or (None, "") on failure.
    """
    if not text or not text.strip():
        return None, ""

    order = [p.strip().lower() for p in TTS_PROVIDER_ORDER.split(",") if p.strip()]
    for name in order:
        fn = _PROVIDERS.get(name)
        if not fn:
            continue
        try:
            audio = await fn(text)
            if audio:
                if name != order[0]:
                    logger.debug("TTS used fallback: {}", name)
                return audio, "audio/mpeg"
        except Exception as e:
            logger.debug("TTS provider {} failed: {}", name, e)
    return None, ""


def to_base64(audio: bytes) -> str:
    """Encode audio bytes to base64 for WebSocket transport."""
    return base64.b64encode(audio).decode("ascii")
