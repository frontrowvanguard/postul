"""
TTS Router for text-to-speech synthesis using Supertonic.
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
import logging

from schema import TTSRequest, TTSResponse
from services.tts_service import tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tts", tags=["tts"])


@router.post("/synthesize", response_model=TTSResponse, status_code=status.HTTP_200_OK)
async def synthesize_speech(request: TTSRequest):
    """
    Synthesize speech from text using Supertonic TTS.

    Args:
        request: TTS request with text and optional parameters

    Returns:
        TTSResponse with base64-encoded audio data

    Raises:
        HTTPException: If TTS service is not available or synthesis fails
    """
    try:
        # Ensure TTS service is initialized
        if not tts_service.is_initialized():
            logger.info("Initializing TTS service...")
            if not tts_service.initialize():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="TTS service is not available. Please ensure models are downloaded.",
                )

        # Synthesize speech
        audio_base64 = tts_service.synthesize_base64(
            text=request.text,
            inference_steps=request.inference_steps,
            style_id=request.style_id,
            speed=request.speed,
        )

        # Get sample rate from TTS service
        sample_rate = tts_service.tts.sample_rate if tts_service.tts else 22050

        return TTSResponse(
            audio_base64=audio_base64,
            text=request.text,
            sample_rate=sample_rate,
        )

    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error in TTS synthesis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during TTS synthesis.",
        )


@router.get("/audio/{text:path}", response_class=Response)
async def synthesize_speech_audio(
    text: str, inference_steps: int = 2, style_id: int = 0, speed: float = 1.05
):
    """
    Synthesize speech from text and return raw WAV audio.

    Args:
        text: Text to convert to speech (URL-encoded)
        inference_steps: Number of inference steps (default: 2)
        style_id: Voice style ID (default: 0)

    Returns:
        WAV audio file as binary response
    """
    try:
        # Ensure TTS service is initialized
        if not tts_service.is_initialized():
            logger.info("Initializing TTS service...")
            if not tts_service.initialize():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="TTS service is not available. Please ensure models are downloaded.",
                )

        # Synthesize speech
        audio_bytes = tts_service.synthesize(
            text=text,
            inference_steps=inference_steps,
            style_id=style_id,
            speed=speed,
        )

        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'attachment; filename="speech.wav"',
            },
        )

    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error in TTS synthesis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during TTS synthesis.",
        )


@router.get("/health", status_code=status.HTTP_200_OK)
async def tts_health():
    """
    Check TTS service health status.

    Returns:
        Health status of TTS service
    """
    is_initialized = tts_service.is_initialized()
    return {
        "status": "healthy" if is_initialized else "not_initialized",
        "initialized": is_initialized,
        "message": "TTS service is ready"
        if is_initialized
        else "TTS service needs initialization",
    }
