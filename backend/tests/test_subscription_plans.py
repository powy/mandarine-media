import pytest
import uuid
from fastapi import status


@pytest.fixture
def sample_subscription_plan_data():
    """Sample subscription plan data for testing."""
    return {
        "name": "Premium Plan"
    }


@pytest.fixture
def sample_subscription_plan_update_data():
    """Sample subscription plan update data for testing."""
    return {
        "name": "Premium Plus"
    }


class TestSubscriptionPlansCRUD:
    """Test subscription plans CRUD operations."""
    
    def test_create_subscription_plan_success(self, client, admin_token, sample_subscription_plan_data):
        """Test successful subscription plan creation."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_subscription_plan_data["name"]
        assert "id" in data
        assert "creation_date_utc" in data

    def test_create_subscription_plan_duplicate_name(self, client, admin_token, sample_subscription_plan_data):
        """Test subscription plan creation with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first subscription plan
        client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        
        # Try to create duplicate
        response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_create_subscription_plan_requires_admin(self, client, user_token, sample_subscription_plan_data):
        """Test subscription plan creation requires admin access."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        
        assert response.status_code == 403

    def test_create_subscription_plan_requires_auth(self, client, sample_subscription_plan_data):
        """Test subscription plan creation requires authentication."""
        response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data)
        
        assert response.status_code == 401

    def test_list_subscription_plans_success(self, client, user_token):
        """Test successful retrieval of subscription plans list."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/subscription-plans", headers=headers)

        assert response.status_code == 200
        assert "data" in response.json()
        assert "pagination" in response.json()
        assert isinstance(response.json()["data"], list)

    def test_list_subscription_plans_requires_auth(self, client):
        """Test subscription plans list requires authentication."""
        response = client.get("/api/v1/subscription-plans")
        
        assert response.status_code == 401

    def test_get_subscription_plan_success(self, client, user_token, admin_token, sample_subscription_plan_data):
        """Test successful subscription plan retrieval."""
        # Create subscription plan first
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=admin_headers)
        created_plan = create_response.json()
        
        # Get the subscription plan
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get(f"/api/v1/subscription-plans/{created_plan['id']}", headers=user_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_plan["id"]
        assert data["name"] == sample_subscription_plan_data["name"]

    def test_get_subscription_plan_not_found(self, client, user_token):
        """Test subscription plan retrieval with invalid ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/v1/subscription-plans/{fake_id}", headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_subscription_plan_requires_auth(self, client):
        """Test subscription plan retrieval requires authentication."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/subscription-plans/{fake_id}")
        
        assert response.status_code == 401

    def test_update_subscription_plan_success(self, client, admin_token, sample_subscription_plan_data, sample_subscription_plan_update_data):
        """Test successful subscription plan update."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create subscription plan first
        create_response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        created_plan = create_response.json()
        
        # Update the subscription plan
        response = client.put(f"/api/v1/subscription-plans/{created_plan['id']}", json=sample_subscription_plan_update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_plan["id"]
        assert data["name"] == sample_subscription_plan_update_data["name"]

    def test_update_subscription_plan_not_found(self, client, admin_token, sample_subscription_plan_update_data):
        """Test subscription plan update with invalid ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.put(f"/api/v1/subscription-plans/{fake_id}", json=sample_subscription_plan_update_data, headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_update_subscription_plan_duplicate_name(self, client, admin_token, sample_subscription_plan_data):
        """Test subscription plan update with duplicate name fails."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create first subscription plan
        create_response1 = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        
        # Create second subscription plan
        second_data = {"name": "Basic Plan"}
        create_response2 = client.post("/api/v1/subscription-plans", json=second_data, headers=headers)
        plan2 = create_response2.json()
        
        # Try to update second to have same name as first
        response = client.put(f"/api/v1/subscription-plans/{plan2['id']}", json=sample_subscription_plan_data, headers=headers)
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_update_subscription_plan_requires_admin(self, client, user_token, admin_token, sample_subscription_plan_data, sample_subscription_plan_update_data):
        """Test subscription plan update requires admin access."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create subscription plan as admin
        create_response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=admin_headers)
        created_plan = create_response.json()
        
        # Try to update as user
        response = client.put(f"/api/v1/subscription-plans/{created_plan['id']}", json=sample_subscription_plan_update_data, headers=user_headers)
        
        assert response.status_code == 403

    def test_update_subscription_plan_requires_auth(self, client, sample_subscription_plan_update_data):
        """Test subscription plan update requires authentication."""
        fake_id = str(uuid.uuid4())
        response = client.put(f"/api/v1/subscription-plans/{fake_id}", json=sample_subscription_plan_update_data)
        
        assert response.status_code == 401

    def test_delete_subscription_plan_success(self, client, admin_token, sample_subscription_plan_data):
        """Test successful subscription plan deletion."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create subscription plan first
        create_response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=headers)
        created_plan = create_response.json()
        
        # Delete the subscription plan
        response = client.delete(f"/api/v1/subscription-plans/{created_plan['id']}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_plan["id"]
        
        # Verify it's deleted
        get_response = client.get(f"/api/v1/subscription-plans/{created_plan['id']}", headers=headers)
        assert get_response.status_code == 404

    def test_delete_subscription_plan_not_found(self, client, admin_token):
        """Test subscription plan deletion with invalid ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/v1/subscription-plans/{fake_id}", headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_delete_subscription_plan_requires_admin(self, client, user_token, admin_token, sample_subscription_plan_data):
        """Test subscription plan deletion requires admin access."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create subscription plan as admin
        create_response = client.post("/api/v1/subscription-plans", json=sample_subscription_plan_data, headers=admin_headers)
        created_plan = create_response.json()
        
        # Try to delete as user
        response = client.delete(f"/api/v1/subscription-plans/{created_plan['id']}", headers=user_headers)
        
        assert response.status_code == 403

    def test_delete_subscription_plan_requires_auth(self, client):
        """Test subscription plan deletion requires authentication."""
        fake_id = str(uuid.uuid4())
        response = client.delete(f"/api/v1/subscription-plans/{fake_id}")
        
        assert response.status_code == 401

    def test_subscription_plans_pagination(self, client, admin_token, user_token):
        """Test subscription plans list pagination."""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create multiple subscription plans
        for i in range(5):
            plan_data = {"name": f"Plan {i}"}
            client.post("/api/v1/subscription-plans", json=plan_data, headers=admin_headers)
        
        # Test pagination
        response = client.get("/api/v1/subscription-plans?skip=0&limit=2", headers=user_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2

        response = client.get("/api/v1/subscription-plans?skip=2&limit=3", headers=user_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 3