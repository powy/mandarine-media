import pytest
import uuid
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from app.crud.video_file_report import video_file_report as crud_video_file_report
from app.models.video_file_report import VideoFileReport


@pytest.fixture
def sample_video_file_data():
    """Sample video file data for testing."""
    return {
        "file_url": "https://example.com/video/test.mp4",
        "file_name": "test_video.mp4",
        "file_size_bytes": 1024000,
        "encoding_status": "pending",
        "video_codec": "h264",
        "audio_codec": "aac",
        "file_format": "mp4",
        "duration_seconds": 3600,
        "resolution_width": 1920,
        "resolution_height": 1080,
        "bitrate_kbps": 5000,
        "frame_rate": 30.0
    }


@pytest.fixture
def sample_media_description_data():
    """Sample media description data for testing video linking."""
    import random
    return {
        "file_number": random.randint(10000, 99999),
        "episode_title": "Test Media for Video Reports",
        "media_type": "video",
        "file_name": "test_media.mp4",
        "episode_number": 1,
        "descriptive_summary_text": "Test media for video report testing",
        "content_status": "published"
    }


class TestVideoFileReportsList:
    """Test video file reports list endpoint."""
    
    def test_list_video_file_reports_success(self, client, user_token):
        """Test successful retrieval of video file reports list."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/v1/video-file-reports", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
        assert "skip" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "total" in data["pagination"]
        assert "has_next" in data["pagination"]
        assert "has_prev" in data["pagination"]
    
    def test_list_video_file_reports_with_pagination(self, client, user_token):
        """Test video file reports list with pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"skip": 5, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["skip"] == 5
        assert data["pagination"]["limit"] == 10
    
    def test_list_video_file_reports_with_event_filter(self, client, user_token):
        """Test video file reports list with event filter."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned reports should have the filtered event type
        for report in data["data"]:
            assert report["event"] == "possible_orphan"
    
    def test_list_video_file_reports_invalid_pagination(self, client, user_token):
        """Test video file reports list with invalid pagination parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Test negative skip
        response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"skip": -1}
        )
        assert response.status_code == 422
        
        # Test limit too high
        response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"limit": 1001}
        )
        assert response.status_code == 422
    
    def test_list_video_file_reports_unauthorized(self, client):
        """Test video file reports list without authentication."""
        response = client.get("/api/v1/video-file-reports")
        assert response.status_code == 401


