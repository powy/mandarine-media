#!/usr/bin/env python3
"""
Step 1: Build Docker Image for AWS Lambda

This script builds a Docker image optimized for AWS Lambda deployment
using the Dockerfile.lambda configuration.

Usage:
    python 01_build_image.py

Requirements:
    - Docker Desktop installed and running
    - Dockerfile.lambda in backend directory
"""

import sys
import subprocess
from pathlib import Path
import config


def print_header(message):
    """Print a formatted header message."""
    print("\n" + "=" * 70)
    print(f"  {message}")
    print("=" * 70 + "\n")


def print_success(message):
    """Print a success message."""
    print(f"[OK] {message}")


def print_error(message):
    """Print an error message."""
    print(f"[ERROR] {message}", file=sys.stderr)


def print_info(message):
    """Print an info message."""
    print(f"[INFO] {message}")


def check_docker():
    """
    Check if Docker is installed and running.

    Returns:
        bool: True if Docker is available, False otherwise
    """
    try:
        result = subprocess.run(
            ["docker", "version"],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=10
        )
        if result.returncode == 0:
            print_success("Docker is installed and running")
            return True
        else:
            print_error("Docker is installed but not running")
            print_info("Please start Docker Desktop and try again")
            return False
    except FileNotFoundError:
        print_error("Docker is not installed")
        print_info("Please install Docker Desktop: https://www.docker.com/products/docker-desktop")
        return False
    except subprocess.TimeoutExpired:
        print_error("Docker command timed out - Docker may not be running")
        return False
    except Exception as e:
        print_error(f"Failed to check Docker: {e}")
        return False


def check_dockerfile():
    """
    Check if Dockerfile.lambda exists.

    Returns:
        bool: True if Dockerfile exists, False otherwise
    """
    dockerfile_path = config.BACKEND_DIR / config.DOCKERFILE_NAME
    if dockerfile_path.exists():
        print_success(f"Found Dockerfile: {dockerfile_path}")
        return True
    else:
        print_error(f"Dockerfile not found: {dockerfile_path}")
        print_info("Please ensure Dockerfile.lambda exists in the backend directory")
        return False


def get_docker_platform():
    """Return Docker platform string matching the Lambda architecture."""
    platform_map = {
        "x86_64": "linux/amd64",
        "arm64": "linux/arm64",
    }
    return platform_map.get(config.LAMBDA_ARCHITECTURE)


def build_image():
    """
    Build the Docker image for Lambda.

    Returns:
        bool: True if build succeeded, False otherwise
    """
    dockerfile_path = config.BACKEND_DIR / config.DOCKERFILE_NAME
    image_name = config.IMAGE_NAME

    print_info(f"Building image: {image_name}")
    print_info(f"Using Dockerfile: {dockerfile_path}")
    print_info(f"Build context: {config.BACKEND_DIR}")
    print_info("This may take several minutes...")
    print()

    try:
        # Build the Docker image
        cmd = [
            "docker", "build",
            "-t", image_name,
            "-f", str(dockerfile_path),
        ]

        platform = get_docker_platform()
        if platform:
            cmd.extend(["--platform", platform])
            print_info(f"Targeting Docker platform: {platform}")

        cmd.append(str(config.BACKEND_DIR))

        if config.VERBOSE:
            print_info(f"Command: {' '.join(cmd)}")
            print()

        # Run the build command with real-time output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1,
            universal_newlines=True
        )

        # Print output in real-time
        for line in process.stdout:
            print(line, end='')

        # Wait for process to complete
        process.wait()

        if process.returncode == 0:
            print()
            print_success(f"Image built successfully: {image_name}")
            return True
        else:
            print()
            print_error(f"Build failed with exit code {process.returncode}")
            return False

    except Exception as e:
        print_error(f"Failed to build image: {e}")
        return False


def verify_image():
    """
    Verify that the image was created and get its details.

    Returns:
        bool: True if image exists, False otherwise
    """
    image_name = config.IMAGE_NAME

    try:
        # Check if image exists
        result = subprocess.run(
            ["docker", "images", image_name, "--format", "{{.Repository}}:{{.Tag}}"],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=10
        )

        if result.returncode == 0 and result.stdout.strip():
            print_success("Image verified in local Docker registry")

            # Get image size
            size_result = subprocess.run(
                ["docker", "images", image_name, "--format", "{{.Size}}"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=10
            )
            if size_result.returncode == 0:
                print_info(f"Image size: {size_result.stdout.strip()}")

            return True
        else:
            print_error("Image not found in local Docker registry")
            return False

    except Exception as e:
        print_error(f"Failed to verify image: {e}")
        return False


def main():
    """Main execution function."""
    print_header("AWS Lambda Docker Image Build")

    # Print configuration
    print_info(f"Environment: {config.ENVIRONMENT}")
    print_info(f"Image name: {config.IMAGE_NAME}")
    print()

    # Check prerequisites
    print_header("Checking Prerequisites")
    if not check_docker():
        return 1
    if not check_dockerfile():
        return 1

    # Build the image
    print_header("Building Docker Image")
    if not build_image():
        return 1

    # Verify the image
    print_header("Verifying Image")
    if not verify_image():
        return 1

    # Success
    print_header("Build Complete")
    print_success("Docker image is ready for deployment")
    print()
    print_info("Next steps:")
    print_info("  1. Run: python 02_push_to_ecr.py")
    print_info("     (Push the image to AWS ECR)")
    print()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Build interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
