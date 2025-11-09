#!/usr/bin/env python3
"""
Step 3: Create AWS Lambda Function

This script creates the Lambda function from the container image in ECR,
sets up IAM roles, and configures all necessary settings.

Usage:
    python 03_create_lambda.py

Requirements:
    - boto3 installed
    - AWS credentials configured
    - ECR image pushed (run 02_push_to_ecr.py first)
"""

import sys
import json
import time
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


def print_warning(message):
    """Print a warning message."""
    print(f"[WARNING] {message}")


def attach_inline_policy(iam_client, role_name):
    """Attach custom inline policy to the Lambda IAM role."""
    policy_path = config.IAM_POLICY_TEMPLATE_PATH

    if not policy_path.exists():
        print_warning(f"IAM policy template not found at {policy_path}")
        return False

    try:
        policy_document = policy_path.read_text()
        policy_name = f"{role_name}-inline"
        iam_client.put_role_policy(
            RoleName=role_name,
            PolicyName=policy_name,
            PolicyDocument=policy_document
        )
        print_success("Inline IAM policy attached")
        return True
    except ClientError as e:
        print_error(f"Failed to attach inline IAM policy: {e}")
        return False
    except Exception as e:
        print_error(f"Unexpected error attaching inline policy: {e}")
        return False


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

        return session, account_id

    except NoCredentialsError:
        print_error("AWS credentials not found")
        print_info("Run 'aws configure' to set up credentials")
        return None, None
    except Exception as e:
        print_error(f"Failed to verify AWS credentials: {e}")
        return None, None


def check_ecr_image(ecr_client, account_id):
    """
    Check if the Docker image exists in ECR.

    Args:
        ecr_client: boto3 ECR client
        account_id: AWS account ID

    Returns:
        str: Image URI if found, None otherwise
    """
    try:
        response = ecr_client.describe_images(
            repositoryName=config.ECR_REPOSITORY_NAME,
            imageIds=[{'imageTag': config.IMAGE_TAG}]
        )

        if response['imageDetails']:
            image_uri = config.get_full_image_name(account_id, config.AWS_REGION)
            print_success(f"Found image in ECR: {image_uri}")
            return image_uri
        else:
            print_error(f"Image not found in ECR: {config.IMAGE_TAG}")
            return None

    except ecr_client.exceptions.RepositoryNotFoundException:
        print_error(f"ECR repository not found: {config.ECR_REPOSITORY_NAME}")
        print_info("Run '02_push_to_ecr.py' first to create repository and push image")
        return None
    except ecr_client.exceptions.ImageNotFoundException:
        print_error(f"Image not found in ECR repository")
        print_info("Run '02_push_to_ecr.py' to push the image")
        return None
    except Exception as e:
        print_error(f"Failed to check ECR image: {e}")
        return None


def create_lambda_role(iam_client):
    """
    Create IAM role for Lambda execution.

    Args:
        iam_client: boto3 IAM client

    Returns:
        str: Role ARN if successful, None otherwise
    """
    role_name = config.IAM_ROLE_NAME

    # Trust policy for Lambda
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }
        ]
    }

    try:
        # Check if role already exists
        response = iam_client.get_role(RoleName=role_name)
        role_arn = response['Role']['Arn']
        print_success(f"IAM role already exists: {role_name}")
        print_info(f"Role ARN: {role_arn}")
        attach_inline_policy(iam_client, role_name)
        return role_arn

    except iam_client.exceptions.NoSuchEntityException:
        # Role doesn't exist, create it
        print_info(f"Creating IAM role: {role_name}")

        try:
            response = iam_client.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description=f"Lambda execution role for {config.LAMBDA_FUNCTION_NAME}",
                Tags=[
                    {'Key': 'Project', 'Value': 'kyool-media'},
                    {'Key': 'Environment', 'Value': config.ENVIRONMENT},
                    {'Key': 'ManagedBy', 'Value': 'deployment-script'}
                ]
            )

            role_arn = response['Role']['Arn']
            print_success(f"IAM role created: {role_name}")
            print_info(f"Role ARN: {role_arn}")

            # Attach managed policies
            for policy_arn in config.MANAGED_POLICY_ARNS:
                print_info(f"Attaching policy: {policy_arn}")
                iam_client.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn=policy_arn
                )

            print_success("Managed policies attached")

            # Attach custom inline policy for application-specific access
            attach_inline_policy(iam_client, role_name)

            # Wait for role to be available
            print_info("Waiting for role to propagate (10 seconds)...")
            time.sleep(10)

            return role_arn

        except ClientError as e:
            print_error(f"Failed to create IAM role: {e}")
            return None

    except Exception as e:
        print_error(f"Failed to check IAM role: {e}")
        return None


