#!/usr/bin/env python3
"""
Populate Minimal Local Data Script for Kyool Media Backend

This script populates minimal local data using the backend API:
- 15 Pictures (5 formats with different numbers)
- 1 Program with general description
- 1 Season linked to the program
- 3 Episodes (video media descriptions) linked to the season
- 2 Media Showcases (1 hero, 1 list)
- 1 Screen Description containing both showcases

Usage:
    python scripts/populate_minimal_data.py
    python scripts/populate_minimal_data.py --api-url http://localhost:8000

Dependencies:
    pip install requests
"""

import argparse
import sys
import requests
import json
import logging
from typing import Dict, List, Optional

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MinimalDataPopulator:
    """Populates minimal test data via API calls"""

    # Base URL for test pictures
    PICTURE_BASE_URL = "https://example-media.s3.eu-west-3.amazonaws.com/test-assets/sized_numbers/"

    # Picture format configurations
    PICTURE_FORMATS = [
        {"suffix": "1920_1080", "width": 1920, "height": 1080, "description": "Large landscape"},
        {"suffix": "1080_1080", "width": 1080, "height": 1080, "description": "Square"},
        {"suffix": "1920_720", "width": 1920, "height": 720, "description": "Cinema format"},
        {"suffix": "810_1080", "width": 810, "height": 1080, "description": "Portrait"},
        {"suffix": "1080_1920", "width": 1080, "height": 1920, "description": "Vertical mobile"},
    ]

    def __init__(self, api_base_url: str, admin_email: str = "admin@kyool.com", admin_password: str = "admin123"):
        self.api_base_url = api_base_url.rstrip('/')
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.access_token = None

        # Storage for created entity IDs
        self.picture_ids = {}  # number -> {format_suffix -> picture_id}
        self.program_media_desc_id = None
        self.program_id = None
        self.season_media_desc_id = None
        self.season_id = None
        self.episode_ids = []
        self.hero_showcase_id = None
        self.list_showcase_id = None
        self.screen_description_id = None

    def authenticate(self) -> bool:
        """Authenticate with the API and get access token"""
        logger.info(f"Authenticating with {self.api_base_url}...")
        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/auth/login",
                data={
                    "username": self.admin_email,
                    "password": self.admin_password
                }
            )
            if response.status_code == 200:
                self.access_token = response.json()["access_token"]
                logger.info("Successfully authenticated with API")
                return True
            else:
                logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False

    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def fetch_existing_pictures(self) -> Dict[str, str]:
        """Fetch all existing pictures in one API call and map URLs to IDs"""
        logger.info("Checking for existing pictures...")
        try:
            # Fetch all pictures matching our base URL pattern
            response = requests.get(
                f"{self.api_base_url}/api/v1/pictures",
                params={"limit": 100, "q": "sized_numbers"},
                headers=self.get_headers()
            )
            if response.status_code == 200:
                results = response.json()
                url_to_id = {}
                for picture in results.get("data", []):
                    url_to_id[picture["image_url"]] = picture["id"]
                logger.info(f"Found {len(url_to_id)} existing pictures")
                return url_to_id
        except Exception as e:
            logger.warning(f"Could not fetch existing pictures: {e}")
        return {}

    def create_pictures(self) -> bool:
        """Create 15 picture entities (numbers 00-14)"""
        logger.info("Step 1: Creating 15 picture entities...")

        # Pre-fetch existing pictures to avoid repeated searches
        existing_pictures = self.fetch_existing_pictures()

        for num in range(15):
            num_str = f"{num:02d}"
            self.picture_ids[num] = {}

            for fmt in self.PICTURE_FORMATS:
                image_url = f"{self.PICTURE_BASE_URL}black_{num_str}_{fmt['suffix']}.jpg"

                # Check if picture already exists
                if image_url in existing_pictures:
                    picture_id = existing_pictures[image_url]
                    self.picture_ids[num][fmt["suffix"]] = picture_id
                    logger.info(f"Reusing existing picture {num_str}_{fmt['suffix']}: {picture_id}")
                    continue

                # Create new picture
                picture_data = {
                    "image_url": image_url,
                    "width": fmt["width"],
                    "height": fmt["height"],
                    "alt_text": f"Test image {num_str} - {fmt['description']}",
                    "description": f"Test picture number {num} in {fmt['description']} format"
                }

                try:
                    response = requests.post(
                        f"{self.api_base_url}/api/v1/pictures",
                        json=picture_data,
                        headers=self.get_headers()
                    )

                    if response.status_code in [200, 201]:
                        picture = response.json()
                        picture_id = picture["id"]
                        self.picture_ids[num][fmt["suffix"]] = picture_id
                        logger.info(f"Created picture {num_str}_{fmt['suffix']}: {picture_id}")
                    elif response.status_code == 409:
                        # Shouldn't happen since we pre-checked, but handle it
                        logger.warning(f"Picture {num_str}_{fmt['suffix']} unexpectedly exists (409)")
                        return False
                    else:
                        logger.error(f"Failed to create picture {num_str}_{fmt['suffix']}: {response.status_code} - {response.text}")
                        return False

                except Exception as e:
                    logger.error(f"Error creating picture {num_str}_{fmt['suffix']}: {e}")
                    return False

        logger.info(f"Successfully created {len(self.picture_ids) * len(self.PICTURE_FORMATS)} pictures")
        return True

    def create_program_media_description(self) -> bool:
        """Create media description for the program"""
        logger.info("Step 2: Creating program media description...")

        media_desc_data = {
            "file_number": 9999,  # Will be auto-generated, this value is ignored
            "episode_title": "Korean Drama Collection",
            "media_type": "program",
            "content_status": "published",
            "synopsis_text": "A captivating anthology of contemporary Korean dramas exploring themes of love, family, and personal growth. Each season brings a fresh perspective on modern Korean society through compelling storytelling and unforgettable characters.",
            "descriptive_summary_text": "Contemporary Korean drama anthology series",
            "image_1920_1080_id": self.picture_ids[0]["1920_1080"],
            "image_1080_1080_id": self.picture_ids[1]["1080_1080"],
            "image_1920_720_id": self.picture_ids[2]["1920_720"],
            "image_810_1080_id": self.picture_ids[3]["810_1080"],
            "image_1080_1920_id": self.picture_ids[4]["1080_1920"],
            "production_year": 2024,
            "is_featured": True
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/media-descriptions",
                json=media_desc_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                media_desc = response.json()
                self.program_media_desc_id = media_desc["id"]
                logger.info(f"Created program media description: {self.program_media_desc_id}")
                return True
            else:
                logger.error(f"Failed to create program media description: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating program media description: {e}")
            return False

    def create_program(self) -> bool:
        """Create the program"""
        logger.info("Step 3: Creating program...")

        program_name = "Korean Drama Collection"

        # Check if program already exists
        try:
            search_response = requests.get(
                f"{self.api_base_url}/api/v1/programs",
                params={"q": program_name, "limit": 1},
                headers=self.get_headers()
            )
            if search_response.status_code == 200:
                search_results = search_response.json()
                if search_results.get("data") and len(search_results["data"]) > 0:
                    # Check for exact match
                    for prog in search_results["data"]:
                        if prog["program_name"] == program_name:
                            self.program_id = prog["id"]
                            logger.info(f"Reusing existing program: {self.program_id}")
                            return True
        except Exception as e:
            logger.warning(f"Could not search for existing program: {e}")

        program_data = {
            "program_name": program_name,
            "general_media_description_id": self.program_media_desc_id
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/programs",
                json=program_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                program = response.json()
                self.program_id = program["id"]
                logger.info(f"Created program: {self.program_id}")
                return True
            else:
                logger.error(f"Failed to create program: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating program: {e}")
            return False

    def create_season_media_description(self) -> bool:
        """Create media description for the season"""
        logger.info("Step 4: Creating season media description...")

        media_desc_data = {
            "file_number": 9999,  # Will be auto-generated, this value is ignored
            "episode_title": "Season 1: The Beginning",
            "media_type": "season",
            "content_status": "published",
            "program_id": self.program_id,
            "synopsis_text": "The inaugural season introduces viewers to the vibrant world of contemporary Seoul, following interconnected stories of ambition, romance, and self-discovery.",
            "descriptive_summary_text": "The beginning of an unforgettable journey",
            "image_1920_1080_id": self.picture_ids[5]["1920_1080"],
            "image_1080_1080_id": self.picture_ids[6]["1080_1080"],
            "image_1920_720_id": self.picture_ids[7]["1920_720"],
            "image_810_1080_id": self.picture_ids[8]["810_1080"],
            "image_1080_1920_id": self.picture_ids[9]["1080_1920"],
            "production_year": 2024,
            "is_featured": True
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/media-descriptions",
                json=media_desc_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                media_desc = response.json()
                self.season_media_desc_id = media_desc["id"]
                logger.info(f"Created season media description: {self.season_media_desc_id}")
                return True
            else:
                logger.error(f"Failed to create season media description: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating season media description: {e}")
            return False

    def create_season(self) -> bool:
        """Create the season"""
        logger.info("Step 5: Creating season...")

        season_number = 1
        season_name = "Season 1: The Beginning"

        # Check if season already exists for this program
        try:
            search_response = requests.get(
                f"{self.api_base_url}/api/v1/seasons",
                params={"program_id": self.program_id, "q": str(season_number), "limit": 10},
                headers=self.get_headers()
            )
            if search_response.status_code == 200:
                search_results = search_response.json()
                if search_results.get("data"):
                    # Check for exact match by season number and program_id
                    for s in search_results["data"]:
                        if s.get("season_number") == season_number and s.get("program_id") == self.program_id:
                            self.season_id = s["id"]
                            logger.info(f"Reusing existing season: {self.season_id}")
                            return True
        except Exception as e:
            logger.warning(f"Could not search for existing season: {e}")

        season_data = {
            "program_id": self.program_id,
            "season_number": season_number,
            "season_name": season_name,
            "general_media_description_id": self.season_media_desc_id
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/seasons",
                json=season_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                season = response.json()
                self.season_id = season["id"]
                logger.info(f"Created season: {self.season_id}")
                return True
            else:
                logger.error(f"Failed to create season: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating season: {e}")
            return False

    def create_episodes(self) -> bool:
        """Create 3 episode media descriptions"""
        logger.info("Step 6: Creating 3 episode media descriptions...")

        # Check for existing episodes for this season
        existing_episodes = {}
        try:
            search_response = requests.get(
                f"{self.api_base_url}/api/v1/media-descriptions",
                params={"season_id": self.season_id, "media_type": "video", "limit": 100},
                headers=self.get_headers()
            )
            if search_response.status_code == 200:
                search_results = search_response.json()
                for ep in search_results.get("data", []):
                    if ep.get("episode_number"):
                        existing_episodes[ep["episode_number"]] = ep["id"]
                if existing_episodes:
                    logger.info(f"Found {len(existing_episodes)} existing episodes for this season")
        except Exception as e:
            logger.warning(f"Could not search for existing episodes: {e}")

        episodes_data = [
            {
                "title": "First Steps",
                "synopsis": "A young professional moves to Seoul for a dream job, facing the challenges of a new city and unexpected romance.",
                "summary": "New beginnings in Seoul",
                "picture_num": 10
            },
            {
                "title": "Hidden Connections",
                "synopsis": "Past and present collide as characters discover surprising links that change everything they thought they knew.",
                "summary": "Uncovering the past",
                "picture_num": 11
            },
            {
                "title": "Turning Point",
                "synopsis": "Critical decisions must be made as relationships deepen and career paths diverge, testing loyalties and dreams.",
                "summary": "Life-changing choices",
                "picture_num": 12
            }
        ]

        for idx, episode_info in enumerate(episodes_data, start=1):
            # Check if episode already exists
            if idx in existing_episodes:
                episode_id = existing_episodes[idx]
                self.episode_ids.append(episode_id)
                logger.info(f"Reusing existing episode {idx}: {episode_id}")
                continue

            pic_num = episode_info["picture_num"]

            episode_data = {
                "file_number": 9999,  # Will be auto-generated, this value is ignored
                "episode_title": f"Episode {idx}: {episode_info['title']}",
                "media_type": "video",
                "content_status": "published",
                "program_id": self.program_id,
                "season_id": self.season_id,
                "episode_number": idx,
                "synopsis_text": episode_info["synopsis"],
                "descriptive_summary_text": episode_info["summary"],
                "image_1920_1080_id": self.picture_ids[pic_num]["1920_1080"],
                "image_1080_1080_id": self.picture_ids[pic_num]["1080_1080"],
                "image_1920_720_id": self.picture_ids[pic_num]["1920_720"],
                "image_810_1080_id": self.picture_ids[pic_num]["810_1080"],
                "image_1080_1920_id": self.picture_ids[pic_num]["1080_1920"],
                "production_year": 2024,
                "original_broadcast_date_utc": f"2024-01-{10+idx:02d}T00:00:00Z",
                "media_categories_list": ["drama"]
            }

            try:
                response = requests.post(
                    f"{self.api_base_url}/api/v1/media-descriptions",
                    json=episode_data,
                    headers=self.get_headers()
                )

                if response.status_code in [200, 201]:
                    episode = response.json()
                    episode_id = episode["id"]
                    self.episode_ids.append(episode_id)
                    logger.info(f"Created episode {idx}: {episode_id}")
                else:
                    logger.error(f"Failed to create episode {idx}: {response.status_code} - {response.text}")
                    return False

            except Exception as e:
                logger.error(f"Error creating episode {idx}: {e}")
                return False

        logger.info(f"Successfully created {len(self.episode_ids)} episodes")
        return True

    def create_hero_showcase(self) -> bool:
        """Create hero media showcase with program and season"""
        logger.info("Step 7: Creating hero media showcase...")

        showcase_title = "Featured Content"

        # Check if showcase already exists
        try:
            search_response = requests.get(
                f"{self.api_base_url}/api/v1/media-showcases",
                params={"q": showcase_title, "limit": 10},
                headers=self.get_headers()
            )
            if search_response.status_code == 200:
                search_results = search_response.json()
                if search_results.get("data"):
                    for showcase in search_results["data"]:
                        if showcase.get("title") == showcase_title:
                            self.hero_showcase_id = showcase["id"]
                            logger.info(f"Reusing existing hero showcase: {self.hero_showcase_id}")
                            return True
        except Exception as e:
            logger.warning(f"Could not search for existing showcase: {e}")

        showcase_data = {
            "title": showcase_title,
            "description": "Our top picks for you",
            "list_type": "hero",
            "thumbnail_format": "1920x1080",
            "percentage_width": 100,
            "percentage_height": 60,
            "is_active": True,
            "priority_in_screen": 1,
            "latest_first": False,
            "media_description_ids": [self.program_media_desc_id, self.season_media_desc_id]
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/media-showcases",
                json=showcase_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                showcase = response.json()
                self.hero_showcase_id = showcase["id"]
                logger.info(f"Created hero showcase: {self.hero_showcase_id}")
                return True
            else:
                logger.error(f"Failed to create hero showcase: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating hero showcase: {e}")
            return False

    def create_list_showcase(self) -> bool:
        """Create list media showcase with episodes"""
        logger.info("Step 8: Creating list media showcase...")

        showcase_title = "New Episodes"

        # Check if showcase already exists
        try:
            search_response = requests.get(
                f"{self.api_base_url}/api/v1/media-showcases",
                params={"q": showcase_title, "limit": 10},
                headers=self.get_headers()
            )
            if search_response.status_code == 200:
                search_results = search_response.json()
                if search_results.get("data"):
                    for showcase in search_results["data"]:
                        if showcase.get("title") == showcase_title:
                            self.list_showcase_id = showcase["id"]
                            logger.info(f"Reusing existing list showcase: {self.list_showcase_id}")
                            return True
        except Exception as e:
            logger.warning(f"Could not search for existing showcase: {e}")

        showcase_data = {
            "title": showcase_title,
            "description": "Latest episodes to watch",
            "list_type": "classic",
            "thumbnail_format": "1920x1080",
            "percentage_width": 100,
            "percentage_height": 30,
            "is_active": True,
            "priority_in_screen": 2,
            "latest_first": False,
            "media_description_ids": self.episode_ids
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/media-showcases",
                json=showcase_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                showcase = response.json()
                self.list_showcase_id = showcase["id"]
                logger.info(f"Created list showcase: {self.list_showcase_id}")
                return True
            else:
                logger.error(f"Failed to create list showcase: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating list showcase: {e}")
            return False

    def create_screen_description(self) -> bool:
        """Create screen description with both showcases"""
        logger.info("Step 9: Creating screen description...")

        screen_title = "Test Homepage"
        screen_type = "homepage"

        # Check if screen description already exists by type
        try:
            search_response = requests.get(
                f"{self.api_base_url}/api/v1/screen-descriptions",
                params={"screen_type": screen_type, "limit": 10},
                headers=self.get_headers()
            )
            if search_response.status_code == 200:
                search_results = search_response.json()
                if search_results.get("data"):
                    for screen in search_results["data"]:
                        if screen.get("title") == screen_title:
                            self.screen_description_id = screen["id"]
                            logger.info(f"Reusing existing screen description: {self.screen_description_id}")
                            return True
        except Exception as e:
            logger.warning(f"Could not search for existing screen description: {e}")

        screen_data = {
            "title": screen_title,
            "description": "Test homepage with sample content",
            "screen_type": screen_type,
            "is_active": True,
            "in_top_menu": True,
            "display_order": 1,
            "media_showcases": [self.hero_showcase_id, self.list_showcase_id]
        }

        try:
            response = requests.post(
                f"{self.api_base_url}/api/v1/screen-descriptions",
                json=screen_data,
                headers=self.get_headers()
            )

            if response.status_code in [200, 201]:
                screen = response.json()
                self.screen_description_id = screen["id"]
                logger.info(f"Created screen description: {self.screen_description_id}")
                return True
            else:
                logger.error(f"Failed to create screen description: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating screen description: {e}")
            return False

    def print_summary(self):
        """Print summary of all created entities"""
        logger.info("\n" + "="*80)
        logger.info("SUMMARY OF CREATED ENTITIES")
        logger.info("="*80)
        logger.info(f"API Base URL: {self.api_base_url}")
        logger.info(f"\nPictures: {len(self.picture_ids) * len(self.PICTURE_FORMATS)} created")
        logger.info(f"Program: {self.program_id}")
        logger.info(f"Program Media Description: {self.program_media_desc_id}")
        logger.info(f"Season: {self.season_id}")
        logger.info(f"Season Media Description: {self.season_media_desc_id}")
        logger.info(f"Episodes: {len(self.episode_ids)}")
        for idx, episode_id in enumerate(self.episode_ids, start=1):
            logger.info(f"  Episode {idx}: {episode_id}")
        logger.info(f"Hero Showcase: {self.hero_showcase_id}")
        logger.info(f"List Showcase: {self.list_showcase_id}")
        logger.info(f"Screen Description: {self.screen_description_id}")
        logger.info("="*80 + "\n")

    def populate(self) -> bool:
        """Main population process"""
        logger.info(f"Starting minimal data population to {self.api_base_url}")
        logger.info("="*80)

        # Authenticate
        if not self.authenticate():
            logger.error("Failed to authenticate. Exiting.")
            return False

        # Execute all steps in order
        steps = [
            self.create_pictures,
            self.create_program_media_description,
            self.create_program,
            self.create_season_media_description,
            self.create_season,
            self.create_episodes,
            self.create_hero_showcase,
            self.create_list_showcase,
            self.create_screen_description
        ]

        for step in steps:
            if not step():
                logger.error(f"Failed at step: {step.__name__}")
                return False

        # Print summary
        self.print_summary()
        logger.info("Minimal data population completed successfully!")
        return True


def main():
    parser = argparse.ArgumentParser(description="Populate minimal local data via API")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL of the API (default: http://localhost:8000)")
    parser.add_argument("--admin-email", default="admin@kyool.com", help="Admin email for authentication (default: admin@kyool.com)")
    parser.add_argument("--admin-password", default="admin123", help="Admin password for authentication (default: admin123)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Initialize populator
    populator = MinimalDataPopulator(
        api_base_url=args.api_url,
        admin_email=args.admin_email,
        admin_password=args.admin_password
    )

    # Run population
    success = populator.populate()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
