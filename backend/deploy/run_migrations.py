#!/usr/bin/env python3
"""
Run Database Migrations

This script runs Alembic database migrations against the production database.
It can be run locally or as a separate Lambda invocation.

Usage:
    python run_migrations.py

    With specific database URL:
    python run_migrations.py --database-url postgresql://user:pass@host/db

Requirements:
    - alembic installed
    - Database connection configured
    - Migrations in alembic/versions directory
"""

import sys
import subprocess
import argparse
import os
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


def print_warning(message):
    """Print a warning message."""
    print(f"[WARNING] {message}")


def check_alembic():
    """
    Check if Alembic is installed and configured.

    Returns:
        bool: True if Alembic is ready, False otherwise
    """
    # Check if alembic is installed
    try:
        result = subprocess.run(
            ["alembic", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print_success(f"Alembic installed: {result.stdout.strip()}")
        else:
            print_error("Alembic command failed")
            return False
    except FileNotFoundError:
        print_error("Alembic is not installed")
        print_info("Install with: pip install alembic")
        return False
    except Exception as e:
        print_error(f"Failed to check Alembic: {e}")
        return False

    # Check if alembic.ini exists
    alembic_ini = config.BACKEND_DIR / "alembic.ini"
    if alembic_ini.exists():
        print_success(f"Found alembic.ini: {alembic_ini}")
    else:
        print_error(f"alembic.ini not found: {alembic_ini}")
        return False

    # Check if alembic directory exists
    alembic_dir = config.BACKEND_DIR / "alembic"
    if alembic_dir.exists():
        print_success(f"Found alembic directory: {alembic_dir}")
    else:
        print_error(f"alembic directory not found: {alembic_dir}")
        return False

    return True


def check_database_connection(database_url=None):
    """
    Check if database connection is configured.

    Args:
        database_url: Optional database URL override

    Returns:
        str: Database URL if configured, None otherwise
    """
    # Priority: command line > environment variable > .env file
    if database_url:
        print_success("Using database URL from command line")
        return database_url

    # Check environment variable
    db_url = os.getenv("DATABASE_URI")
    if db_url:
        print_success("Using DATABASE_URI from environment")
        # Don't print the full URL (may contain password)
        if "@" in db_url:
            host_part = db_url.split("@")[1] if "@" in db_url else "configured"
            print_info(f"Database host: {host_part}")
        return db_url

    # Check .env.production file
    env_file = config.ENV_PRODUCTION_FILE
    if env_file.exists():
        print_info(f"Found .env.production file: {env_file}")
        print_info("Database URL should be configured there")
        return "from_env_file"  # Will be loaded by the app
    else:
        print_warning("No .env.production file found")

    print_error("Database connection not configured")
    print_info("Set DATABASE_URI environment variable or create .env.production")
    return None


def get_current_revision():
    """
    Get the current database revision.

    Returns:
        str: Current revision or None if failed
    """
    try:
        result = subprocess.run(
            ["alembic", "current"],
            cwd=config.BACKEND_DIR,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            output = result.stdout.strip()
            if output:
                print_info(f"Current revision: {output}")
                return output
            else:
                print_info("No revision applied (empty database)")
                return "empty"
        else:
            print_warning(f"Could not get current revision: {result.stderr}")
            return None

    except Exception as e:
        print_warning(f"Could not get current revision: {e}")
        return None


def run_migrations(database_url=None, revision="head"):
    """
    Run Alembic migrations.

    Args:
        database_url: Optional database URL override
        revision: Target revision (default: "head")

    Returns:
        bool: True if migrations succeeded, False otherwise
    """
    try:
        print_info(f"Running migrations to: {revision}")
        print_info("This may take a few minutes...")
        print()

        # Set up environment
        env = os.environ.copy()
        if database_url and database_url != "from_env_file":
            env["DATABASE_URI"] = database_url

        # Run alembic upgrade
        result = subprocess.run(
            ["alembic", "upgrade", revision],
            cwd=config.BACKEND_DIR,
            env=env,
            check=False
        )

        if result.returncode == 0:
            print()
            print_success("Migrations completed successfully")
            return True
        else:
            print()
            print_error(f"Migrations failed (exit code {result.returncode})")
            return False

    except Exception as e:
        print_error(f"Failed to run migrations: {e}")
        return False


def show_migration_history():
    """Show migration history."""
    try:
        print_info("Migration history:")
        print()

        result = subprocess.run(
            ["alembic", "history", "--verbose"],
            cwd=config.BACKEND_DIR,
            check=False
        )

        print()
        return result.returncode == 0

    except Exception as e:
        print_error(f"Failed to show history: {e}")
        return False


def main():
    """Main execution function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument('--database-url', type=str,
                        help='Database URL (overrides environment variables)')
    parser.add_argument('--revision', type=str, default='head',
                        help='Target revision (default: head)')
    parser.add_argument('--show-history', action='store_true',
                        help='Show migration history and exit')
    parser.add_argument('--current', action='store_true',
                        help='Show current revision and exit')

    args = parser.parse_args()

    print_header("Database Migrations")

    # Check Alembic
    print_header("Checking Alembic")
    if not check_alembic():
        return 1

    # Show history if requested
    if args.show_history:
        print_header("Migration History")
        show_migration_history()
        return 0

    # Show current revision if requested
    if args.current:
        print_header("Current Revision")
        get_current_revision()
        return 0

    # Check database connection
    print_header("Checking Database Connection")
    database_url = check_database_connection(args.database_url)
    if not database_url:
        print()
        print_warning("Database not configured - migrations cannot run")
        print()
        print_info("To configure the database:")
        print_info("  1. Create .env.production file in backend directory")
        print_info("  2. Set DATABASE_URI=postgresql://user:pass@host:5432/dbname")
        print_info("  3. Run this script again")
        print()
        return 1

    # Get current revision
    print_header("Current Database State")
    current = get_current_revision()

    # Confirm migrations
    print()
    print_warning("This will run database migrations against the production database")
    print_warning("Make sure you have a backup before proceeding!")
    print()
    response = input("Continue? (yes/no): ").strip().lower()

    if response not in ['yes', 'y']:
        print()
        print_info("Migrations cancelled by user")
        return 0

    # Run migrations
    print_header("Running Migrations")
    if not run_migrations(database_url, args.revision):
        return 1

    # Show new revision
    print_header("Updated Database State")
    get_current_revision()

    # Success
    print_header("Migrations Complete")
    print_success("Database schema is up to date")
    print()
    print_info("Next steps:")
    print_info("  1. Create admin user (if needed)")
    print_info("  2. Test API endpoints")
    print_info("  3. Verify data integrity")
    print()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print_error("Migrations interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
