"""
Debug test for origin countries support in /from-text endpoint
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.country import Country
from app.core.security import create_access_token


class TestOriginCountriesDebug:
    """Debug origin countries processing step by step"""

    def test_origin_countries_support(self, client: TestClient, test_admin_user, db: Session):
        """Test origin countries array processing with detailed debugging"""

        # Create admin token
        access_token = create_access_token(subject=test_admin_user.email)
        headers = {"Authorization": f"Bearer {access_token}"}

        print("\n=== ORIGIN COUNTRIES DEBUG TEST ===")

        payload = {
            "episode_title": "Origin Countries Test Episode",
            "media_type": "video",
            "origin_country_names": ["South Korea", "Japan"],
            "available_country_names": ["USA", "Canada"]
        }

        print(f"Sending payload: {payload}")

        response = client.post(
            "/api/v1/media-descriptions/from-text",
            json=payload,
            headers=headers
        )

        print(f"Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"Error response: {response.json()}")
            assert False, f"Request failed with status {response.status_code}"

        data = response.json()
        print(f"Response origin_countries field: {data.get('origin_countries', 'NOT FOUND')}")
        print(f"Response available_countries field: {data.get('available_countries', 'NOT FOUND')}")

        # Check if countries were created in database
        countries_in_db = db.query(Country).all()
        print(f"Total countries in database after request: {len(countries_in_db)}")
        for country in countries_in_db:
            print(f"  - {country.name} (ID: {country.id})")

        # The key assertion
        assert response.status_code == 200
        assert "origin_countries" in data
        assert "available_countries" in data

        # Check origin countries
        origin_countries_list = data["origin_countries"]
        print(f"Final origin_countries list length: {len(origin_countries_list)}")

        if len(origin_countries_list) == 0:
            print("PROBLEM: Origin countries array is empty despite sending origin_country_names")
        else:
            print(f"SUCCESS: Origin countries array contains {len(origin_countries_list)} items")
            for country in origin_countries_list:
                print(f"  Origin Country: {country}")

        # Check available countries
        available_countries_list = data["available_countries"]
        print(f"Final available_countries list length: {len(available_countries_list)}")

        if len(available_countries_list) == 0:
            print("PROBLEM: Available countries array is empty despite sending available_country_names")
        else:
            print(f"SUCCESS: Available countries array contains {len(available_countries_list)} items")
            for country in available_countries_list:
                print(f"  Available Country: {country}")

        # Verify we got the expected countries
        assert len(origin_countries_list) == 2, f"Expected 2 origin countries, got {len(origin_countries_list)}"
        assert len(available_countries_list) == 2, f"Expected 2 available countries, got {len(available_countries_list)}"

        # Verify country names
        origin_country_names = [country["name"] for country in origin_countries_list]
        available_country_names = [country["name"] for country in available_countries_list]

        assert "South Korea" in origin_country_names
        assert "Japan" in origin_country_names
        assert "USA" in available_country_names
        assert "Canada" in available_country_names

        print("ORIGIN COUNTRIES TEST PASSED!")