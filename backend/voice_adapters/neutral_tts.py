"""Neutral Edge-TTS Adapter (Default Open-Source Fallback Engine).
Uses high-quality open-source neural Microsoft Edge TTS voices.
"""

import os
import tempfile
import edge_tts
from typing import Optional
from .base import BaseVoiceAdapter

# Default voice mappings for Indian English & Hindi support
DEFAULT_VOICES = {
    "en": "en-IN-NeerjaNeural",
    "en_us": "en-US-AvaNeural",
    "hi": "hi-IN-SwaraNeural",
    "hinglish": "en-IN-PrabhatNeural"
}


class NeutralEdgeTTSAdapter(BaseVoiceAdapter):
    """Fallback neutral voice adapter powered by Edge-TTS."""

    def is_available(self) -> bool:
        return True

    async def synthesize(self, text: str, voice_name: Optional[str] = None, language: str = "en") -> bytes:
        voice = voice_name or DEFAULT_VOICES.get(language, DEFAULT_VOICES["en"])
        
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(tmp_path)
            with open(tmp_path, "rb") as f:
                data = f.read()
            return data
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
