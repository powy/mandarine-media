import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_media_description_for_report():
    """Sample media description data for testing reports."""
    return {
        "file_number": 60001,
        "episode_title": "Report Test Episode",
        "media_type": "video",
        "expected_filename": "report_test_episode.mp4",
        "content_status": "draft"
    }


class TestDescriptionReportsList:
    """Test description reports list endpoint."""
    
    def test_list_description_reports_success(self, client, admin_token):
        """Test successful retrieval of description reports list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/description-reports", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
        assert "page" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "total" in data["pagination"]
        assert "total_pages" in data["pagination"]
    
    def test_list_description_reports_with_pagination(self, client, admin_token):
        """Test description reports list with pagination parameters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/description-reports",
            headers=headers,
            params={"skip": 0, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 5
    
    def test_list_description_reports_unauthorized(self, client):
        """Test reports list without authentication."""
        response = client.get("/api/v1/description-reports")
        assert response.status_code == 401
    
    def test_list_description_reports_non_admin(self, client, user_token):
        """Test reports list with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/description-reports", headers=headers)
        assert response.status_code == 403


class TestDescriptionReportRead:
    """Test description report individual read endpoint."""
    
    def test_read_description_report_not_found(self, client, admin_token):
        """Test reading non-existent description report."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/description-reports/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_read_description_report_invalid_uuid(self, client, admin_token):
        """Test reading with invalid UUID format."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/description-reports/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_description_report_unauthorized(self, client):
        """Test reading without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/description-reports/{fake_id}")
        assert response.status_code == 401
    
    def test_read_description_report_non_admin(self, client, user_token):
        """Test reading with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/description-reports/{fake_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestDescriptionReportsBatch:
    """Test description reports batch endpoint."""
    
    def test_read_reports_by_batch_empty(self, client, admin_token):
        """Test reading reports by non-existent batch ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_batch_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/description-reports/batch/{fake_batch_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_read_reports_by_batch_invalid_uuid(self, client, admin_token):
        """Test reading with invalid batch UUID format."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/description-reports/batch/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_reports_by_batch_unauthorized(self, client):
        """Test reading batch reports without authentication."""
        fake_batch_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/description-reports/batch/{fake_batch_id}")
        assert response.status_code == 401
    
    def test_read_reports_by_batch_non_admin(self, client, user_token):
        """Test reading batch reports with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_batch_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/description-reports/batch/{fake_batch_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestDescriptionReportsDescription:
    """Test description reports by description ID endpoint."""
    
    def test_read_reports_by_description_empty(self, client, admin_token):
        """Test reading reports by non-existent description ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_description_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/description-reports/description/{fake_description_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_read_reports_by_description_invalid_uuid(self, client, admin_token):
        """Test reading with invalid description UUID format."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            "/api/v1/description-reports/description/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_reports_by_description_unauthorized(self, client):
        """Test reading description reports without authentication."""
        fake_description_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/description-reports/description/{fake_description_id}")
        assert response.status_code == 401
    
    def test_read_reports_by_description_non_admin(self, client, user_token):
        """Test reading description reports with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_description_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/description-reports/description/{fake_description_id}",
            headers=headers
        )
        assert response.status_code == 403


class TestDescriptionReportsIntegration:
    """Test integration between bulk creation and report generation."""
    
    def test_bulk_creation_generates_reports(self, client, admin_token, sample_media_description_for_report):
        """Test that bulk creation generates proper reports."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create bulk descriptions
        bulk_data = {
            "descriptions": [
                sample_media_description_for_report,
                {
                    "file_number": 60002,
                    "episode_title": "Report Test Episode 2",
                    "media_type": "video",
                    "expected_filename": "report_test_episode_2.mp4",
                    "content_status": "draft"
                }
            ]
        }
        
        bulk_response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert bulk_response.status_code == 200
        bulk_data_response = bulk_response.json()
        batch_id = bulk_data_response["batch_id"]
        
        # Check that reports were created for this batch
        reports_response = client.get(
            f"/api/v1/description-reports/batch/{batch_id}",
            headers=headers
        )
        
        assert reports_response.status_code == 200
        reports = reports_response.json()
        assert len(reports) == 2
        
        # Verify report content
        for report in reports:
            assert "description_id" in report
            assert "title" in report
            assert "success_associated_file" in report
            assert "timestamp" in report
            assert report["batch_id"] == batch_id
    
    def test_reports_accessible_by_description_id(self, client, admin_token, sample_media_description_for_report):
        """Test that reports can be accessed by description ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create single description via bulk (to generate report)
        bulk_data = {"descriptions": [sample_media_description_for_report]}
        
        bulk_response = client.post(
            "/api/v1/media-descriptions/bulk",
            headers=headers,
            json=bulk_data
        )
        
        assert bulk_response.status_code == 200
        reports = bulk_response.json()["reports"]
        description_id = reports[0]["description_id"]
        
        # Get reports by description ID
        reports_response = client.get(
            f"/api/v1/description-reports/description/{description_id}",
            headers=headers
        )
        
        assert reports_response.status_code == 200
        description_reports = reports_response.json()
        assert len(description_reports) == 1
        assert description_reports[0]["description_id"] == description_id