def create_lambda_function(lambda_client, image_uri, role_arn):
    """
    Create Lambda function from container image.

    Args:
        lambda_client: boto3 Lambda client
        image_uri: ECR image URI
        role_arn: IAM role ARN

    Returns:
        dict: Lambda function details if successful, None otherwise
    """
    function_name = config.LAMBDA_FUNCTION_NAME

    try:
        # Check if function already exists
        response = lambda_client.get_function(FunctionName=function_name)
        print_warning(f"Lambda function already exists: {function_name}")
        print_info("To update the function, run '04_update_lambda.py'")
        return response['Configuration']

    except lambda_client.exceptions.ResourceNotFoundException:
        # Function doesn't exist, create it
        print_info(f"Creating Lambda function: {function_name}")

        try:
            # Build function configuration
            function_config = {
                'FunctionName': function_name,
                'Role': role_arn,
                'Code': {'ImageUri': image_uri},
                'PackageType': 'Image',
                'Timeout': config.LAMBDA_TIMEOUT,
                'MemorySize': config.LAMBDA_MEMORY_SIZE,
                'Architectures': [config.LAMBDA_ARCHITECTURE],
                'Environment': {
                    'Variables': config.LAMBDA_ENVIRONMENT_VARS
                },
                'Description': f'KYOOL Media Platform API - {config.ENVIRONMENT}',
                'Tags': {
                    'Project': 'kyool-media',
                    'Environment': config.ENVIRONMENT,
                    'ManagedBy': 'deployment-script'
                }
            }

            # Add VPC configuration if specified
            if config.LAMBDA_VPC_SUBNET_IDS and config.LAMBDA_VPC_SECURITY_GROUP_IDS:
                function_config['VpcConfig'] = {
                    'SubnetIds': config.LAMBDA_VPC_SUBNET_IDS,
                    'SecurityGroupIds': config.LAMBDA_VPC_SECURITY_GROUP_IDS
                }
                print_info("VPC configuration enabled")

            # Create the function
            response = lambda_client.create_function(**function_config)

            print_success(f"Lambda function created: {function_name}")
            print_info(f"Function ARN: {response['FunctionArn']}")
            print_info(f"Memory: {response['MemorySize']} MB")
            print_info(f"Timeout: {response['Timeout']} seconds")

            # Wait for function to be active
            print_info("Waiting for function to be active...")
            waiter = lambda_client.get_waiter('function_active_v2')
            waiter.wait(FunctionName=function_name)
            print_success("Function is active")

            return response

        except ClientError as e:
            print_error(f"Failed to create Lambda function: {e}")
            return None

    except Exception as e:
        print_error(f"Failed to check Lambda function: {e}")
        return None


def configure_function_url(lambda_client, function_name):
    """
    Create a Function URL for the Lambda (optional, for testing).

    Args:
        lambda_client: boto3 Lambda client
        function_name: Lambda function name

    Returns:
        str: Function URL if successful, None otherwise
    """
    try:
        # Check if function URL already exists
        response = lambda_client.get_function_url_config(FunctionName=function_name)
        function_url = response['FunctionUrl']
        print_success(f"Function URL already exists: {function_url}")
        return function_url

    except lambda_client.exceptions.ResourceNotFoundException:
        # Function URL doesn't exist, create it
        print_info("Creating Function URL...")

        try:
            response = lambda_client.create_function_url_config(
                FunctionName=function_name,
                AuthType='NONE',  # For testing only! Use AWS_IAM in production
                Cors={
                    'AllowOrigins': config.CORS_ALLOWED_ORIGINS,
                    'AllowMethods': config.CORS_ALLOWED_METHODS,
                    'AllowHeaders': config.CORS_ALLOWED_HEADERS,
                    'MaxAge': 300
                }
            )

            function_url = response['FunctionUrl']
            print_success(f"Function URL created: {function_url}")
            print_warning("Function URL has no authentication - for testing only!")

            # Add permission for public access
            lambda_client.add_permission(
                FunctionName=function_name,
                StatementId='FunctionURLAllowPublicAccess',
                Action='lambda:InvokeFunctionUrl',
                Principal='*',
                FunctionUrlAuthType='NONE'
            )

            return function_url

        except ClientError as e:
            print_error(f"Failed to create Function URL: {e}")
            return None

    except Exception as e:
        print_error(f"Failed to configure Function URL: {e}")
        return None


def main():
    """Main execution function."""
    print_header("Create AWS Lambda Function")

    # Check AWS credentials
    print_header("Checking AWS Credentials")
    session, account_id = check_aws_credentials()
    if not session or not account_id:
        return 1

    # Initialize AWS clients
    ecr_client = session.client('ecr')
    iam_client = session.client('iam')
    lambda_client = session.client('lambda')

    # Check ECR image
    print_header("Checking ECR Image")
    image_uri = check_ecr_image(ecr_client, account_id)
    if not image_uri:
        return 1

    # Create IAM role
    print_header("Creating IAM Role")
    role_arn = create_lambda_role(iam_client)
    if not role_arn:
        return 1

    # Create Lambda function
    print_header("Creating Lambda Function")
    function = create_lambda_function(lambda_client, image_uri, role_arn)
    if not function:
        return 1

    # Create Function URL (optional, for quick testing)
    print_header("Creating Function URL (Optional)")
    print_info("Creating a Function URL for quick testing...")
    print_warning("You should use API Gateway for production (run 05_setup_api_gateway.py)")
    function_url = configure_function_url(lambda_client, config.LAMBDA_FUNCTION_NAME)

    # Success
    print_header("Lambda Function Created Successfully")
    print_success(f"Function: {config.LAMBDA_FUNCTION_NAME}")
    print_success(f"ARN: {function['FunctionArn']}")
    if function_url:
        print_success(f"Test URL: {function_url}")
    print()
    print_info("Next steps:")
    print_info("  1. Run: python 05_setup_api_gateway.py")
    print_info("     (Set up API Gateway for production)")
    print_info("  2. Run: python run_migrations.py")
    print_info("     (Run database migrations)")
    print()
    print_warning("Remember to:")
    print_warning("  - Configure RDS database connection in environment variables")
    print_warning("  - Set up AWS Secrets Manager for sensitive credentials")
    print_warning("  - Configure VPC settings if using private RDS")
    print()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Creation interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