class TestVideoFileReportRead:
    """Test video file report read endpoint."""
    
    def test_read_video_file_report_not_found(self, client, user_token):
        """Test reading non-existent video file report."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/video-file-reports/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_read_video_file_report_invalid_uuid(self, client, user_token):
        """Test reading with invalid UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-file-reports/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_read_video_file_report_unauthorized(self, client):
        """Test reading without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video-file-reports/{fake_id}")
        assert response.status_code == 401


class TestVideoFileReportsByVideoFile:
    """Test video file reports by video file endpoint."""
    
    def test_get_reports_by_video_file_not_found(self, client, user_token):
        """Test getting reports for non-existent video file."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_video_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/video-file-reports/video-file/{fake_video_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0  # Should return empty list for non-existent video file
    
    def test_get_reports_by_video_file_invalid_uuid(self, client, user_token):
        """Test getting reports with invalid video file UUID format."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get(
            "/api/v1/video-file-reports/video-file/invalid-uuid",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_get_reports_by_video_file_unauthorized(self, client):
        """Test getting reports without authentication."""
        fake_video_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video-file-reports/video-file/{fake_video_id}")
        assert response.status_code == 401


class TestVideoFileDelete:
    """Test video file deletion with orphan report creation."""
    
    def test_delete_video_file_creates_orphan_report(self, client, admin_token, sample_video_file_data, sample_media_description_data):
        """Test that deleting a video file creates an orphan report."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description first
        media_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_description_data
        )
        assert media_response.status_code == 200
        media_id = media_response.json()["id"]
        
        # Create video file 
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Link video file to media description
        link_response = client.post(
            f"/api/v1/video-files/{video_id}/link/{media_id}",
            headers=headers
        )
        assert link_response.status_code == 200
        
        # Get initial report count
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        initial_count = reports_response.json()["pagination"]["total"]
        
        # Delete the video file
        delete_response = client.delete(
            f"/api/v1/video-files/{video_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        
        # Check that an orphan report was created
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        final_count = reports_response.json()["pagination"]["total"]
        
        assert final_count == initial_count + 1
        
        # Verify the report contains correct information
        reports = reports_response.json()["data"]
        orphan_report = None
        for report in reports:
            if report["video_file_name"] == sample_video_file_data["file_name"]:
                orphan_report = report
                break
        
        assert orphan_report is not None
        assert orphan_report["event"] == "possible_orphan"
        assert orphan_report["media_description_title"] == sample_media_description_data["episode_title"]
        assert orphan_report["video_file_url"] == sample_video_file_data["file_url"]
    
    def test_delete_unlinked_video_file_creates_orphan_report(self, client, admin_token, sample_video_file_data):
        """Test that deleting an unlinked video file creates an orphan report."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file without linking to media
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Get initial report count
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        initial_count = reports_response.json()["pagination"]["total"]
        
        # Delete the video file
        delete_response = client.delete(
            f"/api/v1/video-files/{video_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        
        # Check that an orphan report was created
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        final_count = reports_response.json()["pagination"]["total"]
        
        assert final_count == initial_count + 1
        
        # Verify the report for unlinked file
        reports = reports_response.json()["data"]
        orphan_report = None
        for report in reports:
            if report["video_file_name"] == sample_video_file_data["file_name"]:
                orphan_report = report
                break
        
        assert orphan_report is not None
        assert orphan_report["event"] == "possible_orphan"
        assert orphan_report["media_description_title"] is None  # No linked media


class TestVideoFileDestroy:
    """Test video file destruction endpoint."""
    
    def test_destroy_video_file_success(self, client, admin_token, sample_video_file_data):
        """Test successful video file destruction."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file first
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Get initial report count for file_delete events
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "file_delete"}
        )
        initial_count = reports_response.json()["pagination"]["total"]
        
        # Destroy the video file
        destroy_response = client.post(
            f"/api/v1/video-files/{video_id}/destroy",
            headers=headers
        )
        
        assert destroy_response.status_code == 200
        data = destroy_response.json()
        assert data["video_file_id"] == video_id
        assert data["status"] == "destroyed"
        assert "message" in data
        
        # Check that a destruction report was created
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "file_delete"}
        )
        final_count = reports_response.json()["pagination"]["total"]
        
        assert final_count == initial_count + 1
        
        # Verify the destruction report
        reports = reports_response.json()["data"]
        destruction_report = None
        for report in reports:
            if report["video_file_name"] == sample_video_file_data["file_name"]:
                destruction_report = report
                break
        
        assert destruction_report is not None
        assert destruction_report["event"] == "file_delete"
        assert destruction_report["video_file_url"] == sample_video_file_data["file_url"]
    
    def test_destroy_video_file_not_found(self, client, admin_token):
        """Test destroying non-existent video file."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/video-files/{fake_id}/destroy",
            headers=headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_destroy_video_file_invalid_uuid(self, client, admin_token):
        """Test destroying with invalid UUID format."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post(
            "/api/v1/video-files/invalid-uuid/destroy",
            headers=headers
        )
        
        assert response.status_code == 422
    
    def test_destroy_video_file_unauthorized(self, client):
        """Test destruction without authentication."""
        fake_id = str(uuid.uuid4())
        response = client.post(f"/api/v1/video-files/{fake_id}/destroy")
        assert response.status_code == 401
    
    def test_destroy_video_file_non_admin(self, client, user_token):
        """Test destruction with non-admin user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/video-files/{fake_id}/destroy",
            headers=headers
        )
        assert response.status_code == 403


class TestVideoFileReportIntegration:
    """Test integration scenarios with video file reports."""
    
    def test_complete_video_lifecycle_with_reports(self, client, admin_token, sample_video_file_data, sample_media_description_data):
        """Test complete video file lifecycle: create, link, delete, destroy."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create media description
        media_response = client.post(
            "/api/v1/media-descriptions",
            headers=headers,
            json=sample_media_description_data
        )
        assert media_response.status_code == 200
        media_data = media_response.json()
        media_id = media_data["id"]
        
        # Create video file
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        video_id = video_response.json()["id"]
        
        # Link video to media
        link_response = client.post(
            f"/api/v1/video-files/{video_id}/link/{media_id}",
            headers=headers
        )
        assert link_response.status_code == 200
        
        # Delete video file (should create orphan report)
        delete_response = client.delete(
            f"/api/v1/video-files/{video_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        
        # Verify orphan report was created
        orphan_reports = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        orphan_count = orphan_reports.json()["pagination"]["total"]
        assert orphan_count >= 1
        
        # Note: We can't test destroy on deleted video file since it's already deleted
        # This would be handled by the actual file system cleanup process
    
    def test_video_file_reports_filtering_and_pagination(self, client, admin_token, user_token, sample_video_file_data):
        """Test comprehensive filtering and pagination of video file reports."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create and delete multiple video files to generate reports
        video_ids = []
        for i in range(3):
            video_data = sample_video_file_data.copy()
            video_data["file_name"] = f"test_video_{i}.mp4"
            
            video_response = client.post(
                "/api/v1/video-files",
                headers=headers,
                json=video_data
            )
            video_ids.append(video_response.json()["id"])
        
        # Delete them to create orphan reports
        for video_id in video_ids:
            client.delete(f"/api/v1/video-files/{video_id}", headers=headers)
        
        # Test pagination
        response = client.get(
            "/api/v1/video-file-reports",
            headers=user_headers,
            params={"skip": 0, "limit": 2}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 2
        assert data["pagination"]["limit"] == 2
        
        # Test event filtering
        response = client.get(
            "/api/v1/video-file-reports",
            headers=user_headers,
            params={"event": "possible_orphan"}
        )
        assert response.status_code == 200
        for report in response.json()["data"]:
            assert report["event"] == "possible_orphan"
    
    def test_video_file_reports_with_different_event_types(self, client, admin_token, sample_video_file_data):
        """Test that different operations create appropriate event types."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        video_id = video_response.json()["id"]
        
        # Get initial counts
        all_reports = client.get("/api/v1/video-file-reports", headers=headers)
        initial_total = all_reports.json()["pagination"]["total"]
        
        orphan_reports = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        initial_orphan_count = orphan_reports.json()["pagination"]["total"]
        
        destroy_reports = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "file_delete"}
        )
        initial_destroy_count = destroy_reports.json()["pagination"]["total"]
        
        # Delete video file (should create orphan report)
        delete_response = client.delete(f"/api/v1/video-files/{video_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Create another video file for destruction test
        video_response2 = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=sample_video_file_data
        )
        video_id2 = video_response2.json()["id"]
        
        # Destroy the second video file (should create destruction report)
        destroy_response = client.post(f"/api/v1/video-files/{video_id2}/destroy", headers=headers)
        assert destroy_response.status_code == 200
        
        # Verify report counts increased correctly
        final_orphan_reports = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        final_orphan_count = final_orphan_reports.json()["pagination"]["total"]
        
        final_destroy_reports = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "file_delete"}
        )
        final_destroy_count = final_destroy_reports.json()["pagination"]["total"]
        
        # Should have one more orphan report and one more destroy report
        assert final_orphan_count == initial_orphan_count + 1
        assert final_destroy_count == initial_destroy_count + 1


