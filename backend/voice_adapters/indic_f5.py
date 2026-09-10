"""AI4Bharat IndicF5 Voice Adapter (Primary Open-Source Self-Hosted GPU TTS).
Connects to self-hosted IndicF5 service for English, Hindi, and Hinglish.
Falls back to neutral TTS if endpoint is unconfigured or offline.
"""

import os
import httpx
from typing import Optional
from .base import BaseVoiceAdapter
from .neutral_tts import NeutralEdgeTTSAdapter


class IndicF5Adapter(BaseVoiceAdapter):
    """Adapter for AI4Bharat IndicF5 TTS Microservice."""

    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url or os.environ.get("INDIC_F5_TTS_URL", "")
        self.fallback = NeutralEdgeTTSAdapter()

    def is_available(self) -> bool:
        return bool(self.endpoint_url and self.endpoint_url.startswith("http"))

    async def synthesize(self, text: str, voice_name: Optional[str] = None, language: str = "en") -> bytes:
        if not self.is_available():
            # Fallback to neutral Edge-TTS with Indian voice mappings if available
            return await self.fallback.synthesize(text, voice_name, language)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "text": text,
                    "language": language, # 'en', 'hi', 'hinglish'
                    "voice": voice_name or "indic_f5_joy"
                }
                response = await client.post(f"{self.endpoint_url}/api/synthesize", json=payload)
                if response.status_code == 200:
                    return response.content
                else:
                    print(f"IndicF5 service returned status {response.status_code}, falling back.")
                    return await self.fallback.synthesize(text, voice_name, language)
        except Exception as e:
            print(f"Error calling IndicF5 service at {self.endpoint_url}: {e}. Using neutral TTS fallback.")
            return await self.fallback.synthesize(text, voice_name, language)
