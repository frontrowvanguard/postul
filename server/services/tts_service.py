"""
TTS Service using Supertonic ONNX models.
Properly implements the multi-model architecture from Supertonic.
"""

import logging
from pathlib import Path
from typing import Optional
import numpy as np
import soundfile as sf
import io
import base64

from services.tts_helper import (
    load_text_to_speech,
    load_voice_style,
    TextToSpeech,
    Style,
)

logger = logging.getLogger(__name__)


class TTSService:
    """Service for text-to-speech using Supertonic ONNX models."""

    def __init__(self, assets_dir: Optional[str] = None):
        """
        Initialize TTS service.

        Args:
            assets_dir: Directory containing Supertonic assets (default: ./assets)
        """
        if assets_dir is None:
            # Default to assets directory in server root
            assets_dir = Path(__file__).parent.parent / "assets"

        self.assets_dir = Path(assets_dir)
        self.onnx_dir = self.assets_dir / "onnx"
        self.voice_styles_dir = self.assets_dir / "voice_styles"

        self.tts: Optional[TextToSpeech] = None
        self.default_style: Optional[Style] = None
        self._initialized = False

    def initialize(self) -> bool:
        """
        Initialize the TTS model by loading all ONNX sessions and voice styles.

        Returns:
            True if initialization successful, False otherwise
        """
        if self._initialized:
            return True

        try:
            # Check if ONNX directory exists
            if not self.onnx_dir.exists():
                logger.error(f"ONNX directory not found: {self.onnx_dir}")
                return False

            # Check for required ONNX files
            required_files = [
                "duration_predictor.onnx",
                "text_encoder.onnx",
                "vector_estimator.onnx",
                "vocoder.onnx",
                "tts.json",
                "unicode_indexer.json",
            ]
            for file in required_files:
                if not (self.onnx_dir / file).exists():
                    logger.error(f"Required file not found: {self.onnx_dir / file}")
                    return False

            # Load TTS model
            logger.info(f"Loading Supertonic TTS models from {self.onnx_dir}")
            self.tts = load_text_to_speech(str(self.onnx_dir), use_gpu=False)

            # Load default voice style (style_id 0)
            # Look for voice style files in the voice_styles directory
            if self.voice_styles_dir.exists():
                style_files = sorted(list(self.voice_styles_dir.glob("*.json")))
                if style_files:
                    logger.info(f"Loading voice style from {style_files[0]}")
                    self.default_style = load_voice_style([str(style_files[0])])
                else:
                    logger.warning("No voice style files found, using default")
                    # Create a minimal default style (this may need adjustment based on actual format)
                    # For now, we'll try to find style files in other locations
                    style_files = list(self.assets_dir.rglob("*.json"))
                    style_files = [f for f in style_files if "style" in f.name.lower()]
                    if style_files:
                        logger.info(f"Found style file: {style_files[0]}")
                        self.default_style = load_voice_style([str(style_files[0])])
                    else:
                        raise RuntimeError("No voice style files found")
            else:
                # Try to find style files elsewhere
                style_files = list(self.assets_dir.rglob("*style*.json"))
                if style_files:
                    logger.info(f"Loading voice style from {style_files[0]}")
                    self.default_style = load_voice_style([str(style_files[0])])
                else:
                    raise RuntimeError("No voice style files found")

            self._initialized = True
            logger.info("Supertonic TTS service initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize TTS service: {e}", exc_info=True)
            return False

    def synthesize(
        self,
        text: str,
        inference_steps: int = 2,
        style_id: int = 0,
        speed: float = 1.05,
    ) -> bytes:
        """
        Synthesize speech from text.

        Args:
            text: Input text to convert to speech
            inference_steps: Number of inference steps (default: 2)
            style_id: Voice style ID (default: 0)
            speed: Speech speed multiplier (default: 1.05)

        Returns:
            Audio data as WAV bytes

        Raises:
            RuntimeError: If service is not initialized or synthesis fails
        """
        if not self._initialized:
            if not self.initialize():
                raise RuntimeError("TTS service not initialized")

        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        if self.tts is None or self.default_style is None:
            raise RuntimeError("TTS models not loaded")

        try:
            # Generate audio using the TextToSpeech pipeline
            wav, _ = self.tts(
                text, self.default_style, total_step=inference_steps, speed=speed
            )

            # Extract audio array (remove batch dimension if present)
            if len(wav.shape) > 1:
                audio_array = wav[0] if wav.shape[0] == 1 else wav.squeeze()
            else:
                audio_array = wav

            # Ensure audio is float32 and in valid range
            audio_array = audio_array.astype(np.float32)
            audio_array = np.clip(audio_array, -1.0, 1.0)

            # Get sample rate from TTS config
            sample_rate = self.tts.sample_rate

            # Convert to WAV bytes
            buffer = io.BytesIO()
            sf.write(buffer, audio_array, sample_rate, format="WAV")
            buffer.seek(0)
            return buffer.read()

        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}", exc_info=True)
            raise RuntimeError(f"TTS synthesis failed: {str(e)}")

    def synthesize_base64(
        self,
        text: str,
        inference_steps: int = 2,
        style_id: int = 0,
        speed: float = 1.05,
    ) -> str:
        """
        Synthesize speech from text and return as base64-encoded string.

        Args:
            text: Input text to convert to speech
            inference_steps: Number of inference steps (default: 2)
            style_id: Voice style ID (default: 0)
            speed: Speech speed multiplier (default: 1.05)

        Returns:
            Base64-encoded WAV audio data
        """
        audio_bytes = self.synthesize(text, inference_steps, style_id, speed)
        return base64.b64encode(audio_bytes).decode("utf-8")

    def is_initialized(self) -> bool:
        """Check if TTS service is initialized."""
        return self._initialized


# Global TTS service instance
tts_service = TTSService()
