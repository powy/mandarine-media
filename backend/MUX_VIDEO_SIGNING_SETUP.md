# MUX Video Signing Implementation - Setup Guide

This document provides instructions for setting up and using the MUX video signing functionality that has been implemented in the KYOOL Media Platform backend.

## Overview

The implementation includes:
- **MuxTokenService**: Core service for generating JWT tokens for secure video playback and DRM
- **API Endpoints**: REST endpoints for token generation and management
- **Storage Backend Integration**: Enhanced MUX storage backend with signed playback policy support

## Environment Variables Setup

Add these environment variables to your `.env` file:

```bash
# Mux API Configuration (existing)
UPLOAD_MUX_TOKEN_ID=your_mux_token_id
UPLOAD_MUX_TOKEN_SECRET=your_mux_token_secret
UPLOAD_MUX_ENCODING_TIER=baseline

# Mux Signing Keys (NEW - Critical for Security)
MUX_SIGNING_KEY_ID=your_signing_key_id
MUX_PRIVATE_KEY=your_base64_encoded_private_key_or_pem_format

# Backend Selection
UPLOAD_VIDEO_BACKEND=mux
```

### Getting MUX Signing Keys

1. Log into your Mux dashboard
2. Go to Settings > Signing Keys
3. Create a new signing key pair
4. Copy the Key ID and Private Key
5. For the private key, you can use either:
   - Base64 encoded format: `base64_encoded_key_here`
   - PEM format: 
   ```
   -----BEGIN RSA PRIVATE KEY-----
   your_private_key_here
   -----END RSA PRIVATE KEY-----
   ```

## API Endpoints

### 1. Generate Playback Token

**POST** `/api/v1/video-files/{id}/playback-token`

Generates a JWT token for secure video playback.

**Parameters:**
- `id` (path): Video file UUID
- `expiration_minutes` (query, optional): Token expiration in minutes (default: 60, max: 1440)

**Headers:**
- `Authorization: Bearer {access_token}` (any authenticated user)

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playback_url": "https://stream.mux.com/{playback_id}.m3u8?token={jwt_token}",
  "playback_id": "your-playback-id",
  "expires_in_minutes": 60,
  "expires_at": 1640995200
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/video-files/550e8400-e29b-41d4-a716-446655440000/playback-token?expiration_minutes=120" \
  -H "Authorization: Bearer your_access_token"
