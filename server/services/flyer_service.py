"""Flyer generation service using Gemini API for image generation and editing."""

import logging
import base64
from typing import Optional, List, Dict, Any
from io import BytesIO
from PIL import Image
import asyncio

from config import settings
from google import genai
from google.genai import types
from services.qr_service import qr_service

logger = logging.getLogger(__name__)

# Timeout constants (10 minutes = 600 seconds)
GEMINI_API_TIMEOUT = 600


class FlyerService:
    """Service for generating and editing flyers using Gemini API."""

    def __init__(self):
        """Initialize flyer service with Gemini client."""
        self.gemini_client = genai.Client(api_key=settings.gemini_api_key)
        self.gemini_model = settings.gemini_model
        self.max_edits = 5
        self.a4_width = 2480
        self.a4_height = 3508

    async def generate_initial_flyer(
        self,
        project_name: str,
        project_description: str,
        problem_statement: str,
        project_id: int,
    ) -> Dict[str, Any]:
        """
        Generate initial flyer with idea context and QR code placeholders.

        Args:
            project_name: Name of the project
            project_description: Description of the project
            problem_statement: Problem statement from idea analysis
            project_id: Project ID for QR code generation

        Returns:
            Dictionary with image_url (base64) and conversation_history
        """
        try:
            # Build prompt for initial flyer generation
            prompt = self._build_initial_flyer_prompt(
                project_name, project_description, problem_statement
            )

            logger.info(f"Generating initial flyer for project {project_id}")

            # Generate flyer using Gemini API
            # Using the generate_content method with proper API structure
            # Wrap in timeout to prevent hanging
            try:
                # Run synchronous Gemini API call in thread pool with timeout
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: self.gemini_client.models.generate_content(
                            model=self.gemini_model,
                            contents=[{"role": "user", "parts": [{"text": prompt}]}],
                            config=types.GenerateContentConfig(
                                # Note: Gemini API doesn't support image/png as response_mime_type
                                # We'll parse the response to extract image data
                            ),
                        ),
                    ),
                    timeout=GEMINI_API_TIMEOUT,
                )

                # Extract image from response
                image_base64 = None
                if response and hasattr(response, "candidates"):
                    for candidate in response.candidates:
                        if hasattr(candidate, "content") and candidate.content:
                            if hasattr(candidate.content, "parts"):
                                for part in candidate.content.parts:
                                    if (
                                        hasattr(part, "inline_data")
                                        and part.inline_data
                                    ):
                                        image_data = part.inline_data.data
                                        if isinstance(image_data, bytes):
                                            image_base64 = base64.b64encode(
                                                image_data
                                            ).decode("utf-8")
                                        elif isinstance(image_data, str):
                                            image_base64 = image_data
                                        break
                        if image_base64:
                            break

                if not image_base64:
                    # Fallback: create a placeholder image if API fails
                    logger.warning(
                        "Gemini API did not return image, creating placeholder"
                    )
                    image_base64 = self._create_placeholder_flyer(
                        project_name, project_description, problem_statement
                    )

                # Embed QR codes into the flyer
                final_image_base64 = await self._embed_qr_codes(
                    image_base64, project_id
                )

                # Initialize conversation history
                conversation_history = [
                    {
                        "role": "user",
                        "content": prompt,
                    },
                    {
                        "role": "assistant",
                        "content": "Generated initial flyer with QR code placeholders",
                    },
                ]

                logger.info(f"Successfully generated flyer for project {project_id}")

                return {
                    "image_url": final_image_base64,
                    "conversation_history": conversation_history,
                }

            except asyncio.TimeoutError:
                logger.warning(
                    f"Gemini API timeout after {GEMINI_API_TIMEOUT}s, creating placeholder"
                )
                # Fallback to placeholder
                image_base64 = self._create_placeholder_flyer(
                    project_name, project_description, problem_statement
                )
                final_image_base64 = await self._embed_qr_codes(
                    image_base64, project_id
                )
                conversation_history = [
                    {
                        "role": "user",
                        "content": prompt,
                    },
                    {
                        "role": "assistant",
                        "content": "Generated placeholder flyer (API timeout)",
                    },
                ]
                return {
                    "image_url": final_image_base64,
                    "conversation_history": conversation_history,
                }
            except Exception as api_error:
                logger.error(f"Gemini API error: {api_error}", exc_info=True)
                # Fallback to placeholder
                image_base64 = self._create_placeholder_flyer(
                    project_name, project_description, problem_statement
                )
                final_image_base64 = await self._embed_qr_codes(
                    image_base64, project_id
                )
                conversation_history = [
                    {
                        "role": "user",
                        "content": prompt,
                    },
                    {
                        "role": "assistant",
                        "content": "Generated placeholder flyer",
                    },
                ]
                return {
                    "image_url": final_image_base64,
                    "conversation_history": conversation_history,
                }

        except Exception as e:
            logger.error(f"Error generating flyer: {e}", exc_info=True)
            raise

    async def edit_flyer(
        self,
        current_image_base64: str,
        edit_instruction: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Edit flyer using multi-turn image editing.

        Args:
            current_image_base64: Base64-encoded current flyer image
            edit_instruction: Natural language instruction for editing
            conversation_history: Previous conversation history

        Returns:
            Dictionary with updated image_url and conversation_history
        """
        try:
            # Build conversation for multi-turn editing
            if conversation_history is None:
                conversation_history = []

            # Add user's edit instruction
            conversation_history.append(
                {
                    "role": "user",
                    "content": edit_instruction,
                }
            )

            # Decode base64 image
            image_bytes = base64.b64decode(current_image_base64)

            # Create edit request
            # For multi-turn editing, we need to pass the previous image and instruction
            edit_prompt = f"""
            Edit this flyer image according to the following instruction:
            {edit_instruction}
            
            Important: Keep the two QR code placeholder areas (dotted rectangles) intact.
            Only modify other parts of the flyer design.
            """

            # Use Gemini API for image editing (multi-turn)
            try:
                # Convert image bytes to base64 for API
                image_base64_for_api = base64.b64encode(image_bytes).decode("utf-8")

                # Run synchronous Gemini API call in thread pool with timeout
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: self.gemini_client.models.generate_content(
                            model=self.gemini_model,
                            contents=[
                                {
                                    "role": "user",
                                    "parts": [
                                        {
                                            "inline_data": {
                                                "mime_type": "image/png",
                                                "data": image_base64_for_api,
                                            }
                                        },
                                        {"text": edit_prompt},
                                    ],
                                }
                            ],
                            config=types.GenerateContentConfig(
                                # Note: Gemini API doesn't support image/png as response_mime_type
                                # We'll parse the response to extract image data
                            ),
                        ),
                    ),
                    timeout=GEMINI_API_TIMEOUT,
                )

                # Extract edited image
                edited_image_base64 = None
                if response and hasattr(response, "candidates"):
                    for candidate in response.candidates:
                        if hasattr(candidate, "content") and candidate.content:
                            if hasattr(candidate.content, "parts"):
                                for part in candidate.content.parts:
                                    if (
                                        hasattr(part, "inline_data")
                                        and part.inline_data
                                    ):
                                        edited_image_data = part.inline_data.data
                                        if isinstance(edited_image_data, bytes):
                                            edited_image_base64 = base64.b64encode(
                                                edited_image_data
                                            ).decode("utf-8")
                                        elif isinstance(edited_image_data, str):
                                            edited_image_base64 = edited_image_data
                                        break
                        if edited_image_base64:
                            break

                if not edited_image_base64:
                    # Return original image if editing fails
                    logger.warning(
                        "Gemini API did not return edited image, returning original"
                    )
                    edited_image_base64 = current_image_base64

                # Update conversation history
                conversation_history.append(
                    {
                        "role": "assistant",
                        "content": f"Edited flyer according to: {edit_instruction}",
                    }
                )

                logger.info("Successfully edited flyer")

                return {
                    "image_url": edited_image_base64,
                    "conversation_history": conversation_history,
                }

            except asyncio.TimeoutError:
                logger.warning(
                    f"Gemini API editing timeout after {GEMINI_API_TIMEOUT}s, returning original"
                )
                # Return original image if editing times out
                conversation_history.append(
                    {
                        "role": "assistant",
                        "content": "Edit timed out, returning original image",
                    }
                )
                return {
                    "image_url": current_image_base64,
                    "conversation_history": conversation_history,
                }
            except Exception as api_error:
                logger.error(f"Gemini API editing error: {api_error}", exc_info=True)
                # Return original image if editing fails
                conversation_history.append(
                    {
                        "role": "assistant",
                        "content": "Edit failed, returning original image",
                    }
                )
                return {
                    "image_url": current_image_base64,
                    "conversation_history": conversation_history,
                }

        except Exception as e:
            logger.error(f"Error editing flyer: {e}", exc_info=True)
            raise

    async def _embed_qr_codes(self, flyer_image_base64: str, project_id: int) -> str:
        """
        Embed QR codes into the flyer image at the placeholder locations.

        Args:
            flyer_image_base64: Base64-encoded flyer image
            project_id: Project ID for QR code generation

        Returns:
            Base64-encoded image with QR codes embedded
        """
        try:
            # Generate QR codes
            survey_qr_base64, project_qr_base64 = qr_service.generate_flyer_qr_codes(
                project_id
            )

            # Decode flyer image
            flyer_bytes = base64.b64decode(flyer_image_base64)
            flyer_image = Image.open(BytesIO(flyer_bytes))

            # Decode QR code images
            survey_qr_bytes = base64.b64decode(survey_qr_base64)
            project_qr_bytes = base64.b64decode(project_qr_base64)
            survey_qr_image = Image.open(BytesIO(survey_qr_bytes))
            project_qr_image = Image.open(BytesIO(project_qr_bytes))

            # Resize QR codes to appropriate size (e.g., 400x400 pixels)
            qr_size = 400
            survey_qr_image = survey_qr_image.resize((qr_size, qr_size), Image.LANCZOS)
            project_qr_image = project_qr_image.resize(
                (qr_size, qr_size), Image.LANCZOS
            )

            # Calculate positions for QR codes
            # Place them in the bottom corners with some margin
            margin = 200
            qr_y = self.a4_height - qr_size - margin

            # Left QR code (survey)
            left_qr_x = margin
            # Right QR code (project)
            right_qr_x = self.a4_width - qr_size - margin

            # Paste QR codes onto flyer
            flyer_image.paste(survey_qr_image, (left_qr_x, qr_y))
            flyer_image.paste(project_qr_image, (right_qr_x, qr_y))

            # Convert back to base64
            output_buffer = BytesIO()
            flyer_image.save(output_buffer, format="PNG")
            output_bytes = output_buffer.getvalue()
            output_base64 = base64.b64encode(output_bytes).decode("utf-8")

            logger.info(f"Embedded QR codes into flyer for project {project_id}")

            return output_base64

        except Exception as e:
            logger.error(f"Error embedding QR codes: {e}", exc_info=True)
            # Return original image if QR embedding fails
            return flyer_image_base64

    def _build_initial_flyer_prompt(
        self,
        project_name: str,
        project_description: str,
        problem_statement: str,
    ) -> str:
        """
        Build prompt for initial flyer generation.

        Args:
            project_name: Name of the project
            project_description: Description of the project
            problem_statement: Problem statement

        Returns:
            Formatted prompt string
        """
        prompt = f"""
Create a professional, eye-catching A4-sized flyer (2480x3508 pixels) for a startup idea validation campaign.

Project Details:
- Name: {project_name}
- Description: {project_description}
- Problem Statement: {problem_statement}

Design Requirements:
1. Create an engaging, modern design suitable for printing
2. Include the project name prominently
3. Highlight the problem statement
4. Use a clean, professional color scheme
5. Leave TWO blank dotted rectangular areas (approximately 400x400 pixels each) in the bottom corners:
   - Bottom left corner: for survey QR code
   - Bottom right corner: for project link QR code
6. Make the design visually appealing and suitable for sharing on social media

The flyer should be designed to attract people to scan the QR codes and engage with the idea validation process.
"""
        return prompt

    def _create_placeholder_flyer(
        self,
        project_name: str,
        project_description: str,
        problem_statement: str,
    ) -> str:
        """
        Create a placeholder flyer image if Gemini API fails.

        Args:
            project_name: Name of the project
            project_description: Description of the project
            problem_statement: Problem statement

        Returns:
            Base64-encoded placeholder image
        """
        try:
            # Create a simple placeholder image
            img = Image.new("RGB", (self.a4_width, self.a4_height), color="white")
            from PIL import ImageDraw, ImageFont

            draw = ImageDraw.Draw(img)

            # Try to use a default font, fallback to basic if not available
            try:
                font_large = ImageFont.truetype(
                    "/System/Library/Fonts/Helvetica.ttc", 80
                )
                font_medium = ImageFont.truetype(
                    "/System/Library/Fonts/Helvetica.ttc", 50
                )
                font_small = ImageFont.truetype(
                    "/System/Library/Fonts/Helvetica.ttc", 40
                )
            except (OSError, IOError):
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()

            # Draw project name
            draw.text((200, 300), project_name, fill="black", font=font_large)

            # Draw description
            y_pos = 500
            for line in project_description[:200].split("\n"):
                draw.text((200, y_pos), line[:80], fill="gray", font=font_medium)
                y_pos += 60

            # Draw problem statement
            y_pos += 100
            draw.text((200, y_pos), "Problem:", fill="black", font=font_medium)
            y_pos += 70
            for line in problem_statement[:300].split("\n"):
                draw.text((200, y_pos), line[:80], fill="darkblue", font=font_small)
                y_pos += 50

            # Draw QR code placeholders
            margin = 200
            qr_size = 400
            qr_y = self.a4_height - qr_size - margin

            # Left placeholder - draw dashed rectangle manually
            # PIL ImageDraw doesn't support dash parameter, so we draw it manually
            dash_length = 10
            gap_length = 10
            x1, y1 = margin, qr_y
            x2, y2 = margin + qr_size, qr_y + qr_size
            
            # Top edge
            x = x1
            while x < x2:
                draw.line([(x, y1), (min(x + dash_length, x2), y1)], fill="gray", width=3)
                x += dash_length + gap_length
            
            # Bottom edge
            x = x1
            while x < x2:
                draw.line([(x, y2), (min(x + dash_length, x2), y2)], fill="gray", width=3)
                x += dash_length + gap_length
            
            # Left edge
            y = y1
            while y < y2:
                draw.line([(x1, y), (x1, min(y + dash_length, y2))], fill="gray", width=3)
                y += dash_length + gap_length
            
            # Right edge
            y = y1
            while y < y2:
                draw.line([(x2, y), (x2, min(y + dash_length, y2))], fill="gray", width=3)
                y += dash_length + gap_length
            draw.text(
                (margin + 50, qr_y + qr_size // 2 - 20),
                "QR Code",
                fill="gray",
                font=font_small,
            )

            # Right placeholder - draw dashed rectangle manually
            right_x = self.a4_width - qr_size - margin
            x1, y1 = right_x, qr_y
            x2, y2 = right_x + qr_size, qr_y + qr_size
            
            # Top edge
            x = x1
            while x < x2:
                draw.line([(x, y1), (min(x + dash_length, x2), y1)], fill="gray", width=3)
                x += dash_length + gap_length
            
            # Bottom edge
            x = x1
            while x < x2:
                draw.line([(x, y2), (min(x + dash_length, x2), y2)], fill="gray", width=3)
                x += dash_length + gap_length
            
            # Left edge
            y = y1
            while y < y2:
                draw.line([(x1, y), (x1, min(y + dash_length, y2))], fill="gray", width=3)
                y += dash_length + gap_length
            
            # Right edge
            y = y1
            while y < y2:
                draw.line([(x2, y), (x2, min(y + dash_length, y2))], fill="gray", width=3)
                y += dash_length + gap_length
            draw.text(
                (right_x + 50, qr_y + qr_size // 2 - 20),
                "QR Code",
                fill="gray",
                font=font_small,
            )

            # Convert to base64
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            return base64.b64encode(buffer.getvalue()).decode("utf-8")

        except Exception as e:
            logger.error(f"Error creating placeholder flyer: {e}", exc_info=True)
            # Return a minimal white image
            img = Image.new("RGB", (self.a4_width, self.a4_height), color="white")
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            return base64.b64encode(buffer.getvalue()).decode("utf-8")


# Singleton instance
flyer_service = FlyerService()