class TestVideoFileReportEdgeCases:
    """Test edge cases and error scenarios for video file reports."""
    
    def test_video_file_report_with_very_long_file_name(self, client, admin_token):
        """Test video file report creation with extremely long file name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file with very long name
        long_name = "a" * 500 + ".mp4"
        video_data = {
            "file_url": "https://example.com/video/long_name.mp4",
            "file_name": long_name,
            "file_size_bytes": 1024000,
            "encoding_status": "pending"
        }
        
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=video_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Delete to create report
        delete_response = client.delete(f"/api/v1/video-files/{video_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify report was created with truncated or handled long name
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        # Should not fail due to long file name
        assert reports_response.status_code == 200
    
    def test_video_file_report_with_unicode_characters(self, client, admin_token):
        """Test video file report creation with unicode characters in file name."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create video file with unicode characters
        unicode_name = "测试视频_тест_🎬_élève.mp4"
        video_data = {
            "file_url": "https://example.com/video/unicode.mp4",
            "file_name": unicode_name,
            "file_size_bytes": 1024000,
            "encoding_status": "pending"
        }
        
        video_response = client.post(
            "/api/v1/video-files",
            headers=headers,
            json=video_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Delete to create report
        delete_response = client.delete(f"/api/v1/video-files/{video_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify report was created with unicode name preserved
        reports_response = client.get(
            "/api/v1/video-file-reports",
            headers=headers,
            params={"event": "possible_orphan"}
        )
        assert reports_response.status_code == 200
        
        # Find the report with our unicode filename
        reports = reports_response.json()["data"]
        unicode_report = None
        for report in reports:
            if report["video_file_name"] == unicode_name:
                unicode_report = report
                break
        
        assert unicode_report is not None
        assert unicode_report["video_file_name"] == unicode_name
    
    def test_video_file_reports_concurrent_operations(self, client, admin_token, sample_video_file_data):
        """Test that concurrent video file operations create reports correctly."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create multiple video files
        video_ids = []
        for i in range(5):
            video_data = sample_video_file_data.copy()
            video_data["file_name"] = f"concurrent_test_{i}.mp4"
            
            video_response = client.post(
                "/api/v1/video-files",
                headers=headers,
                json=video_data
            )
            assert video_response.status_code == 200
            video_ids.append(video_response.json()["id"])
        
        # Get initial report count
        initial_reports = client.get("/api/v1/video-file-reports", headers=headers)
        initial_count = initial_reports.json()["pagination"]["total"]
        
        # Delete all video files (simulating concurrent operations)
        for video_id in video_ids:
            delete_response = client.delete(f"/api/v1/video-files/{video_id}", headers=headers)
            assert delete_response.status_code == 200
        
        # Verify all reports were created
        final_reports = client.get("/api/v1/video-file-reports", headers=headers)
        final_count = final_reports.json()["pagination"]["total"]
        
        # Should have 5 more reports
        assert final_count == initial_count + 5