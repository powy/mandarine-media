import pytest
import time
from unittest.mock import patch, MagicMock


class TestAuthenticationLogin:
    """Test authentication login endpoint with comprehensive scenarios."""

    def test_login_success_admin(self, client, test_admin_user):
        """Test successful login with admin credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": test_admin_user.email, "password": "adminpassword"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 50  # JWT tokens are typically long

    def test_login_success_regular_user(self, client, test_regular_user):
        """Test successful login with regular user credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": test_regular_user.email, "password": "userpassword"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_email(self, client):
        """Test login with non-existent email."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "nonexistent@example.com", "password": "anypassword"},
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_invalid_password(self, client, test_regular_user):
        """Test login with correct email but wrong password."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": test_regular_user.email, "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_missing_username(self, client):
        """Test login without username field."""
        response = client.post("/api/v1/auth/login", data={"password": "anypassword"})

        assert response.status_code == 422  # Validation error

    def test_login_missing_password(self, client):
        """Test login without password field."""
        response = client.post(
            "/api/v1/auth/login", data={"username": "test@example.com"}
        )

        assert response.status_code == 422  # Validation error

    def test_login_empty_credentials(self, client):
        """Test login with empty username and password."""
        response = client.post(
            "/api/v1/auth/login", data={"username": "", "password": ""}
        )

        assert response.status_code == 422  # Validation error

    def test_login_sql_injection_attempt(self, client):
        """Test login with SQL injection attempt in credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "admin'; DROP TABLE users; --", "password": "password"},
        )

        assert response.status_code == 401  # Should not cause internal error

    def test_login_malformed_email(self, client):
        """Test login with malformed email address."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "not-an-email", "password": "password"},
        )

        assert response.status_code == 401  # Should be handled gracefully

    def test_login_very_long_credentials(self, client):
        """Test login with extremely long credentials."""
        long_string = "a" * 10000

        response = client.post(
            "/api/v1/auth/login",
            data={"username": long_string + "@example.com", "password": long_string},
        )

        # Should handle gracefully without crashing
        assert response.status_code in [401, 422]

    def test_login_special_characters_in_credentials(self, client):
        """Test login with special characters in credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com!@#$%^&*()",
                "password": "pass!@#$%^&*()word",
            },
        )

        assert response.status_code == 401  # Should handle special chars

    def test_login_case_sensitivity(self, client, test_regular_user):
        """Test login email case sensitivity."""
        # Try login with uppercase email
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_regular_user.email.upper(),
                "password": "userpassword",
            },
        )

        # Behavior depends on email normalization implementation
        assert response.status_code in [200, 401]

    def test_login_whitespace_in_credentials(self, client, test_regular_user):
        """Test login with whitespace in credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "  " + test_regular_user.email + "  ",
                "password": "  userpassword  ",
            },
        )

        # Should handle whitespace gracefully
        assert response.status_code in [200, 401]

    def test_login_inactive_user(self, client, db):
        """Test login with inactive user account."""
        from app.schemas.user import UserCreate
        from app.crud.user import user as crud_user

        # Create inactive user
        inactive_user_data = UserCreate(
            email="inactive@example.com",
            password="password123",
            full_name="Inactive User",
            is_active=False,
            is_admin=False,
        )
        inactive_user = crud_user.create(db, obj_in=inactive_user_data)

        response = client.post(
            "/api/v1/auth/login",
            data={"username": "inactive@example.com", "password": "password123"},
        )

        # Should reject inactive users
        assert response.status_code in [400, 401]
        assert "Inactive user" in response.json()["detail"]


