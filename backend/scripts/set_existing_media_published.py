#!/usr/bin/env python3
"""
Set all existing media descriptions to published status.
This script should be run after changing the default content_status from 'draft' to 'published'
to ensure all existing media descriptions are marked as published.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.media_description import MediaDescription

def set_all_media_to_published():
    """Set all existing media descriptions to published status."""
    db = SessionLocal()
    try:
        print("Setting all existing media descriptions to 'published' status...")

        # Get count of media descriptions that are not already published
        non_published = db.query(MediaDescription).filter(
            MediaDescription.content_status != "published"
        ).all()

        non_published_count = len(non_published)

        if non_published_count == 0:
            print("All media descriptions are already published. No changes needed.")
            return

        print(f"Found {non_published_count} media descriptions that are not published.")
        print("Status breakdown:")

        # Show breakdown by status
        status_counts = {}
        for media in non_published:
            status = media.content_status or "NULL"
            status_counts[status] = status_counts.get(status, 0) + 1

        for status, count in status_counts.items():
            print(f"  - {status}: {count}")

        # Update all non-published media to published
        updated_count = 0
        for media in non_published:
            media.content_status = "published"
            updated_count += 1

        db.commit()

        print(f"\nSuccessfully updated {updated_count} media descriptions to 'published' status!")

        # Verify the update
        total_count = db.query(MediaDescription).count()
        published_count = db.query(MediaDescription).filter(
            MediaDescription.content_status == "published"
        ).count()

        print(f"\nVerification:")
        print(f"  Total media descriptions: {total_count}")
        print(f"  Published: {published_count}")
        print(f"  Other: {total_count - published_count}")

    except Exception as e:
        print(f"Error setting media to published: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    set_all_media_to_published()
