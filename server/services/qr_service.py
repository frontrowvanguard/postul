"""QR code generation service for flyers."""

import qrcode
from qrcode.image.pil import PilImage
from io import BytesIO
import base64
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


class QRCodeService:
    """Service for generating QR codes for flyers."""

    def __init__(self):
        """Initialize QR code service."""
        pass

    def generate_qr_code(self, data: str, size: int = 300) -> bytes:
        """
        Generate a QR code image as PNG bytes.

        Args:
            data: The data to encode in the QR code
            size: The size of the QR code image in pixels (default: 300)

        Returns:
            PNG image bytes
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction for print
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Resize to desired size
        from PIL import Image
        img = img.resize((size, size), resample=Image.LANCZOS)

        # Convert to bytes
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue()

    def generate_qr_code_base64(self, data: str, size: int = 300) -> str:
        """
        Generate a QR code image as base64-encoded string.

        Args:
            data: The data to encode in the QR code
            size: The size of the QR code image in pixels (default: 300)

        Returns:
            Base64-encoded PNG image string
        """
        qr_bytes = self.generate_qr_code(data, size)
        return base64.b64encode(qr_bytes).decode("utf-8")

    def generate_flyer_qr_codes(
        self, project_id: int, base_url: str = "https://postul.app"
    ) -> Tuple[str, str]:
        """
        Generate two QR codes for a flyer:
        1. Survey link (project-specific survey URL)
        2. Project detail link (deep link to project)

        Args:
            project_id: The project ID
            base_url: Base URL for the application (default: https://postul.app)

        Returns:
            Tuple of (survey_qr_base64, project_qr_base64)
        """
        # Generate survey link QR code
        # Using deep link format: postul://survey/{project_id}
        survey_url = f"{base_url}/survey/{project_id}"
        survey_qr = self.generate_qr_code_base64(survey_url, size=400)

        # Generate project detail link QR code
        # Using deep link format: postul://project/{project_id}
        project_url = f"{base_url}/project/{project_id}"
        project_qr = self.generate_qr_code_base64(project_url, size=400)

        logger.info(f"Generated QR codes for project {project_id}")
        return survey_qr, project_qr


# Singleton instance
qr_service = QRCodeService()