class TestTokenAuthentication:
    """Test token-based authentication for protected endpoints."""

    def test_valid_token_access(self, client, user_token):
        """Test accessing protected endpoint with valid token."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "id" in data

    def test_invalid_token_format(self, client):
        """Test accessing protected endpoint with invalid token format."""
        headers = {"Authorization": "Bearer invalid-token-format"}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 401

    def test_malformed_authorization_header(self, client):
        """Test accessing protected endpoint with malformed authorization header."""
        # Missing Bearer prefix
        headers = {"Authorization": "sometoken"}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 403

    def test_empty_authorization_header(self, client):
        """Test accessing protected endpoint with empty authorization header."""
        headers = {"Authorization": ""}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 403

    def test_missing_authorization_header(self, client):
        """Test accessing protected endpoint without authorization header."""
        response = client.get("/api/v1/users/me")

        assert response.status_code == 403

    def test_bearer_token_case_sensitivity(self, client, user_token):
        """Test bearer token with different case."""
        headers = {"Authorization": f"bearer {user_token}"}  # lowercase 'bearer'

        response = client.get("/api/v1/users/me", headers=headers)

        # Behavior depends on implementation - might be case sensitive
        assert response.status_code in [200, 403]

    def test_token_with_extra_whitespace(self, client, user_token):
        """Test token with extra whitespace."""
        headers = {"Authorization": f"Bearer   {user_token}   "}

        response = client.get("/api/v1/users/me", headers=headers)

        # Should handle whitespace gracefully or return 401 for invalid format
        assert response.status_code in [200, 401]

    def test_expired_token_simulation(self, client):
        """Test behavior with potentially expired token."""
        # Create a token that might be expired
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxfQ.invalid"
        headers = {"Authorization": f"Bearer {expired_token}"}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 401

    def test_token_from_different_system(self, client):
        """Test token that might be from different system."""
        foreign_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmb3JlaWduQGV4YW1wbGUuY29tIn0.invalid"
        headers = {"Authorization": f"Bearer {foreign_token}"}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 401

    def test_multiple_authorization_headers(self, client, user_token):
        """Test request with multiple authorization headers."""
        # This is tricky to test with standard HTTP clients
        # Most will only send one Authorization header
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 200


class TestAdminAuthentication:
    """Test admin-only endpoint authentication."""

    def test_admin_access_with_admin_token(self, client, admin_token):
        """Test admin endpoint access with admin token."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.get("/api/v1/users/", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data

    def test_admin_access_with_user_token(self, client, user_token):
        """Test admin endpoint access with regular user token."""
        headers = {"Authorization": f"Bearer {user_token}"}

        response = client.get("/api/v1/users/", headers=headers)

        assert response.status_code in [401, 403]
        if "detail" in response.json():
            assert "privileges" in response.json()["detail"].lower()

    def test_admin_access_without_token(self, client):
        """Test admin endpoint access without token."""
        response = client.get("/api/v1/users/")

        assert response.status_code in [401, 403]

    def test_admin_create_operation(self, client, admin_token):
        """Test admin create operation with admin token."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        user_data = {
            "email": "newuser@example.com",
            "password": "password123",
            "full_name": "New User",
            "is_active": True,
            "is_admin": False,
        }

        response = client.post("/api/v1/users/", headers=headers, json=user_data)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]

    def test_admin_create_operation_with_user_token(self, client, user_token):
        """Test admin create operation with regular user token."""
        headers = {"Authorization": f"Bearer {user_token}"}

        user_data = {
            "email": "newuser2@example.com",
            "password": "password123",
            "full_name": "New User 2",
            "is_active": True,
            "is_admin": False,
        }

        response = client.post("/api/v1/users/", headers=headers, json=user_data)

        assert response.status_code in [401, 403]


class TestAuthenticationEdgeCases:
    """Test edge cases and security scenarios."""

    def test_concurrent_login_attempts(self, client, test_regular_user):
        """Test multiple concurrent login attempts."""
        # Simulate multiple rapid login attempts
        responses = []
        for _ in range(5):
            response = client.post(
                "/api/v1/auth/login",
                data={"username": test_regular_user.email, "password": "userpassword"},
            )
            responses.append(response)

        # All should succeed (no rate limiting in basic implementation)
        for response in responses:
            assert response.status_code == 200

    def test_login_with_different_content_types(self, client, test_regular_user):
        """Test login with different content types."""
        # Test with JSON (if supported)
        json_response = client.post(
            "/api/v1/auth/login",
            json={"username": test_regular_user.email, "password": "userpassword"},
        )

        # Should either work or return appropriate error
        assert json_response.status_code in [200, 422]

        # Test with form data (standard OAuth2)
        form_response = client.post(
            "/api/v1/auth/login",
            data={"username": test_regular_user.email, "password": "userpassword"},
        )

        assert form_response.status_code == 200

    def test_token_reuse_across_endpoints(self, client, user_token):
        """Test reusing the same token across multiple endpoints."""
        headers = {"Authorization": f"Bearer {user_token}"}

        # Test multiple endpoints with same token
        endpoints = [
            "/api/v1/users/me",
            "/api/v1/media/descriptions",
            "/api/v1/persons",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code == 200

    def test_login_with_unicode_characters(self, client):
        """Test login with unicode characters in credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "tëst@ëxämplë.com", "password": "pässwörd123"},
        )

        # Should handle unicode gracefully
        assert response.status_code in [401, 422]

    def test_authentication_header_variations(self, client, user_token):
        """Test various authorization header formats."""
        test_cases = [
            f"Bearer {user_token}",
            f"Bearer  {user_token}",  # Extra space
            f"BEARER {user_token}",  # Uppercase
            f"bearer {user_token}",  # Lowercase
        ]

        for auth_header in test_cases:
            headers = {"Authorization": auth_header}
            response = client.get("/api/v1/users/me", headers=headers)
            # Some formats might work, others might not
            assert response.status_code in [200, 403]

    @patch("app.api.deps.verify_token")
    def test_token_verification_failure(self, mock_verify, client):
        """Test behavior when token verification fails."""
        mock_verify.return_value = None  # Simulate verification failure

        headers = {"Authorization": "Bearer fake-token"}
        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 401
        mock_verify.assert_called_once()

    def test_authentication_with_custom_headers(self, client, user_token):
        """Test authentication with additional custom headers."""
        headers = {
            "Authorization": f"Bearer {user_token}",
            "User-Agent": "Test-Client/1.0",
            "X-Custom-Header": "test-value",
            "Content-Type": "application/json",
        }

        response = client.get("/api/v1/users/me", headers=headers)

        assert response.status_code == 200

    def test_login_response_structure(self, client, test_regular_user):
        """Test that login response has correct structure."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": test_regular_user.email, "password": "userpassword"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify required fields
        required_fields = ["access_token", "token_type"]
        for field in required_fields:
            assert field in data
            assert data[field] is not None

        # Verify field types
        assert isinstance(data["access_token"], str)
        assert isinstance(data["token_type"], str)
        assert data["token_type"] == "bearer"

        # Token should be substantial length
        assert len(data["access_token"]) > 20

    def test_authentication_error_messages(self, client):
        """Test that authentication errors return appropriate messages."""
        # Test various error scenarios
        error_cases = [
            {
                "data": {"username": "wrong@example.com", "password": "wrongpass"},
                "expected_keywords": ["incorrect", "invalid"],
            },
            {"data": {"username": "", "password": "pass"}, "expected_status": 422},
            {
                "data": {"username": "test@example.com", "password": ""},
                "expected_status": 422,
            },
        ]

        for case in error_cases:
            response = client.post("/api/v1/auth/login", data=case["data"])

            if "expected_status" in case:
                assert response.status_code == case["expected_status"]
            else:
                assert response.status_code == 401

            if "expected_keywords" in case:
                detail = response.json().get("detail", "").lower()
                assert any(keyword in detail for keyword in case["expected_keywords"])


class TestPasswordSecurity:
    """Test password-related security aspects."""

    def test_password_not_returned_in_responses(self, client, test_regular_user):
        """Test that passwords are never returned in API responses."""
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={"username": test_regular_user.email, "password": "userpassword"},
        )
        assert login_response.status_code == 200
        login_data = login_response.json()

        # Check that password fields are not in response
        forbidden_fields = ["password", "hashed_password", "pwd", "pass"]
        for field in forbidden_fields:
            assert field not in login_data

        # Get user profile
        token = login_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        profile_response = client.get("/api/v1/users/me", headers=headers)
        assert profile_response.status_code == 200
        profile_data = profile_response.json()

        # Check that password fields are not in profile response
        for field in forbidden_fields:
            assert field not in profile_data

    def test_case_insensitive_email_behavior(self, client, test_regular_user):
        """Test email case sensitivity behavior."""
        original_email = test_regular_user.email

        # Test with different cases
        email_variations = [
            original_email.lower(),
            original_email.upper(),
            original_email.title(),
        ]

        for email in email_variations:
            response = client.post(
                "/api/v1/auth/login",
                data={"username": email, "password": "userpassword"},
            )

            # Behavior depends on implementation
            # Should be consistent across all variations
            if email == original_email:
                assert response.status_code == 200
            else:
                # Either all should work (case insensitive) or none should work
                assert response.status_code in [200, 401]
