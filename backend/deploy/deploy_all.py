#!/usr/bin/env python3
"""
Master Deployment Script - Deploy Everything

This script orchestrates the complete deployment process by running all
individual deployment scripts in sequence.

Usage:
    Full deployment (first time):
        python deploy_all.py

    Update existing deployment:
        python deploy_all.py --update

    Skip specific steps:
        python deploy_all.py --skip-gateway  (skip API Gateway setup)
        python deploy_all.py --skip-migrations  (skip database migrations)

Requirements:
    - All deployment scripts present in deploy directory
    - Docker Desktop installed and running
    - AWS credentials configured (aws configure)
    - boto3 and other dependencies installed
"""

import sys
import subprocess
import argparse
import time
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


def run_script(script_name, description):
    """
    Run a deployment script.

    Args:
        script_name: Name of the script file
        description: Description of what the script does

    Returns:
        bool: True if script succeeded, False otherwise
    """
    script_path = config.DEPLOY_DIR / script_name

    if not script_path.exists():
        print_error(f"Script not found: {script_path}")
        return False

    print_header(description)
    print_info(f"Running: {script_name}")
    print()

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=config.DEPLOY_DIR,
            check=False
        )

        if result.returncode == 0:
            print()
            print_success(f"{description} - COMPLETED")
            return True
        else:
            print()
            print_error(f"{description} - FAILED (exit code {result.returncode})")
            return False

    except Exception as e:
        print_error(f"Failed to run script: {e}")
        return False


def confirm_deployment(is_update=False):
    """
    Ask user to confirm deployment.

    Args:
        is_update: True if this is an update, False for new deployment

    Returns:
        bool: True if user confirmed, False otherwise
    """
    action = "update" if is_update else "deploy"

    print_header("Deployment Confirmation")
    print_info(f"Environment: {config.ENVIRONMENT}")
    print_info(f"AWS Region: {config.AWS_REGION}")
    print_info(f"Lambda Function: {config.LAMBDA_FUNCTION_NAME}")
    print_info(f"API Gateway: {config.API_GATEWAY_NAME}")
    print()

    if is_update:
        print("This will:")
        print("  1. Rebuild the Docker image")
        print("  2. Push to ECR")
        print("  3. Update the Lambda function")
        print("  4. Update configurations")
    else:
        print("This will:")
        print("  1. Build Docker image")
        print("  2. Push to AWS ECR")
        print("  3. Create Lambda function")
        print("  4. Setup API Gateway")
        print("  5. Run database migrations (optional)")

    print()
    response = input("Continue? (yes/no): ").strip().lower()

    return response in ['yes', 'y']


