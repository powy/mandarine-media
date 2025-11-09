#!/usr/bin/env python3
"""
Step 2: Push Docker Image to AWS ECR

This script creates an ECR repository (if needed) and pushes the Docker
image to AWS Elastic Container Registry.

Usage:
    python 02_push_to_ecr.py

Requirements:
    - boto3 installed (pip install boto3)
    - AWS credentials configured (aws configure)
    - Docker image built (run 01_build_image.py first)
"""

import sys
import subprocess
import base64
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
        print_info(f"Account ID: {account_id}")
        print_info(f"Region: {config.AWS_REGION}")
        print_info(f"ARN: {identity['Arn']}")

        return session, account_id

    except NoCredentialsError:
        print_error("AWS credentials not found")
        print_info("Run 'aws configure' to set up credentials")
        return None, None
    except Exception as e:
        print_error(f"Failed to verify AWS credentials: {e}")
        return None, None


def check_docker_image():
    """
    Check if Docker image exists locally.

    Returns:
        bool: True if image exists, False otherwise
    """
    image_name = config.IMAGE_NAME

    try:
        result = subprocess.run(
            ["docker", "images", "-q", image_name],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=10
        )

        if result.returncode == 0 and result.stdout.strip():
            print_success(f"Found Docker image: {image_name}")
            return True
        else:
            print_error(f"Docker image not found: {image_name}")
            print_info("Run '01_build_image.py' first to build the image")
            return False

    except Exception as e:
        print_error(f"Failed to check Docker image: {e}")
        return False


def create_ecr_repository(ecr_client, repository_name):
    """
    Create ECR repository if it doesn't exist.

    Args:
        ecr_client: boto3 ECR client
        repository_name: Name of the repository

    Returns:
        dict: Repository details if successful, None otherwise
    """
    try:
        # Check if repository already exists
        response = ecr_client.describe_repositories(
            repositoryNames=[repository_name]
        )
        print_success(f"ECR repository already exists: {repository_name}")
        return response['repositories'][0]

    except ecr_client.exceptions.RepositoryNotFoundException:
        # Repository doesn't exist, create it
        print_info(f"Creating ECR repository: {repository_name}")

        try:
            response = ecr_client.create_repository(
                repositoryName=repository_name,
                imageScanningConfiguration={'scanOnPush': True},
                imageTagMutability='MUTABLE',
                tags=[
                    {'Key': 'Project', 'Value': 'kyool-media'},
                    {'Key': 'Environment', 'Value': config.ENVIRONMENT},
                    {'Key': 'ManagedBy', 'Value': 'deployment-script'}
                ]
            )
            print_success(f"ECR repository created: {repository_name}")
            return response['repository']

        except ClientError as e:
            print_error(f"Failed to create ECR repository: {e}")
            return None

    except ClientError as e:
        print_error(f"Failed to check ECR repository: {e}")
        return None


def authenticate_docker_to_ecr(ecr_client, account_id):
    """
    Authenticate Docker to ECR.

    Args:
        ecr_client: boto3 ECR client
        account_id: AWS account ID

    Returns:
        bool: True if authentication succeeded, False otherwise
    """
    try:
        print_info("Authenticating Docker to ECR...")

        # Get authorization token
        response = ecr_client.get_authorization_token()
        auth_data = response['authorizationData'][0]

        # Decode the token
        token = base64.b64decode(auth_data['authorizationToken']).decode('utf-8')
        username, password = token.split(':')
        registry_url = auth_data['proxyEndpoint']

        # Login to Docker registry
        result = subprocess.run(
            ["docker", "login", "--username", username, "--password-stdin", registry_url],
            input=password,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=30
        )

        if result.returncode == 0:
            print_success("Docker authenticated to ECR")
            return True
        else:
            print_error(f"Docker authentication failed: {result.stderr}")
            return False

    except Exception as e:
        print_error(f"Failed to authenticate Docker to ECR: {e}")
        return False


def tag_image(local_image, ecr_image):
    """
    Tag the local Docker image for ECR.

    Args:
        local_image: Local image name
        ecr_image: ECR image name (with full URI)

    Returns:
        bool: True if tagging succeeded, False otherwise
    """
    try:
        print_info(f"Tagging image for ECR...")
        print_info(f"  From: {local_image}")
        print_info(f"  To:   {ecr_image}")

        result = subprocess.run(
            ["docker", "tag", local_image, ecr_image],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=30
        )

        if result.returncode == 0:
            print_success("Image tagged successfully")
            return True
        else:
            print_error(f"Failed to tag image: {result.stderr}")
            return False

    except Exception as e:
        print_error(f"Failed to tag image: {e}")
        return False


def push_image(ecr_image):
    """
    Push the Docker image to ECR.

    Args:
        ecr_image: ECR image name (with full URI)

    Returns:
        bool: True if push succeeded, False otherwise
    """
    try:
        print_info(f"Pushing image to ECR: {ecr_image}")
        print_info("This may take several minutes...")
        print()

        # Push the image
        process = subprocess.Popen(
            ["docker", "push", ecr_image],
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
            print_success("Image pushed to ECR successfully")
            return True
        else:
            print()
            print_error(f"Failed to push image (exit code {process.returncode})")
            return False

    except Exception as e:
        print_error(f"Failed to push image: {e}")
        return False


def main():
    """Main execution function."""
    print_header("Push Docker Image to AWS ECR")

    # Check AWS credentials
    print_header("Checking AWS Credentials")
    session, account_id = check_aws_credentials()
    if not session or not account_id:
        return 1

    # Check Docker image
    print_header("Checking Docker Image")
    if not check_docker_image():
        return 1

    # Initialize ECR client
    ecr_client = session.client('ecr')

    # Create ECR repository
    print_header("Creating ECR Repository")
    repository = create_ecr_repository(ecr_client, config.ECR_REPOSITORY_NAME)
    if not repository:
        return 1

    repository_uri = repository['repositoryUri']
    print_info(f"Repository URI: {repository_uri}")

    # Authenticate Docker to ECR
    print_header("Authenticating Docker to ECR")
    if not authenticate_docker_to_ecr(ecr_client, account_id):
        return 1

    # Tag the image
    print_header("Tagging Image for ECR")
    local_image = config.IMAGE_NAME
    ecr_image = config.get_full_image_name(account_id, config.AWS_REGION)
    if not tag_image(local_image, ecr_image):
        return 1

    # Push the image
    print_header("Pushing Image to ECR")
    if not push_image(ecr_image):
        return 1

    # Success
    print_header("Push Complete")
    print_success("Docker image pushed to ECR successfully")
    print()
    print_info(f"Image URI: {ecr_image}")
    print()
    print_info("Next steps:")
    print_info("  1. Run: python 03_create_lambda.py")
    print_info("     (Create Lambda function from this image)")
    print()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Push interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
