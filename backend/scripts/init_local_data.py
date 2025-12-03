#!/usr/bin/env python3
"""
Simple initialization script for local development.
Creates test data with episodes and video files using provided Mux asset.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.video_file import VideoFile
from app.models.media_description import MediaDescription
from app.models.program import Program
from app.models.season import Season
from app.models.screen_description import ScreenDescription
from app.models.media_showcase import MediaShowcase
from datetime import datetime, timezone
import uuid

# Mux asset details provided
MUX_ASSET_ID = "P97OlxSNra02Dlz003qHD59G7eRsY72EYWs01V7BVVue1A"
MUX_PLAYBACK_URL = "https://stream.mux.com/WTfMYY9hJC602RTzpjU5T8CzuGB8lxC00XJvpTvOul3I8.m3u8"
MUX_PLAYBACK_ID = "WTfMYY9hJC602RTzpjU5T8CzuGB8lxC00XJvpTvOul3I8"


def init_test_data(db: Session):
    """Initialize test data with video files and episodes"""

    print("Starting local data initialization...")

    # Check if our specific test program already exists
    existing_test_program = db.query(Program).filter(Program.program_name == "K-Drama Collection").first()
    if existing_test_program:
        print(f"Test program 'K-Drama Collection' already exists. Skipping initialization.")
        print(f"   Program ID: {existing_test_program.id}")
        return

    try:
        # Create a Program
        print("\n1. Creating Program...")
        program = Program(
            id=uuid.uuid4(),
            program_name="K-Drama Collection",
            creation_date_utc=datetime.now(timezone.utc)
        )
        db.add(program)
        db.flush()
        print(f"   Created program: {program.program_name} (ID: {program.id})")

        # Create a Season
        print("\n2. Creating Season...")
        season = Season(
            id=uuid.uuid4(),
            program_id=program.id,
            season_number=1,
            season_name="Season 1",
            creation_date_utc=datetime.now(timezone.utc)
        )
        db.add(season)
        db.flush()
        print(f"   Created season: {season.season_name} (ID: {season.id})")

        # Create 5 episodes with video files
        print("\n3. Creating Episodes and Video Files...")
        episodes = []
        video_files = []

        episode_titles = [
            "Episode 1: The Beginning",
            "Episode 2: New Challenges",
            "Episode 3: Hidden Secrets",
            "Episode 4: The Confrontation",
            "Episode 5: Resolution"
        ]

        for i, title in enumerate(episode_titles, start=1):
            # Create Video File
            video_file = VideoFile(
                id=uuid.uuid4(),
                creation_date_utc=datetime.now(timezone.utc),
                file_name=f"episode_{i}.mp4",
                mux_asset_id=MUX_ASSET_ID,
                mux_playback_id=MUX_PLAYBACK_ID,
                external_url=MUX_PLAYBACK_URL,
                encoding_status="completed",
                upload_status="upload_completed",
                duration_seconds=3600,  # 1 hour
                max_resolution_width=1920,
                max_resolution_height=1080,
                subtitle_tracks_text_list=["fr", "en"],
                diagnostics="pending"
            )
            db.add(video_file)
            db.flush()
            video_files.append(video_file)
            print(f"   Created video file: {video_file.file_name} (ID: {video_file.id})")

            # Create Media Description (Episode)
            episode = MediaDescription(
                id=uuid.uuid4(),
                file_number=1000 + i,
                episode_title=title,
                media_type="video",
                episode_number=i,
                program_id=program.id,
                season_id=season.id,
                main_video_file_id=video_file.id,
                descriptive_summary_text=f"This is episode {i} of our K-Drama collection. An exciting episode full of drama and emotion.",
                synopsis_text=f"In this episode, the story continues with new developments and unexpected twists.",
                content_status="published",
                production_year=2024,
                original_broadcast_date_utc=datetime(2024, 1, i, 20, 0, 0, tzinfo=timezone.utc),
                creation_date_utc=datetime.now(timezone.utc),
                diagnostics="pending"
            )
            db.add(episode)
            db.flush()
            episodes.append(episode)
            print(f"   Created episode: {episode.episode_title} (ID: {episode.id})")

        print(f"\n   Total: {len(video_files)} video files and {len(episodes)} episodes created")

        # Create Media Showcase
        print("\n4. Creating Media Showcase...")
        showcase = MediaShowcase(
            id=uuid.uuid4(),
            title="Latest Episodes",
            description="Check out our latest K-Drama episodes",
            list_type="carousel",
            thumbnail_format="1920x1080",
            percentage_width=100,
            percentage_height=40,
            is_active=True,
            priority_in_screen=1,
            creation_date_utc=datetime.now(timezone.utc)
        )
        db.add(showcase)
        db.flush()

        # Manually add episodes to showcase with unique priorities
        from sqlalchemy import text
        for i, episode in enumerate(episodes, start=1):
            db.execute(
                text("""
                    INSERT INTO media_showcase_media_descriptions
                    (media_showcase_id, media_description_id, priority_in_showcase, added_date_utc)
                    VALUES (:showcase_id, :episode_id, :priority, :added_date)
                """),
                {
                    "showcase_id": str(showcase.id),
                    "episode_id": str(episode.id),
                    "priority": i,
                    "added_date": datetime.now(timezone.utc)
                }
            )
        db.flush()
        print(f"   Created showcase: {showcase.title} (ID: {showcase.id})")

        # Create Screen Description (Home Page)
        print("\n5. Creating Screen Description...")
        screen = ScreenDescription(
            id=uuid.uuid4(),
            title="A la une",
            description="Home page with latest content",
            screen_type="homepage",
            is_active=True,
            display_order=1,
            in_top_menu=True,
            media_showcases=[str(showcase.id)],
            creation_date_utc=datetime.now(timezone.utc),
            last_updated_utc=datetime.now(timezone.utc)
        )
        db.add(screen)
        db.flush()
        print(f"   Created screen: {screen.title} (ID: {screen.id})")

        # Generate JSON caches
        print("\n6. Generating JSON caches...")

        # Update showcase JSON
        showcase.update_json(db)
        print(f"   Generated JSON for showcase: {showcase.title}")

        # Update screen JSON
        screen.update_json(db)
        print(f"   Generated JSON for screen: {screen.title}")

        # Commit all changes
        db.commit()
        print("\n[SUCCESS] Local data initialization completed successfully!")

        # Print summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Program: {program.program_name}")
        print(f"Season: {season.season_name} (Season {season.season_number})")
        print(f"Episodes: {len(episodes)}")
        print(f"Video Files: {len(video_files)}")
        print(f"Mux Asset ID: {MUX_ASSET_ID}")
        print(f"Mux Playback URL: {MUX_PLAYBACK_URL}")
        print(f"Media Showcase: {showcase.title}")
        print(f"Screen: {screen.title}")
        print("="*60)

    except Exception as e:
        print(f"\n[ERROR] Error during initialization: {str(e)}")
        db.rollback()
        raise


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_test_data(db)
    finally:
        db.close()
