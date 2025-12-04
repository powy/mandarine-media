#!/usr/bin/env python3
"""
CLI script to check environment variables on a KYOOL Media backend server.

Usage:
    python check_env_vars.py --email admin@example.com --password adminpass --server https://api.kyool.com

This script:
1. Authenticates with the server using admin credentials
2. Retrieves environment variables and runtime checks
3. Displays the results in a formatted manner
"""

import argparse
import requests
import json
import sys
from typing import Dict, Any


def login(server_url: str, email: str, password: str) -> str:
    """
    Authenticate with the server and get JWT token.

    Args:
        server_url: Base server URL (e.g., https://api.kyool.com)
        email: Admin user email
        password: Admin user password

    Returns:
        JWT access token

    Raises:
        SystemExit: If authentication fails
    """
    # Ensure server URL ends without trailing slash
    server_url = server_url.rstrip('/')

    login_url = f"{server_url}/api/v1/auth/login"

    try:
        print(f"Authenticating with {login_url}...")
        response = requests.post(
            login_url,
            data={"username": email, "password": password},  # OAuth2 form data
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            if not access_token:
                print("Error: No access_token in response")
                sys.exit(1)
            print("✓ Authentication successful\n")
            return access_token
        else:
            print(f"✗ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)

    except requests.exceptions.RequestException as e:
        print(f"✗ Network error during authentication: {e}")
        sys.exit(1)


def get_env_vars(server_url: str, access_token: str) -> Dict[str, Any]:
    """
    Retrieve environment variables from the server.

    Args:
        server_url: Base server URL
        access_token: JWT access token

    Returns:
        Dictionary with environment variables and runtime checks

    Raises:
        SystemExit: If request fails
    """
    # Ensure server URL ends without trailing slash
    server_url = server_url.rstrip('/')

    env_vars_url = f"{server_url}/api/v1/system/env-vars"

    try:
        print(f"Fetching environment variables from {env_vars_url}...")
        response = requests.get(
            env_vars_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            timeout=30  # Longer timeout for runtime checks
        )

        if response.status_code == 200:
            print("✓ Environment variables retrieved successfully\n")
            return response.json()
        elif response.status_code == 403:
            print("✗ Access denied: User does not have admin privileges")
            sys.exit(1)
        else:
            print(f"✗ Request failed: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)

    except requests.exceptions.RequestException as e:
        print(f"✗ Network error during env vars request: {e}")
        sys.exit(1)


def print_results(data: Dict[str, Any]) -> None:
    """
    Pretty-print the environment variables and runtime checks.

    Args:
        data: Dictionary with environment variables and runtime checks
    """
    print("=" * 80)
    print("ENVIRONMENT VARIABLES")
    print("=" * 80)

    env_vars = data.get("environment_variables", {})
    for key in sorted(env_vars.keys()):
        value = env_vars[key]
        print(f"{key:40} = {value}")

    print("\n" + "=" * 80)
    print("RUNTIME CHECKS")
    print("=" * 80)

    runtime_checks = data.get("runtime_checks", {})
    for service, check in runtime_checks.items():
        status = check.get("status", "unknown")
        message = check.get("message", "")

        # Color code status
        if status == "ok":
            status_display = "✓ OK"
        elif status == "error":
            status_display = "✗ ERROR"
        else:
            status_display = "⚠ NOT CONFIGURED"

        print(f"\n{service.upper()}:")
        print(f"  Status:  {status_display}")
        print(f"  Message: {message}")

    print("\n" + "=" * 80)
    print("SENSITIVE FIELDS EXCLUDED")
    print("=" * 80)

    excluded = data.get("sensitive_fields_excluded", [])
    if excluded:
        for field in excluded:
            print(f"  - {field}")
    else:
        print("  (none)")

    print("\n" + "=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Check environment variables on KYOOL Media backend server"
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Admin user email"
    )
    parser.add_argument(
        "--password",
        required=True,
        help="Admin user password"
    )
    parser.add_argument(
        "--server",
        required=True,
        help="Server base URL (e.g., https://api.kyool.com or http://localhost:8000)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON instead of formatted text"
    )

    args = parser.parse_args()

    # Authenticate
    access_token = login(args.server, args.email, args.password)

    # Get environment variables
    data = get_env_vars(args.server, access_token)

    # Display results
    if args.json:
        print(json.dumps(data, indent=2))
    else:
        print_results(data)


if __name__ == "__main__":
    main()
