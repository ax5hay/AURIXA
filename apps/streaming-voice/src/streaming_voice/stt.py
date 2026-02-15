"""
AURIXA STT (Speech-to-Text) module.
Primary: OSS (Vosk, faster-whisper, SpeechBrain) - free, no API keys.
Fallbacks: Proprietary (AssemblyAI, Deepgram, Whisper API).
Service never breaks: OSS always available when configured.
"""

import asyncio
import io
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

import httpx
from loguru import logger

# --- OSS (free, no keys) ---
VOSK_MODEL_PATH = os.getenv("VOSK_MODEL_PATH", "")
FASTER_WHISPER_MODEL = os.getenv("FASTER_WHISPER_MODEL", "tiny")  # tiny, base, small, medium, large-v2
SPEECHBRAIN_ASR_MODEL = os.getenv("SPEECHBRAIN_ASR_MODEL", "speechbrain/asr-wav2vec2-commonvoice-en")

# --- Proprietary (keys required) ---
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY", "")
ASSEMBLYAI_BASE = os.getenv("ASSEMBLYAI_BASE_URL", "https://api.assemblyai.com")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"

# Primary = OSS first, then proprietary. Service works with zero API keys.
STT_PROVIDER_ORDER = os.getenv(
    "STT_PROVIDER_ORDER",
    "vosk,faster_whisper,speechbrain,assemblyai,deepgram,whisper",
)

_executor = ThreadPoolExecutor(max_workers=2)

# Lazy-loaded models (thread-safe-ish for single-worker)
_vosk_model = None
_faster_whisper_model = None
_speechbrain_model = None


def _ensure_wav_16k_mono(audio_bytes: bytes) -> bytes | None:
    """Convert webm/opus/mp3/etc to 16kHz mono WAV bytes. Uses pydub."""
    try:
        from pydub import AudioSegment
    except ImportError:
        return audio_bytes
    try:
        for fmt in ("webm", "ogg", "mp3", "wav", "raw"):
            try:
                seg = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
                break
            except Exception:
                continue
        else:
            seg = AudioSegment.from_file(io.BytesIO(audio_bytes))
        seg = seg.set_frame_rate(16000).set_channels(1)
        buf = io.BytesIO()
        seg.export(buf, format="wav")
        return buf.getvalue()
    except Exception as e:
        logger.warning("Audio conversion failed: {}", e)
        return None


def _raw_pcm_16k_mono(audio_bytes: bytes) -> bytes | None:
    """Convert to raw 16-bit PCM 16kHz mono for Vosk."""
    try:
        from pydub import AudioSegment
    except ImportError:
        return None
    try:
        for fmt in ("webm", "ogg", "mp3", "wav"):
            try:
                seg = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
                break
            except Exception:
                continue
        else:
            seg = AudioSegment.from_file(io.BytesIO(audio_bytes))
        seg = seg.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        return seg.raw_data
    except Exception as e:
        logger.warning("PCM conversion failed: {}", e)
        return None


def _transcribe_vosk_sync(audio_bytes: bytes) -> str | None:
    """Synchronous Vosk transcription. Run in executor."""
    global _vosk_model
    if not VOSK_MODEL_PATH or not os.path.isdir(VOSK_MODEL_PATH):
        return None
    try:
        import json
        from vosk import KaldiRecognizer, Model
    except ImportError:
        return None
    try:
        if _vosk_model is None:
            _vosk_model = Model(VOSK_MODEL_PATH)
        pcm = _raw_pcm_16k_mono(audio_bytes)
        if not pcm:
            return None
        rec = KaldiRecognizer(_vosk_model, 16000)
        rec.AcceptWaveform(pcm)
        result = json.loads(rec.FinalResult())
        return (result.get("text") or "").strip()
    except Exception as e:
        logger.warning("Vosk STT failed: {}", e)
        return None


def _transcribe_faster_whisper_sync(audio_bytes: bytes) -> str | None:
    """Synchronous faster-whisper transcription. Run in executor."""
    global _faster_whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None
    try:
        if _faster_whisper_model is None:
            _faster_whisper_model = WhisperModel(FASTER_WHISPER_MODEL, device="cpu", compute_type="int8")
        wav = _ensure_wav_16k_mono(audio_bytes)
        data = wav if wav else audio_bytes
        ext = ".wav" if wav else ".webm"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
            f.write(data)
            path = f.name
        try:
            segments, _ = _faster_whisper_model.transcribe(path)
            text = " ".join(s.text for s in segments if s.text).strip()
            return text or None
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
    except Exception as e:
        logger.warning("faster-whisper STT failed: {}", e)
        return None


def _transcribe_speechbrain_sync(audio_bytes: bytes) -> str | None:
    """Synchronous SpeechBrain transcription. Run in executor."""
    global _speechbrain_model
    try:
        from speechbrain.inference.ASR import EncoderDecoderASR
    except ImportError:
        return None
    try:
        if _speechbrain_model is None:
            _speechbrain_model = EncoderDecoderASR.from_hparams(
                source=SPEECHBRAIN_ASR_MODEL,
                savedir=os.path.join(tempfile.gettempdir(), "sb_asr_cache"),
            )
        wav = _ensure_wav_16k_mono(audio_bytes)
        if not wav:
            return None
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(wav)
            path = f.name
        try:
            text = _speechbrain_model.transcribe_file(path)
            return (text or "").strip() or None
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
    except Exception as e:
        logger.warning("SpeechBrain STT failed: {}", e)
        return None


