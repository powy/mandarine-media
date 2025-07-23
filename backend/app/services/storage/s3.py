import boto3
from botocore.exceptions import BotoCoreError, ClientError
from typing import Optional, Dict, Any
from .base import BaseStorageBackend, UploadResult, MediaFileInfo


class S3StorageBackend(BaseStorageBackend):
    """AWS S3 storage backend."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.bucket_name = config['bucket_name']
        self.region = config.get('region', 'us-east-1')
        self.access_key = config.get('access_key')
        self.secret_key = config.get('secret_key')
        self.endpoint_url = config.get('endpoint_url')  # For S3-compatible services
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            endpoint_url=self.endpoint_url
        )
    
    async def upload_file(self, file_info: MediaFileInfo, destination_path: str) -> UploadResult:
        """Upload a file to S3."""
        try:
            # Validate file
            is_valid, error_msg = self.validate_file(file_info)
            if not is_valid:
                return UploadResult(
                    success=False,
                    file_url="",
                    error_message=error_msg
                )
            
            # Read file content
            content = await file_info.file.read()
            
            # Prepare S3 upload parameters
            upload_params = {
                'Bucket': self.bucket_name,
                'Key': destination_path,
                'Body': content,
                'ContentType': file_info.content_type,
                'Metadata': {
                    'original_filename': file_info.filename,
                    'media_type': file_info.media_type,
                    'uploaded_by': 'kyool_media_platform'
                }
            }
            
            # Add ACL if specified
            if self.config.get('acl'):
                upload_params['ACL'] = self.config['acl']
            
            # Upload to S3
            self.s3_client.put_object(**upload_params)
            
            # Generate public URL
            file_url = self.get_public_url(destination_path)
            
            return UploadResult(
                success=True,
                file_url=file_url,
                file_size=len(content),
                content_type=file_info.content_type,
                metadata={
                    's3_bucket': self.bucket_name,
                    's3_key': destination_path,
                    'backend': self.backend_name
                }
            )
            
        except (BotoCoreError, ClientError) as e:
            return UploadResult(
                success=False,
                file_url="",
                error_message=f"S3 error: {str(e)}"
            )
        except Exception as e:
            return UploadResult(
                success=False,
                file_url="",
                error_message=f"Unexpected error: {str(e)}"
            )
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete a file from S3."""
        try:
            # Extract S3 key from URL
            s3_key = self._url_to_key(file_url)
            if not s3_key:
                return False
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
            
        except Exception:
            return False
    
    async def get_file_info(self, file_url: str) -> Optional[Dict[str, Any]]:
        """Get information about a file in S3."""
        try:
            s3_key = self._url_to_key(file_url)
            if not s3_key:
                return None
            
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                'size': response['ContentLength'],
                'content_type': response['ContentType'],
                'last_modified': response['LastModified'],
                'etag': response['ETag'],
                'metadata': response.get('Metadata', {}),
                'exists': True
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            raise
        except Exception:
            return None
    
    def get_public_url(self, file_path: str) -> str:
        """Get the public URL for a file."""
        if self.endpoint_url:
            # Custom endpoint (like MinIO)
            return f"{self.endpoint_url}/{self.bucket_name}/{file_path}"
        else:
            # Standard AWS S3
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{file_path}"
    
    def _url_to_key(self, file_url: str) -> Optional[str]:
        """Extract S3 key from URL."""
        try:
            if self.endpoint_url:
                prefix = f"{self.endpoint_url}/{self.bucket_name}/"
            else:
                prefix = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/"
            
            if file_url.startswith(prefix):
                return file_url[len(prefix):]
            return None
            
        except Exception:
            return None
    
    def get_allowed_content_types(self) -> Optional[list[str]]:
        """Get allowed content types for S3 storage."""
        return [
            # Video types
            'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
            # Image types for webcomics
            'image/jpeg', 'image/png', 'image/gif', 'image/webp'
        ]