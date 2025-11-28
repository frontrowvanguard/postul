#!/usr/bin/env python3
"""
Script to download Supertonic ONNX models and assets from Hugging Face.

This script downloads the necessary model files and assets required for TTS.
Requires Git LFS to be installed and initialized.
"""
import subprocess
import sys
import shutil
import tempfile
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


def download_models(assets_dir: Path, force: bool = False) -> bool:
    """
    Download Supertonic models from Hugging Face.

    Args:
        assets_dir: Directory to download assets to
        force: If True, skip confirmation prompts (useful for Docker/CI)

    Returns:
        True if download successful, False otherwise
    """
    repo_url = "https://huggingface.co/Supertone/supertonic"
    assets_dir.mkdir(parents=True, exist_ok=True)

    # Check if assets directory already has content
    if any(assets_dir.iterdir()):
        logger.warning(f"Assets directory {assets_dir} is not empty")
        if not force:
            response = input("Do you want to continue and potentially overwrite files? (y/N): ")
            if response.lower() != "y":
                logger.info("Download cancelled")
                return False
        else:
            logger.info("Force mode enabled, proceeding with download")

    try:
        logger.info(f"Downloading Supertonic models from {repo_url}")
        logger.info(f"Target directory: {assets_dir.absolute()}")
        
        # If directory exists and has content, handle it based on force flag
        if assets_dir.exists() and any(assets_dir.iterdir()):
            if force:
                logger.info("Force mode: cleaning existing assets directory...")
                shutil.rmtree(assets_dir)
                assets_dir.mkdir(parents=True, exist_ok=True)
            else:
                logger.warning(f"Assets directory {assets_dir} already exists and is not empty")
                logger.warning("Use --force flag to overwrite, or remove the directory manually")
                return False
        else:
            # Ensure parent directory exists
            assets_dir.mkdir(parents=True, exist_ok=True)

        # Clone into a temporary directory first, then move contents
        # This avoids issues with git clone into existing directories
        temp_dir = Path(tempfile.mkdtemp(prefix="supertonic_download_"))
        try:
            logger.info(f"Cloning repository to temporary directory: {temp_dir}")
            
            # Clone the repository (shallow clone for faster download)
            clone_result = subprocess.run(
                ["git", "clone", "--depth", "1", repo_url, str(temp_dir)],
                check=True,
                capture_output=True,
                text=True,
            )
            
            if clone_result.returncode != 0:
                logger.error(f"Git clone failed: {clone_result.stderr}")
                return False
            
            logger.info("Repository cloned successfully")
            
            # Pull Git LFS files explicitly in the temp directory
            logger.info("Pulling Git LFS files...")
            try:
                subprocess.run(
                    ["git", "lfs", "pull"],
                    cwd=str(temp_dir),
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minute timeout
                )
                logger.info("Git LFS files pulled successfully")
            except subprocess.TimeoutExpired:
                logger.warning("Git LFS pull timed out, trying alternative method...")
                subprocess.run(
                    ["git", "lfs", "fetch", "--all"],
                    cwd=str(temp_dir),
                    check=False,
                    timeout=600,  # 10 minute timeout
                )
                subprocess.run(
                    ["git", "lfs", "checkout"],
                    cwd=str(temp_dir),
                    check=False,
                )
            except subprocess.CalledProcessError as e:
                logger.warning(f"Git LFS pull had issues: {e.stderr}")
                logger.warning("Attempting to fetch LFS files manually...")
                # Try alternative: fetch all LFS files
                subprocess.run(
                    ["git", "lfs", "fetch", "--all"],
                    cwd=str(temp_dir),
                    check=False,
                    timeout=600,
                )
                subprocess.run(
                    ["git", "lfs", "checkout"],
                    cwd=str(temp_dir),
                    check=False,
                )
            
            # Move contents from temp directory to target directory
            logger.info(f"Moving files to target directory: {assets_dir}")
            for item in temp_dir.iterdir():
                # Skip .git directory
                if item.name == ".git":
                    continue
                dest = assets_dir / item.name
                if dest.exists():
                    if dest.is_dir():
                        shutil.rmtree(dest)
                    else:
                        dest.unlink()
                shutil.move(str(item), str(dest))
            
        finally:
            # Clean up temporary directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
                logger.info("Cleaned up temporary directory")

        logger.info("Successfully downloaded Supertonic models")
        logger.info(f"Models are available at: {assets_dir.absolute()}")

        # Verify essential files exist
        required_paths = [
            ("onnx/duration_predictor.onnx", "Duration predictor model"),
            ("onnx/text_encoder.onnx", "Text encoder model"),
            ("onnx/vector_estimator.onnx", "Vector estimator model"),
            ("onnx/vocoder.onnx", "Vocoder model"),
            ("onnx/tts.json", "TTS configuration"),
            ("onnx/unicode_indexer.json", "Unicode indexer"),
        ]
        
        all_found = True
        for rel_path, description in required_paths:
            full_path = assets_dir / rel_path
            if full_path.exists():
                size = full_path.stat().st_size
                logger.info(f"✓ {description} found: {full_path} ({size:,} bytes)")
            else:
                logger.error(f"✗ {description} not found: {full_path}")
                all_found = False
        
        # Check for voice styles
        voice_styles_dir = assets_dir / "voice_styles"
        if voice_styles_dir.exists():
            style_files = list(voice_styles_dir.glob("*.json"))
            logger.info(f"✓ Found {len(style_files)} voice style file(s)")
        else:
            logger.warning("✗ Voice styles directory not found")

        if not all_found:
            logger.error("Some required files are missing. Git LFS files may not have been pulled correctly.")
            logger.error("Try running manually: git lfs pull")
            return False

        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to download models: {e}")
        logger.error(f"Command: {e.cmd}")
        logger.error(f"Error output: {e.stderr}")
        logger.error(f"Standard output: {e.stdout}")
        return False
    except FileNotFoundError as e:
        logger.error(f"File or directory not found: {e}")
        logger.error("This might indicate a path issue or missing dependencies")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return False


def main():
    """Main entry point."""
    # Check for force flag (useful for Docker/CI)
    force = "--force" in sys.argv or "-f" in sys.argv
    
    # Determine assets directory (default: server/assets)
    script_dir = Path(__file__).parent.parent
    assets_dir = script_dir / "assets"

    logger.info("Supertonic Model Download Script")
    logger.info("=" * 50)

    # Check Git LFS
    if not check_git_lfs():
        sys.exit(1)

    # Download models
    if download_models(assets_dir, force=force):
        logger.info("=" * 50)
        logger.info("Download completed successfully!")
        logger.info(f"Assets are available at: {assets_dir.absolute()}")
        sys.exit(0)
    else:
        logger.error("Download failed")
        sys.exit(1)


if __name__ == "__main__":
    main()

