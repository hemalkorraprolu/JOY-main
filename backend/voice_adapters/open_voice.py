"""OpenVoice V2 Voice Adapter (Optional Open-Source Voice Style Adaptation).
Requires explicit consent audit log record before reference voice synthesis.
"""

import os
import httpx
from typing import Optional
from .base import BaseVoiceAdapter
from .neutral_tts import NeutralEdgeTTSAdapter
from database import list_voice_consent_logs


class OpenVoiceV2Adapter(BaseVoiceAdapter):
    """Adapter for OpenVoice V2 self-hosted voice style adaptation."""

    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url or os.environ.get("OPENVOICE_URL", "")
        self.fallback = NeutralEdgeTTSAdapter()

    def is_available(self) -> bool:
        return bool(self.endpoint_url and self.endpoint_url.startswith("http"))

    def has_consent(self, speaker_id: Optional[str]) -> bool:
        if not speaker_id:
            return False
        logs = list_voice_consent_logs(speaker_id)
        return len(logs) > 0

    async def synthesize(self, text: str, voice_name: Optional[str] = None, language: str = "en", speaker_id: Optional[str] = None) -> bytes:
        # Check explicit consent audit record
        if not self.has_consent(speaker_id) or not self.is_available():
            print("OpenVoice V2: No explicit consent audit log or endpoint offline. Using neutral TTS fallback.")
            return await self.fallback.synthesize(text, voice_name, language)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "text": text,
                    "language": language,
                    "speaker_id": speaker_id
                }
                response = await client.post(f"{self.endpoint_url}/api/clone-synthesize", json=payload)
                if response.status_code == 200:
                    return response.content
                else:
                    return await self.fallback.synthesize(text, voice_name, language)
        except Exception as e:
            print(f"Error calling OpenVoice V2 service: {e}. Using neutral fallback.")
            return await self.fallback.synthesize(text, voice_name, language)