def _vosk_configured() -> bool:
    if not VOSK_MODEL_PATH or not os.path.isdir(VOSK_MODEL_PATH):
        return False
    try:
        import vosk  # noqa: F401
        return True
    except ImportError:
        return False


def _faster_whisper_configured() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def _speechbrain_configured() -> bool:
    try:
        import speechbrain  # noqa: F401
        return True
    except ImportError:
        return False


def _assemblyai_configured() -> bool:
    return bool(ASSEMBLYAI_API_KEY and not ASSEMBLYAI_API_KEY.startswith("placeholder"))


def _deepgram_configured() -> bool:
    return bool(DEEPGRAM_API_KEY and not DEEPGRAM_API_KEY.startswith("sk-placeholder"))


def _whisper_api_configured() -> bool:
    return bool(OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-placeholder"))


def is_stt_available() -> bool:
    """True if any STT provider (OSS or proprietary) is configured."""
    return (
        _vosk_configured()
        or _faster_whisper_configured()
        or _speechbrain_configured()
        or _assemblyai_configured()
        or _deepgram_configured()
        or _whisper_api_configured()
    )


def configured_providers() -> list[str]:
    """List of configured STT provider names."""
    out = []
    if _vosk_configured():
        out.append("vosk")
    if _faster_whisper_configured():
        out.append("faster_whisper")
    if _speechbrain_configured():
        out.append("speechbrain")
    if _assemblyai_configured():
        out.append("assemblyai")
    if _deepgram_configured():
        out.append("deepgram")
    if _whisper_api_configured():
        out.append("whisper")
    return out


# --- Async wrappers for OSS (run sync in executor) ---
async def transcribe_vosk(audio_bytes: bytes) -> str | None:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _transcribe_vosk_sync, audio_bytes)


async def transcribe_faster_whisper(audio_bytes: bytes) -> str | None:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _transcribe_faster_whisper_sync, audio_bytes)


async def transcribe_speechbrain(audio_bytes: bytes) -> str | None:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _transcribe_speechbrain_sync, audio_bytes)


# --- Proprietary (async HTTP) ---
async def transcribe_assemblyai(audio_bytes: bytes) -> str | None:
    if not _assemblyai_configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            up = await client.post(
                f"{ASSEMBLYAI_BASE}/v2/upload",
                content=audio_bytes,
                headers={"Authorization": ASSEMBLYAI_API_KEY},
            )
            if up.status_code != 200:
                return None
            upload_url = up.json().get("upload_url")
            if not upload_url:
                return None
            tr = await client.post(
                f"{ASSEMBLYAI_BASE}/v2/transcript",
                json={"audio_url": upload_url},
                headers={"Authorization": ASSEMBLYAI_API_KEY, "Content-Type": "application/json"},
            )
            if tr.status_code != 200:
                return None
            tid = tr.json().get("id")
            if not tid:
                return None
            for _ in range(15):
                await asyncio.sleep(1.0)
                poll = await client.get(
                    f"{ASSEMBLYAI_BASE}/v2/transcript/{tid}",
                    headers={"Authorization": ASSEMBLYAI_API_KEY},
                )
                if poll.status_code != 200:
                    continue
                data = poll.json()
                if data.get("status") == "completed":
                    return (data.get("text") or "").strip()
                if data.get("status") == "error":
                    return None
    except Exception as e:
        logger.warning("AssemblyAI STT failed: {}", e)
    return None


async def transcribe_deepgram(audio_bytes: bytes) -> str | None:
    if not _deepgram_configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                DEEPGRAM_URL,
                content=audio_bytes,
                headers={"Authorization": f"Token {DEEPGRAM_API_KEY}"},
                params={"model": "nova-2", "language": "en", "smart_format": "true"},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            channel = data.get("results", {}).get("channels", [{}])[0]
            alternatives = channel.get("alternatives", [])
            if alternatives:
                return (alternatives[0].get("transcript") or "").strip()
    except Exception as e:
        logger.warning("Deepgram STT failed: {}", e)
    return None


async def transcribe_whisper_api(audio_bytes: bytes) -> str | None:
    if not _whisper_api_configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                WHISPER_URL,
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                data={"model": "whisper-1"},
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            return (data.get("text") or "").strip()
    except Exception as e:
        logger.warning("Whisper API STT failed: {}", e)
    return None


_PROVIDERS = {
    "vosk": transcribe_vosk,
    "faster_whisper": transcribe_faster_whisper,
    "speechbrain": transcribe_speechbrain,
    "assemblyai": transcribe_assemblyai,
    "deepgram": transcribe_deepgram,
    "whisper": transcribe_whisper_api,
}


async def transcribe(audio_bytes: bytes) -> str | None:
    """
    Transcribe audio. OSS first (free), then proprietary fallbacks.
    Service never breaks: works with zero API keys when OSS is configured.
    """
    order = [p.strip().lower() for p in STT_PROVIDER_ORDER.split(",") if p.strip()]
    for name in order:
        fn = _PROVIDERS.get(name)
        if not fn:
            continue
        result = await fn(audio_bytes)
        if result:
            if name != order[0]:
                logger.debug("STT used fallback: {}", name)
            return result
    return None
