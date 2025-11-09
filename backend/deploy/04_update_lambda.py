#!/usr/bin/env python3
"""
Step 4: Update Lambda Function

This script updates an existing Lambda function with a new container image.
It rebuilds the image, pushes to ECR, and updates the Lambda function code.

Usage:
    python 04_update_lambda.py

    Or to skip rebuild and just update Lambda:
    python 04_update_lambda.py --skip-build

Requirements:
    - boto3 installed
    - AWS credentials configured
    - Lambda function already created (run 03_create_lambda.py first)
"""

import sys
import subprocess
import argparse
import config
import boto3
from botocore.exceptions import ClientError, NoCredentialsError


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


def check_aws_credentials():
    """
    Check if AWS credentials are configured.

    Returns:
        tuple: (boto3 session, account_id) if successful, (None, None) otherwise
    """
    try:
        session = boto3.Session(region_name=config.AWS_REGION)
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        account_id = identity['Account']

        print_success("AWS credentials verified")
        return session, account_id

    except NoCredentialsError:
        print_error("AWS credentials not found")
        return None, None
    except Exception as e:
        print_error(f"Failed to verify AWS credentials: {e}")
        return None, None


def run_build_script():
    """
    Run the build script to rebuild the Docker image.

    Returns:
        bool: True if build succeeded, False otherwise
    """
    try:
        print_info("Running build script...")
        result = subprocess.run(
            [sys.executable, "01_build_image.py"],
            cwd=config.DEPLOY_DIR,
            check=False
        )

        if result.returncode == 0:
            print_success("Image built successfully")
            return True
        else:
            print_error("Build script failed")
            return False

    except Exception as e:
        print_error(f"Failed to run build script: {e}")
        return False


def run_push_script():
    """
    Run the push script to push the image to ECR.

    Returns:
        bool: True if push succeeded, False otherwise
    """
    try:
        print_info("Running push script...")
        result = subprocess.run(
            [sys.executable, "02_push_to_ecr.py"],
            cwd=config.DEPLOY_DIR,
            check=False
        )

        if result.returncode == 0:
            print_success("Image pushed successfully")
            return True
        else:
            print_error("Push script failed")
            return False

    except Exception as e:
        print_error(f"Failed to run push script: {e}")
        return False


def check_lambda_exists(lambda_client):
    """
    Check if Lambda function exists.

    Args:
        lambda_client: boto3 Lambda client

    Returns:
        dict: Function configuration if exists, None otherwise
    """
    try:
        response = lambda_client.get_function(FunctionName=config.LAMBDA_FUNCTION_NAME)
        print_success(f"Lambda function found: {config.LAMBDA_FUNCTION_NAME}")
        return response['Configuration']

    except lambda_client.exceptions.ResourceNotFoundException:
        print_error(f"Lambda function not found: {config.LAMBDA_FUNCTION_NAME}")
        print_info("Run '03_create_lambda.py' first to create the function")
        return None
    except Exception as e:
        print_error(f"Failed to check Lambda function: {e}")
        return None


def update_function_code(lambda_client, image_uri):
    """
    Update Lambda function with new container image.

    Args:
        lambda_client: boto3 Lambda client
        image_uri: New ECR image URI

    Returns:
        bool: True if update succeeded, False otherwise
    """
    try:
        print_info(f"Updating function code with image: {image_uri}")

        response = lambda_client.update_function_code(
            FunctionName=config.LAMBDA_FUNCTION_NAME,
            ImageUri=image_uri,
            Publish=True  # Create a new version
        )

        print_success("Function code updated")
        print_info(f"New version: {response['Version']}")
        print_info(f"Code SHA256: {response['CodeSha256'][:16]}...")

        # Wait for update to complete
        print_info("Waiting for update to complete...")
        waiter = lambda_client.get_waiter('function_updated_v2')
        waiter.wait(FunctionName=config.LAMBDA_FUNCTION_NAME)

        print_success("Update complete")
        return True

    except ClientError as e:
        print_error(f"Failed to update function code: {e}")
        return False
    except Exception as e:
        print_error(f"Failed to update function: {e}")
        return False


def update_function_configuration(lambda_client):
    """
    Update Lambda function configuration (optional).
    Updates memory, timeout, and environment variables.

    Args:
        lambda_client: boto3 Lambda client

    Returns:
        bool: True if update succeeded, False otherwise
    """
    try:
        print_info("Updating function configuration...")

        config_update = {
            'FunctionName': config.LAMBDA_FUNCTION_NAME,
            'Timeout': config.LAMBDA_TIMEOUT,
            'MemorySize': config.LAMBDA_MEMORY_SIZE,
            'Environment': {
                'Variables': config.LAMBDA_ENVIRONMENT_VARS
            }
        }

        response = lambda_client.update_function_configuration(**config_update)

        print_success("Configuration updated")
        print_info(f"Memory: {response['MemorySize']} MB")
        print_info(f"Timeout: {response['Timeout']} seconds")

        return True

    except ClientError as e:
        # Configuration update is optional, so just warn on failure
        print_info(f"Could not update configuration: {e}")
        return True  # Don't fail the whole update
    except Exception as e:
        print_info(f"Could not update configuration: {e}")
        return True


def get_function_url(lambda_client):
    """
    Get the Lambda Function URL if it exists.

    Args:
        lambda_client: boto3 Lambda client

    Returns:
        str: Function URL if exists, None otherwise
    """
    try:
        response = lambda_client.get_function_url_config(
            FunctionName=config.LAMBDA_FUNCTION_NAME
        )
        return response['FunctionUrl']
    except:
        return None


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Update Lambda function')
    parser.add_argument('--skip-build', action='store_true',
                        help='Skip rebuilding the image (use existing image in ECR)')
    args = parser.parse_args()

    print_header("Update AWS Lambda Function")

    # Check AWS credentials
    print_header("Checking AWS Credentials")
    session, account_id = check_aws_credentials()
    if not session or not account_id:
        return 1

    # Initialize Lambda client
    lambda_client = session.client('lambda')

    # Check if Lambda function exists
    print_header("Checking Lambda Function")
    function_config = check_lambda_exists(lambda_client)
    if not function_config:
        return 1

    current_image = function_config.get('CodeUri', 'Unknown')
    print_info(f"Current image: {current_image}")

    # Build and push new image (unless skipped)
    if not args.skip_build:
        print_header("Building New Image")
        if not run_build_script():
            return 1

        print_header("Pushing Image to ECR")
        if not run_push_script():
            return 1
    else:
        print_header("Skipping Image Build")
        print_info("Using existing image in ECR")

    # Get new image URI
    new_image_uri = config.get_full_image_name(account_id, config.AWS_REGION)

    # Update function code
    print_header("Updating Lambda Function Code")
    if not update_function_code(lambda_client, new_image_uri):
        return 1

    # Update function configuration
    print_header("Updating Lambda Configuration")
    update_function_configuration(lambda_client)

    # Get function URL if available
    function_url = get_function_url(lambda_client)

    # Success
    print_header("Update Complete")
    print_success(f"Lambda function updated: {config.LAMBDA_FUNCTION_NAME}")
    print_success(f"New image: {new_image_uri}")
    if function_url:
        print_success(f"Function URL: {function_url}")
    print()
    print_info("The Lambda function is now running the updated code")
    print()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Update interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
