#!/usr/bin/env python3
"""
Quick script to view Lambda logs
Usage: python view_logs.py
"""

import boto3
from datetime import datetime, timedelta
import sys

# Configuration
LOG_GROUP = "/aws/lambda/kyool-api-production"
REGION = "eu-west-3"
PROFILE = "kyool"

# Create session with kyool profile
session = boto3.Session(profile_name=PROFILE)
client = session.client('logs', region_name=REGION)

# Get logs from last 15 minutes
start_time = int((datetime.now() - timedelta(minutes=15)).timestamp() * 1000)

print(f"Fetching logs from {LOG_GROUP} (last 15 minutes)...")
print("=" * 80)

try:
    # First try filtering for [RESET] logs
    response = client.filter_log_events(
        logGroupName=LOG_GROUP,
        startTime=start_time,
        # Note: filterPattern for [RESET] might not work as expected
        # It will match any line containing the text RESET
    )

    reset_logs = []
    email_logs = []

    for event in response.get('events', []):
        timestamp = datetime.fromtimestamp(event['timestamp'] / 1000)
        message = event['message'].strip()

        # Filter for our specific log messages
        if '[RESET]' in message or '[EMAIL]' in message:
            if '[RESET]' in message:
                reset_logs.append((timestamp, message))
            if '[EMAIL]' in message:
                email_logs.append((timestamp, message))

    if reset_logs or email_logs:
        print("\n🔍 PASSWORD RESET LOGS:")
        for timestamp, message in reset_logs:
            print(f"[{timestamp.strftime('%H:%M:%S')}] {message}")

        if email_logs:
            print("\n📧 EMAIL LOGS:")
            for timestamp, message in email_logs:
                print(f"[{timestamp.strftime('%H:%M:%S')}] {message}")

        print("=" * 80)
        print(f"Found {len(reset_logs)} RESET logs and {len(email_logs)} EMAIL logs")
    else:
        print("❌ No [RESET] or [EMAIL] logs found in the last 15 minutes.")
        print("💡 Try triggering a password reset from www.kyool.eu first!")

except Exception as e:
    print(f"❌ Error fetching logs: {e}")
    sys.exit(1)
