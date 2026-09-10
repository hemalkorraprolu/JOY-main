"""Abstract Base Class for Open-Source Voice Adapters."""

from abc import ABC, abstractmethod
from typing import Optional


class BaseVoiceAdapter(ABC):
    """Abstract base class for all server-side open-source TTS voice adapters."""

    @abstractmethod
    async def synthesize(self, text: str, voice_name: Optional[str] = None, language: str = "en") -> bytes:
        """Synthesizes text into audio bytes (MP3/WAV format)."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the voice provider endpoint or engine is reachable."""
        pass
