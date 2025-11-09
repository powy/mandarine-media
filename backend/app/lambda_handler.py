"""
AWS Lambda handler for the KYOOL Media Platform API.

This module wraps the FastAPI application with Mangum to make it compatible
with AWS Lambda's event-driven architecture. Mangum translates between
AWS Lambda events (from API Gateway, ALB, etc.) and ASGI protocol.
"""

import json
import os
from mangum import Mangum
from app.main import app

# Create the Lambda handler
# lifespan="off" is recommended for Lambda to avoid startup/shutdown issues
# For custom domains: API_GATEWAY_BASE_PATH should be "" (empty)
# For direct API Gateway URL: API_GATEWAY_BASE_PATH should be "/production"
# Default to empty for custom domain usage
api_base_path = os.getenv("API_GATEWAY_BASE_PATH", "")
if api_base_path:
    handler = Mangum(app, lifespan="off", api_gateway_base_path=api_base_path)
else:
    handler = Mangum(app, lifespan="off")


def lambda_handler(event, context):
    """
    AWS Lambda entry point.

    Args:
        event: AWS Lambda event (from API Gateway, ALB, Function URL, etc.)
        context: AWS Lambda context object with runtime information

    Returns:
        Response formatted for API Gateway/ALB
    """
    # Debug logging to diagnose routing issues
    print(f"[DEBUG] Incoming event type: {event.get('version', 'unknown')}")
    print(f"[DEBUG] Raw path: {event.get('rawPath', 'N/A')}")
    print(f"[DEBUG] Request context stage: {event.get('requestContext', {}).get('stage', 'N/A')}")
    print(f"[DEBUG] HTTP method: {event.get('requestContext', {}).get('http', {}).get('method', 'N/A')}")

    # Invoke Mangum handler
    response = handler(event, context)

    # Debug the response
    print(f"[DEBUG] Response status: {response.get('statusCode', 'N/A')}")
    print(f"[DEBUG] Response body preview: {response.get('body', '')[:200]}")

    return response