```

### 2. Generate DRM Token

**POST** `/api/v1/video-files/{id}/drm-token`

Generates a JWT token for DRM license requests. **Admin only**.

**Parameters:**
- `id` (path): Video file UUID
- `expiration_minutes` (query, optional): Token expiration in minutes (default: 60)
- `drm_key_id` (query, optional): Specific DRM key ID

**Headers:**
- `Authorization: Bearer {admin_access_token}` (admin required)

**Response:**
```json
{
  "success": true,
  "drm_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playback_id": "your-playback-id", 
  "drm_key_id": null,
  "expires_in_minutes": 60,
  "expires_at": 1640995200
}
```

### 3. Analyze Token (Debug)

**GET** `/api/v1/video-files/{id}/token-info`

Analyzes a JWT token for debugging purposes. **Admin only**.

**Parameters:**
- `id` (path): Video file UUID
- `token` (query): JWT token to analyze

**Response:**
```json
{
  "success": true,
  "token_info": {
    "payload": {
      "sub": "playback-id",
      "aud": "v",
      "exp": 1640995200,
      "kid": "signing-key-id"
    },
    "headers": {
      "alg": "RS256",
      "typ": "JWT",
      "kid": "signing-key-id"
    },
    "is_expired": false,
    "seconds_until_expiration": 3600,
    "playback_id": "playback-id",
    "audience": "v",
    "key_id": "signing-key-id"
  }
}
```

## Frontend Integration

### React/React Native Example

```typescript
// API service function
async function getSignedVideoUrl(videoFileId: string, expirationMinutes: number = 60): Promise<string> {
  const response = await fetch(`/api/v1/video-files/${videoFileId}/playback-token?expiration_minutes=${expirationMinutes}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (data.success) {
    return data.playback_url; // Ready to use with video players
  } else {
    throw new Error('Failed to get signed video URL');
  }
}

// Usage in component
const VideoPlayer = ({ videoFileId }) => {
  const [videoUrl, setVideoUrl] = useState(null);
  
  useEffect(() => {
    getSignedVideoUrl(videoFileId, 120) // 2 hour expiration
      .then(url => setVideoUrl(url))
      .catch(err => console.error('Error loading video:', err));
  }, [videoFileId]);

  if (!videoUrl) return <div>Loading video...</div>;
  
  return (
    <video controls width="100%">
      <source src={videoUrl} type="application/x-mpegURL" />
    </video>
  );
};
```

### Video Player Libraries

The signed URLs work with:
- **Web**: HLS.js, Video.js, Plyr
- **React Native**: react-native-video, expo-av
- **Native iOS**: AVPlayer
- **Native Android**: ExoPlayer

## Security Considerations

### 1. Token Expiration
- Default: 60 minutes
- Maximum: 24 hours (1440 minutes)
- Adjust based on content sensitivity
- Implement token refresh for long-form content

### 2. Access Control
- Playback tokens: Any authenticated user
- DRM tokens: Admin only
- Validate user permissions before token generation

### 3. Private Key Management
- Store `MUX_PRIVATE_KEY` securely (environment variables, secrets manager)
- Never commit private keys to version control
- Rotate keys periodically
- Use base64 encoding for safe transport

### 4. URL Sharing
- Signed URLs are temporary and user-specific
- Don't cache signed URLs beyond token expiration
- Generate fresh tokens for each playback session

## Error Handling

Common error scenarios:

| Error | Status | Description | Solution |
|-------|--------|-------------|----------|
| Video file not found | 404 | Invalid video file ID | Check video file exists |
| No MUX playback ID | 400 | Video not processed by MUX | Wait for MUX processing or check upload |
| MUX keys not configured | 500 | Missing signing keys | Set environment variables |
| Token generation failed | 500 | Crypto/JWT error | Check private key format |
| Expired token | 401 | Token past expiration | Generate new token |

## Monitoring and Logging

The implementation logs:
- Token generation events (info level)
- Failed token requests (error level)
- Configuration warnings (warning level)

Monitor for:
- High token generation rates (potential abuse)
- Frequent token generation failures
- Missing configuration warnings

## Testing

Run the test suite to verify functionality:

```bash
# Test MUX token service
python -m pytest tests/test_mux_token_service.py -v

# Test API endpoints  
python -m pytest tests/test_mux_endpoints.py -v

# Test with real credentials (integration)
MUX_SIGNING_KEY_ID=real_key_id MUX_PRIVATE_KEY=real_key python -m pytest tests/test_mux_token_service.py::TestMuxTokenServiceIntegration -v
```

## Troubleshooting

### Issue: "MUX signing keys not configured"
**Solution:** Set `MUX_SIGNING_KEY_ID` and `MUX_PRIVATE_KEY` environment variables

### Issue: "Failed to load MUX private key"
**Solutions:**
- Check private key format (PEM or base64)
- Ensure no extra whitespace or characters
- Verify the key is an RSA private key

### Issue: Video player can't load signed URL
**Solutions:**
- Check token hasn't expired
- Verify video player supports HLS format
- Test with simple curl request first

### Issue: 400 "Video file does not have a MUX playback ID"
**Solutions:**
- Wait for MUX processing to complete
- Check if video was uploaded to MUX backend
- Verify MUX upload was successful

## Production Deployment

1. **Environment Variables**: Use a secure secrets management system
2. **Key Rotation**: Plan for periodic private key rotation
3. **Monitoring**: Set up alerts for token generation failures
4. **Rate Limiting**: Consider implementing rate limits on token endpoints
5. **CDN**: MUX handles CDN distribution automatically

## Support

For MUX-specific issues:
- [MUX Documentation](https://docs.mux.com/)
- [MUX Support](https://mux.com/support)

For implementation issues:
- Check backend logs for detailed error messages
- Use the token-info endpoint for JWT debugging
- Verify all environment variables are set correctly