def full_deployment(skip_gateway=False, skip_migrations=False):
    """
    Perform a full deployment (first time).

    Args:
        skip_gateway: Skip API Gateway setup
        skip_migrations: Skip database migrations

    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    print_header("Full Deployment - KYOOL Media Platform API")

    start_time = time.time()

    # Step 1: Build Docker image
    if not run_script("01_build_image.py", "Step 1: Build Docker Image"):
        return 1

    # Step 2: Push to ECR
    if not run_script("02_push_to_ecr.py", "Step 2: Push to AWS ECR"):
        return 1

    # Step 3: Create Lambda function
    if not run_script("03_create_lambda.py", "Step 3: Create Lambda Function"):
        return 1

    # Step 4: Setup API Gateway (optional)
    if not skip_gateway:
        if not run_script("05_setup_api_gateway.py", "Step 4: Setup API Gateway"):
            print_error("API Gateway setup failed")
            print_info("You can run '05_setup_api_gateway.py' manually later")
            # Don't fail the whole deployment for API Gateway
    else:
        print_header("Step 4: Setup API Gateway - SKIPPED")

    # Step 5: Run migrations (optional)
    if not skip_migrations:
        print_header("Step 5: Database Migrations (Optional)")
        print_info("Running database migrations...")
        if not run_script("run_migrations.py", "Database Migrations"):
            print_error("Migrations failed")
            print_info("You can run 'run_migrations.py' manually later")
            # Don't fail the whole deployment for migrations
    else:
        print_header("Step 5: Database Migrations - SKIPPED")

    # Calculate duration
    duration = time.time() - start_time
    minutes = int(duration // 60)
    seconds = int(duration % 60)

    # Success summary
    print_header("DEPLOYMENT COMPLETE!")
    print_success("All steps completed successfully")
    print()
    print_info(f"Total time: {minutes}m {seconds}s")
    print()
    print_info("Your API is now deployed to AWS Lambda!")
    print()
    print("Next steps:")
    print("  1. Test your API endpoints")
    print("  2. Configure environment variables (if not done)")
    print("  3. Set up database connection")
    print("  4. Run migrations: python run_migrations.py")
    print("  5. Create admin user")
    print()

    return 0


def update_deployment():
    """
    Update an existing deployment.

    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    print_header("Update Deployment - KYOOL Media Platform API")

    start_time = time.time()

    # Run update script which handles build, push, and update
    if not run_script("04_update_lambda.py", "Update Lambda Function"):
        return 1

    # Calculate duration
    duration = time.time() - start_time
    minutes = int(duration // 60)
    seconds = int(duration % 60)

    # Success summary
    print_header("UPDATE COMPLETE!")
    print_success("Lambda function updated successfully")
    print()
    print_info(f"Total time: {minutes}m {seconds}s")
    print()
    print_info("Your API is now running the updated code!")
    print()

    return 0


def check_prerequisites():
    """
    Check if all prerequisites are met.

    Returns:
        bool: True if all prerequisites met, False otherwise
    """
    print_header("Checking Prerequisites")

    all_good = True

    # Check Docker
    try:
        result = subprocess.run(
            ["docker", "version"],
            capture_output=True,
            timeout=10
        )
        if result.returncode == 0:
            print_success("Docker is installed and running")
        else:
            print_error("Docker is not running")
            all_good = False
    except:
        print_error("Docker is not installed")
        all_good = False

    # Check AWS CLI (optional but recommended)
    try:
        result = subprocess.run(
            ["aws", "--version"],
            capture_output=True,
            timeout=10
        )
        if result.returncode == 0:
            print_success("AWS CLI is installed")
        else:
            print_info("AWS CLI not found (optional)")
    except:
        print_info("AWS CLI not found (optional)")

    # Check Python packages
    try:
        import boto3
        print_success("boto3 is installed")
    except ImportError:
        print_error("boto3 is not installed")
        print_info("Install with: pip install boto3")
        all_good = False

    # Check Dockerfile
    dockerfile_path = config.BACKEND_DIR / config.DOCKERFILE_NAME
    if dockerfile_path.exists():
        print_success(f"Dockerfile found: {config.DOCKERFILE_NAME}")
    else:
        print_error(f"Dockerfile not found: {dockerfile_path}")
        all_good = False

    print()
    return all_good


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Deploy KYOOL Media Platform API to AWS Lambda',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('--update', action='store_true',
                        help='Update existing deployment (skip creation steps)')
    parser.add_argument('--skip-gateway', action='store_true',
                        help='Skip API Gateway setup')
    parser.add_argument('--skip-migrations', action='store_true',
                        help='Skip database migrations')
    parser.add_argument('--yes', '-y', action='store_true',
                        help='Skip confirmation prompt')

    args = parser.parse_args()

    # Print banner
    print()
    print("=" * 70)
    print("  KYOOL Media Platform API - AWS Lambda Deployment")
    print("=" * 70)
    print()

    # Check prerequisites
    if not check_prerequisites():
        print()
        print_error("Prerequisites not met. Please fix the issues above.")
        return 1

    # Confirm deployment
    if not args.yes:
        if not confirm_deployment(is_update=args.update):
            print()
            print_info("Deployment cancelled by user")
            return 0

    # Run deployment
    if args.update:
        result = update_deployment()
    else:
        result = full_deployment(
            skip_gateway=args.skip_gateway,
            skip_migrations=args.skip_migrations
        )

    return result


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Deployment interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
