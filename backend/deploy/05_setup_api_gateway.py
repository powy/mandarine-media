#!/usr/bin/env python3
"""
Step 5: Setup API Gateway

This script creates an AWS HTTP API Gateway and connects it to the Lambda function.
It configures routing, CORS, and provides a production-ready API endpoint.

Usage:
    python 05_setup_api_gateway.py

Requirements:
    - boto3 installed
    - AWS credentials configured
    - Lambda function created (run 03_create_lambda.py first)
"""

import sys
import json
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
        return None, None
    except Exception as e:
        print_error(f"Failed to verify AWS credentials: {e}")
        return None, None


def check_lambda_exists(lambda_client):
    """
    Check if Lambda function exists and get its ARN.

    Args:
        lambda_client: boto3 Lambda client

    Returns:
        str: Lambda ARN if exists, None otherwise
    """
    try:
        response = lambda_client.get_function(FunctionName=config.LAMBDA_FUNCTION_NAME)
        lambda_arn = response['Configuration']['FunctionArn']
        print_success(f"Lambda function found: {config.LAMBDA_FUNCTION_NAME}")
        print_info(f"Lambda ARN: {lambda_arn}")
        return lambda_arn

    except lambda_client.exceptions.ResourceNotFoundException:
        print_error(f"Lambda function not found: {config.LAMBDA_FUNCTION_NAME}")
        print_info("Run '03_create_lambda.py' first to create the function")
        return None
    except Exception as e:
        print_error(f"Failed to check Lambda function: {e}")
        return None


def create_http_api(apigw_client):
    """
    Create HTTP API Gateway.

    Args:
        apigw_client: boto3 API Gateway v2 client

    Returns:
        dict: API details if successful, None otherwise
    """
    api_name = config.API_GATEWAY_NAME

    try:
        # Check if API already exists
        response = apigw_client.get_apis()
        for api in response.get('Items', []):
            if api['Name'] == api_name:
                print_success(f"API Gateway already exists: {api_name}")
                print_info(f"API ID: {api['ApiId']}")
                print_info(f"API Endpoint: {api['ApiEndpoint']}")
                return api

        # API doesn't exist, create it
        print_info(f"Creating HTTP API: {api_name}")

        # Configure CORS
        cors_config = {
            'AllowOrigins': config.CORS_ALLOWED_ORIGINS,
            'AllowMethods': config.CORS_ALLOWED_METHODS,
            'AllowHeaders': config.CORS_ALLOWED_HEADERS,
            'MaxAge': 300,
            'AllowCredentials': True
        }

        response = apigw_client.create_api(
            Name=api_name,
            ProtocolType='HTTP',
            Description=f'KYOOL Media Platform API Gateway - {config.ENVIRONMENT}',
            CorsConfiguration=cors_config,
            Tags={
                'Project': 'kyool-media',
                'Environment': config.ENVIRONMENT,
                'ManagedBy': 'deployment-script'
            }
        )

        print_success(f"HTTP API created: {api_name}")
        print_info(f"API ID: {response['ApiId']}")
        print_info(f"API Endpoint: {response['ApiEndpoint']}")

        return response

    except ClientError as e:
        print_error(f"Failed to create HTTP API: {e}")
        return None
    except Exception as e:
        print_error(f"Failed to create HTTP API: {e}")
        return None


def create_lambda_integration(apigw_client, api_id, lambda_arn):
    """
    Create integration between API Gateway and Lambda.

    Args:
        apigw_client: boto3 API Gateway v2 client
        api_id: API Gateway ID
        lambda_arn: Lambda function ARN

    Returns:
        str: Integration ID if successful, None otherwise
    """
    try:
        print_info("Creating Lambda integration...")

        response = apigw_client.create_integration(
            ApiId=api_id,
            IntegrationType='AWS_PROXY',
            IntegrationUri=lambda_arn,
            IntegrationMethod='POST',
            PayloadFormatVersion='2.0',
            TimeoutInMillis=30000  # 30 seconds (match Lambda timeout)
        )

        integration_id = response['IntegrationId']
        print_success(f"Integration created: {integration_id}")

        return integration_id

    except ClientError as e:
        print_error(f"Failed to create integration: {e}")
        return None
    except Exception as e:
        print_error(f"Failed to create integration: {e}")
        return None


