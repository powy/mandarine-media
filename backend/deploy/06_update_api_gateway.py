#!/usr/bin/env python3
"""
Step 6: Update API Gateway CORS Configuration

This script updates the CORS configuration on an existing API Gateway
without recreating it. Use this when you've modified CORS settings in config.py.

Usage:
    python 06_update_api_gateway.py

Requirements:
    - boto3 installed
    - AWS credentials configured
    - API Gateway already created (run 05_setup_api_gateway.py first)
"""

import sys
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

        return session, account_id

    except NoCredentialsError:
        print_error("AWS credentials not found")
        print_info("Run 'aws configure' to set up credentials")
        return None, None
    except Exception as e:
        print_error(f"Failed to verify AWS credentials: {e}")
        return None, None


def find_api_gateway(apigw_client):
    """
    Find existing API Gateway by name.

    Args:
        apigw_client: boto3 API Gateway v2 client

    Returns:
        dict: API details if found, None otherwise
    """
    api_name = config.API_GATEWAY_NAME

    try:
        print_info(f"Finding API Gateway: {api_name}")

        response = apigw_client.get_apis()

        for api in response.get('Items', []):
            if api['Name'] == api_name:
                print_success(f"Found API Gateway: {api_name}")
                print_info(f"API ID: {api['ApiId']}")
                print_info(f"API Endpoint: {api['ApiEndpoint']}")
                return api

        print_error(f"API Gateway not found: {api_name}")
        print_info("Run '05_setup_api_gateway.py' first to create the API Gateway")
        return None

    except ClientError as e:
        print_error(f"Failed to find API Gateway: {e}")
        return None
    except Exception as e:
        print_error(f"Failed to find API Gateway: {e}")
        return None


def get_current_cors(apigw_client, api_id):
    """
    Get current CORS configuration.

    Args:
        apigw_client: boto3 API Gateway v2 client
        api_id: API Gateway ID

    Returns:
        dict: Current CORS configuration or None
    """
    try:
        response = apigw_client.get_api(ApiId=api_id)
        cors_config = response.get('CorsConfiguration', {})

        if cors_config:
            origins = cors_config.get('AllowOrigins', [])
            print_info(f"Current CORS origins: {len(origins)} configured")
            return cors_config
        else:
            print_info("No CORS configuration currently set")
            return None

    except Exception as e:
        print_error(f"Failed to get current CORS: {e}")
        return None


def update_cors_configuration(apigw_client, api_id):
    """
    Update CORS configuration on API Gateway.

    Args:
        apigw_client: boto3 API Gateway v2 client
        api_id: API Gateway ID

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print_info("Updating CORS configuration...")
        print_info(f"New CORS origins: {len(config.CORS_ALLOWED_ORIGINS)} configured")

        # Configure CORS
        cors_config = {
            'AllowOrigins': config.CORS_ALLOWED_ORIGINS,
            'AllowMethods': config.CORS_ALLOWED_METHODS,
            'AllowHeaders': config.CORS_ALLOWED_HEADERS,
            'MaxAge': 300,
            'AllowCredentials': True
        }

        response = apigw_client.update_api(
            ApiId=api_id,
            CorsConfiguration=cors_config
        )

        print_success("CORS configuration updated successfully")

        # Display updated configuration
        updated_origins = response.get('CorsConfiguration', {}).get('AllowOrigins', [])
        print_info(f"Updated CORS origins: {len(updated_origins)} configured")

        # Show sample of origins
        print()
        print_info("Sample of configured origins:")
        for origin in config.CORS_ALLOWED_ORIGINS[:5]:
            print(f"  - {origin}")
        if len(config.CORS_ALLOWED_ORIGINS) > 5:
            print(f"  ... and {len(config.CORS_ALLOWED_ORIGINS) - 5} more")
        print()

        return True

    except ClientError as e:
        print_error(f"Failed to update CORS configuration: {e}")
        return False
    except Exception as e:
        print_error(f"Failed to update CORS configuration: {e}")
        return False


def main():
    """Main execution function."""
    print_header("Update API Gateway CORS Configuration")

    # Check AWS credentials
    print_header("Checking AWS Credentials")
    session, account_id = check_aws_credentials()
    if not session or not account_id:
        return 1

    # Initialize API Gateway client
    apigw_client = session.client('apigatewayv2')

    # Find existing API Gateway
    print_header("Finding API Gateway")
    api = find_api_gateway(apigw_client)
    if not api:
        return 1

    api_id = api['ApiId']

    # Get current CORS configuration
    print_header("Current CORS Configuration")
    get_current_cors(apigw_client, api_id)

    # Update CORS configuration
    print_header("Updating CORS Configuration")
    if not update_cors_configuration(apigw_client, api_id):
        return 1

    # Success
    print_header("Update Complete")
    print_success("API Gateway CORS configuration updated successfully")
    print()
    print_info(f"API ID: {api_id}")
    print_info(f"API Endpoint: {api['ApiEndpoint']}")
    print()
    print_info("Changes are live immediately - no deployment needed")
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
