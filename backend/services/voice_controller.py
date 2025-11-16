from elevenlabs import generate, Voice
from typing import Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings

settings = get_settings()

class VoiceController:
    """
    ElevenLabs integration for voice synthesis
    Converts text ATC communications to speech
    """

    def __init__(self):
        self.api_key = settings.elevenlabs_api_key
        self.enabled = bool(self.api_key)

        if not self.enabled:
            print("⚠️ ElevenLabs API key not configured. Voice synthesis disabled.")

    async def synthesize_atc_message(self, message: str) -> Optional[bytes]:
        """
        Convert ATC message to speech audio
        Returns audio bytes in MP3 format
        """
        if not self.enabled:
            print("⚠️ Voice synthesis skipped (no API key)")
            return None

        try:
            # Use ElevenLabs API to generate speech
            # Using a professional male voice for ATC communications
            audio = generate(
                text=message,
                voice=Voice(
                    voice_id="21m00Tcm4TlvDq8ikWAM",  # Professional male voice
                    settings={
                        "stability": 0.75,
                        "similarity_boost": 0.75
                    }
                ),
                api_key=self.api_key,
                model="eleven_monolingual_v1"
            )

            return audio

        except Exception as e:
            print(f"❌ Error synthesizing voice: {e}")
            return None

    def is_available(self) -> bool:
        """Check if voice synthesis is available"""
        return self.enabled