def create_routes(apigw_client, api_id, integration_id):
    """
    Create routes for the API Gateway.
    Creates a catch-all route that forwards all requests to Lambda.

    Args:
        apigw_client: boto3 API Gateway v2 client
        api_id: API Gateway ID
        integration_id: Integration ID

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print_info("Creating API routes...")

        # Create a catch-all route that forwards everything to Lambda
        # FastAPI will handle the routing internally
        routes = [
            {'RouteKey': '$default', 'Description': 'Default catch-all route'},
            {'RouteKey': 'ANY /{proxy+}', 'Description': 'Proxy all requests to Lambda'}
        ]

        for route in routes:
            try:
                response = apigw_client.create_route(
                    ApiId=api_id,
                    RouteKey=route['RouteKey'],
                    Target=f'integrations/{integration_id}'
                )
                print_success(f"Route created: {route['RouteKey']}")
            except ClientError as e:
                # Route might already exist, that's okay
                print_info(f"Route {route['RouteKey']} may already exist: {e}")

        return True

    except Exception as e:
        print_error(f"Failed to create routes: {e}")
        return False


def create_stage(apigw_client, api_id):
    """
    Create a stage for the API Gateway.

    Args:
        apigw_client: boto3 API Gateway v2 client
        api_id: API Gateway ID

    Returns:
        str: Stage URL if successful, None otherwise
    """
    try:
        stage_name = config.API_STAGE_NAME

        # Check if stage already exists
        try:
            response = apigw_client.get_stage(ApiId=api_id, StageName=stage_name)
            print_success(f"Stage already exists: {stage_name}")
            stage_url = f"https://{api_id}.execute-api.{config.AWS_REGION}.amazonaws.com/{stage_name}"
            print_info(f"Stage URL: {stage_url}")
            return stage_url
        except apigw_client.exceptions.NotFoundException:
            pass

        # Create stage with auto-deploy
        print_info(f"Creating stage: {stage_name}")

        response = apigw_client.create_stage(
            ApiId=api_id,
            StageName=stage_name,
            Description=f'{config.ENVIRONMENT.title()} stage',
            AutoDeploy=True,
            Tags={
                'Environment': config.ENVIRONMENT,
                'ManagedBy': 'deployment-script'
            }
        )

        print_success(f"Stage created: {stage_name}")

        # Construct stage URL
        stage_url = f"https://{api_id}.execute-api.{config.AWS_REGION}.amazonaws.com/{stage_name}"
        print_info(f"Stage URL: {stage_url}")

        return stage_url

    except ClientError as e:
        print_error(f"Failed to create stage: {e}")
        return None
    except Exception as e:
        print_error(f"Failed to create stage: {e}")
        return None


def grant_api_gateway_permission(lambda_client, lambda_arn, api_id, account_id):
    """
    Grant API Gateway permission to invoke Lambda.

    Args:
        lambda_client: boto3 Lambda client
        lambda_arn: Lambda function ARN
        api_id: API Gateway ID
        account_id: AWS account ID

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print_info("Granting API Gateway permission to invoke Lambda...")

        statement_id = f'apigateway-{config.ENVIRONMENT}-invoke'

        # Try to remove existing permission first (if any)
        try:
            lambda_client.remove_permission(
                FunctionName=config.LAMBDA_FUNCTION_NAME,
                StatementId=statement_id
            )
        except:
            pass

        # Add permission
        lambda_client.add_permission(
            FunctionName=config.LAMBDA_FUNCTION_NAME,
            StatementId=statement_id,
            Action='lambda:InvokeFunction',
            Principal='apigateway.amazonaws.com',
            SourceArn=f'arn:aws:execute-api:{config.AWS_REGION}:{account_id}:{api_id}/*'
        )

        print_success("Permission granted")
        return True

    except ClientError as e:
        print_error(f"Failed to grant permission: {e}")
        return False
    except Exception as e:
        print_error(f"Failed to grant permission: {e}")
        return False


def main():
    """Main execution function."""
    print_header("Setup AWS API Gateway")

    # Check AWS credentials
    print_header("Checking AWS Credentials")
    session, account_id = check_aws_credentials()
    if not session or not account_id:
        return 1

    # Initialize AWS clients
    lambda_client = session.client('lambda')
    apigw_client = session.client('apigatewayv2')

    # Check if Lambda function exists
    print_header("Checking Lambda Function")
    lambda_arn = check_lambda_exists(lambda_client)
    if not lambda_arn:
        return 1

    # Create HTTP API
    print_header("Creating HTTP API Gateway")
    api = create_http_api(apigw_client)
    if not api:
        return 1

    api_id = api['ApiId']
    api_endpoint = api['ApiEndpoint']

    # Create Lambda integration
    print_header("Creating Lambda Integration")
    integration_id = create_lambda_integration(apigw_client, api_id, lambda_arn)
    if not integration_id:
        return 1

    # Create routes
    print_header("Creating API Routes")
    if not create_routes(apigw_client, api_id, integration_id):
        return 1

    # Create stage
    print_header("Creating API Stage")
    stage_url = create_stage(apigw_client, api_id)
    if not stage_url:
        return 1

    # Grant permissions
    print_header("Granting Permissions")
    if not grant_api_gateway_permission(lambda_client, lambda_arn, api_id, account_id):
        return 1

    # Success
    print_header("API Gateway Setup Complete")
    print_success(f"API Name: {config.API_GATEWAY_NAME}")
    print_success(f"API ID: {api_id}")
    print_success(f"Stage: {config.API_STAGE_NAME}")
    print()
    print("=" * 70)
    print("  YOUR API IS LIVE!")
    print("=" * 70)
    print()
    print(f"  API Endpoint: {stage_url}")
    print()
    print("  Example requests:")
    print(f"    Docs:   {stage_url}/docs")
    print(f"    Health: {stage_url}/health")
    print(f"    API:    {stage_url}/api/v1/...")
    print()
    print("=" * 70)
    print()
    print_info("Next steps:")
    print_info("  1. Test your API endpoints")
    print_info("  2. Configure custom domain (optional)")
    print_info("  3. Set up CloudWatch monitoring")
    print_info("  4. Configure WAF for security (optional)")
    print()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Setup interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
