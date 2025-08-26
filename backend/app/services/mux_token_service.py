"""
MuxTokenService for generating JWT tokens for secure video playback and DRM.

This service generates JWT tokens required by Mux for:
1. Secure video playback with signed playback policies
2. DRM license requests for protected content

Environment variables required:
- MUX_SIGNING_KEY_ID: Key ID for JWT token signing
- MUX_PRIVATE_KEY: RSA private key for signing JWT tokens (base64 encoded or PEM format)
"""

from jose import jwt
import base64
import time
from typing import Optional, Dict, Any
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import settings


class MuxTokenService:
    """Service for generating MUX JWT tokens for secure video playback and DRM."""
    
    def __init__(self):
        """Initialize the service with signing key configuration."""
        self.key_id = settings.MUX_SIGNING_KEY_ID
        self.private_key_raw = settings.MUX_PRIVATE_KEY
        self.private_key = None
        
        # Only load the private key if both key_id and private_key_raw are available
        if self.key_id and self.private_key_raw:
            try:
                self.private_key = self._load_private_key()
            except Exception as e:
                print(f"Warning: Failed to load MUX private key: {e}")
        else:
            print("Warning: MUX signing keys not configured. MUX token generation will not be available.")
    
    def _load_private_key(self) -> rsa.RSAPrivateKey:
        """Load and parse the private key from configuration."""
        if not self.private_key_raw:
            raise ValueError("MUX_PRIVATE_KEY environment variable is required")
        
        # Try to decode base64 first
        try:
            if self.private_key_raw.startswith('-----BEGIN'):
                # Already in PEM format
                key_data = self.private_key_raw.encode('utf-8')
            else:
                # Assume base64 encoded
                key_data = base64.b64decode(self.private_key_raw)
            
            # Load the private key
            private_key = serialization.load_pem_private_key(
                key_data,
                password=None,
            )
            
            if not isinstance(private_key, rsa.RSAPrivateKey):
                raise ValueError("Private key must be an RSA key")
            
            return private_key
            
        except Exception as e:
            raise ValueError(f"Failed to load MUX private key: {str(e)}")
    
    def generate_playback_token(
        self, 
        playback_id: str, 
        expiration_minutes: int = 60, 
        audience: str = "v"
    ) -> str:
        """
        Generate JWT token for secure video playback.
        
        Args:
            playback_id: Mux Video Playback ID (subject)
            expiration_minutes: Token expiration in minutes (default: 60)
            audience: Audience type ("v" for video, "s" for storyboard)
        
        Returns:
            Signed JWT token string
        
        Raises:
            ValueError: If required configuration is missing
            Exception: If token generation fails
        """
        if not self.key_id or not self.private_key:
            raise ValueError("MUX signing keys are not properly configured")
        
        if not playback_id:
            raise ValueError("playback_id is required")
        
        # Calculate expiration timestamp
        exp_timestamp = int(time.time()) + (expiration_minutes * 60)
        
        # Create JWT payload
        payload = {
            "sub": playback_id,  # Subject: Playback ID
            "aud": audience,     # Audience: "v" for video, "s" for storyboard
            "exp": exp_timestamp,  # Expiration timestamp
            "kid": self.key_id   # Key ID
        }
        
        # Generate and sign the token
        try:
            # Convert private key to PEM format for jose
            private_key_pem = self.private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            token = jwt.encode(
                payload,
                private_key_pem,
                algorithm="RS256",
                headers={"kid": self.key_id}
            )
            return token
        except Exception as e:
            raise Exception(f"Failed to generate playback token: {str(e)}")
    
    def generate_drm_token(
        self, 
        playback_id: str, 
        expiration_minutes: int = 60, 
        key_id: Optional[str] = None
    ) -> str:
        """
        Generate JWT token for DRM license requests.
        
        Args:
            playback_id: Mux Video Playback ID (subject)
            expiration_minutes: Token expiration in minutes (default: 60)
            key_id: Optional DRM key ID for specific DRM keys
        
        Returns:
            Signed JWT token string for DRM
        
        Raises:
            ValueError: If required configuration is missing
            Exception: If token generation fails
        """
        if not self.key_id or not self.private_key:
            raise ValueError("MUX signing keys are not properly configured")
        
        if not playback_id:
            raise ValueError("playback_id is required")
        
        # Calculate expiration timestamp
        exp_timestamp = int(time.time()) + (expiration_minutes * 60)
        
        # Create JWT payload for DRM
        payload = {
            "sub": playback_id,    # Subject: Playback ID
            "aud": "d",            # Audience: "d" for DRM
            "exp": exp_timestamp,  # Expiration timestamp
            "kid": self.key_id     # Key ID
        }
        
        # Add optional DRM key ID
        if key_id:
            payload["key_id"] = key_id
        
        # Generate and sign the token
        try:
            # Convert private key to PEM format for jose
            private_key_pem = self.private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            token = jwt.encode(
                payload,
                private_key_pem,
                algorithm="RS256",
                headers={"kid": self.key_id}
            )
            return token
        except Exception as e:
            raise Exception(f"Failed to generate DRM token: {str(e)}")
    
    def generate_signed_playback_url(
        self, 
        playback_id: str, 
        expiration_minutes: int = 60,
        format_type: str = "m3u8"
    ) -> str:
        """
        Generate a complete signed playback URL with embedded JWT token.
        
        Args:
            playback_id: Mux Video Playback ID
            expiration_minutes: Token expiration in minutes (default: 60)
            format_type: Video format ("m3u8" for HLS, "mp4" for MP4)
        
        Returns:
            Complete signed playback URL
        """
        # Generate the playback token
        token = self.generate_playback_token(playback_id, expiration_minutes)
        
        # Construct the signed URL
        base_url = f"https://stream.mux.com/{playback_id}.{format_type}"
        signed_url = f"{base_url}?token={token}"
        
        return signed_url
    
    def validate_token_payload(self, token: str) -> Dict[str, Any]:
        """
        Validate and decode a JWT token (for testing/debugging purposes).
        
        Args:
            token: JWT token string
        
        Returns:
            Decoded token payload
        
        Raises:
            Exception: If token is invalid or expired
        """
        try:
            # Get the public key from private key
            public_key = self.private_key.public_key()
            public_key_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Decode and validate the token
            payload = jwt.decode(
                token,
                public_key_pem,
                algorithms=["RS256"],
                options={"verify_signature": True}
            )
            
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.JWTError as e:
            raise Exception(f"Invalid token: {str(e)}")
    
    def get_token_info(self, token: str) -> Dict[str, Any]:
        """
        Get information about a token without validating signature.
        
        Args:
            token: JWT token string
        
        Returns:
            Dictionary with token information
        """
        try:
            # Decode without verification to get info
            payload = jwt.decode(token, options={"verify_signature": False})
            headers = jwt.get_unverified_header(token)
            
            # Calculate time until expiration
            exp_timestamp = payload.get('exp', 0)
            current_timestamp = int(time.time())
            seconds_until_expiration = exp_timestamp - current_timestamp
            
            return {
                "payload": payload,
                "headers": headers,
                "is_expired": seconds_until_expiration <= 0,
                "seconds_until_expiration": seconds_until_expiration,
                "expires_at": exp_timestamp,
                "playback_id": payload.get('sub'),
                "audience": payload.get('aud'),
                "key_id": payload.get('kid')
            }
        except Exception as e:
            return {
                "error": f"Failed to decode token: {str(e)}",
                "is_valid": False
            }


# Global instance for use throughout the application
mux_token_service = MuxTokenService()