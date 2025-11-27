#!/usr/bin/env python3
"""
Script to download Supertonic ONNX models and assets from Hugging Face.

This script downloads the necessary model files and assets required for TTS.
Requires Git LFS to be installed and initialized.
"""
import subprocess
import sys
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def check_git_lfs() -> bool:
    """Check if Git LFS is installed and initialized."""
    try:
        # Check if git-lfs is installed
        result = subprocess.run(
            ["git", "lfs", "version"],
            capture_output=True,
            text=True,
            check=True,
        )
        logger.info(f"Git LFS found: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        logger.error("Git LFS is not installed or not available")
        logger.error("Please install Git LFS:")
        logger.error("  macOS: brew install git-lfs && git lfs install")
        logger.error("  Other: See https://git-lfs.com")
        return False


def download_models(assets_dir: Path) -> bool:
    """
    Download Supertonic models from Hugging Face.

    Args:
        assets_dir: Directory to download assets to

    Returns:
        True if download successful, False otherwise
    """
    repo_url = "https://huggingface.co/Supertone/supertonic"
    assets_dir.mkdir(parents=True, exist_ok=True)

    # Check if assets directory already has content
    if any(assets_dir.iterdir()):
        logger.warning(f"Assets directory {assets_dir} is not empty")
        response = input("Do you want to continue and potentially overwrite files? (y/N): ")
        if response.lower() != "y":
            logger.info("Download cancelled")
            return False

    try:
        logger.info(f"Downloading Supertonic models from {repo_url}")
        logger.info(f"Target directory: {assets_dir.absolute()}")

        # Clone the repository
        subprocess.run(
            ["git", "clone", repo_url, str(assets_dir)],
            check=True,
            capture_output=True,
            text=True,
        )

        logger.info("Successfully downloaded Supertonic models")
        logger.info(f"Models are available at: {assets_dir.absolute()}")

        # Verify essential files exist
        model_path = assets_dir / "onnx" / "tts.onnx"
        char_dict_path = (
            assets_dir
            / "resources"
            / "metadata"
            / "char_dict"
            / "opensource-en"
            / "char_dict.json"
        )

        if model_path.exists():
            logger.info(f"✓ Model file found: {model_path}")
        else:
            logger.warning(f"✗ Model file not found: {model_path}")
            logger.warning("You may need to pull Git LFS files manually")

        if char_dict_path.exists():
            logger.info(f"✓ Character dictionary found: {char_dict_path}")
        else:
            logger.warning(f"✗ Character dictionary not found: {char_dict_path}")

        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to download models: {e}")
        logger.error(f"Error output: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return False


def main():
    """Main entry point."""
    # Determine assets directory (default: server/assets)
    script_dir = Path(__file__).parent.parent
    assets_dir = script_dir / "assets"

    logger.info("Supertonic Model Download Script")
    logger.info("=" * 50)

    # Check Git LFS
    if not check_git_lfs():
        sys.exit(1)

    # Download models
    if download_models(assets_dir):
        logger.info("=" * 50)
        logger.info("Download completed successfully!")
        logger.info(f"Assets are available at: {assets_dir.absolute()}")
        sys.exit(0)
    else:
        logger.error("Download failed")
        sys.exit(1)


if __name__ == "__main__":
    main()

