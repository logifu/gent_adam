"""
S3-Compatible Object Storage Integration

Provides a unified interface for storing and retrieving binary artifacts
using S3-compatible storage (AWS S3 / MinIO / R2):
- Artifact upload/download with presigned URLs
- Versioned storage with content-addressable hashing
- Bucket management per tenant/agent
- Lifecycle policies for artifact retention
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import hashlib
import uuid
import logging

logger = logging.getLogger(__name__)


# ── Configuration ──────────────────────────────────────────

class S3Config(BaseModel):
    endpoint_url: str = Field(default="http://localhost:9000", description="MinIO/S3 endpoint")
    access_key: str = Field(default="minioadmin")
    secret_key: str = Field(default="minioadmin")
    region: str = Field(default="us-east-1")
    default_bucket: str = Field(default="aap-artifacts")
    presigned_url_expiry: int = Field(default=3600, description="Presigned URL expiry in seconds")


# ── Object Metadata ────────────────────────────────────────

class StoredObject(BaseModel):
    object_id: str
    bucket: str
    key: str
    content_hash: str  # SHA-256
    size_bytes: int
    content_type: str
    upload_url: Optional[str] = None
    download_url: Optional[str] = None
    version_id: Optional[str] = None
    created_at: str
    metadata: dict = Field(default_factory=dict)


class UploadRequest(BaseModel):
    agent_id: str
    artifact_type: str  # model_config | evaluation_report | signed_bundle | knowledge_doc
    filename: str
    content_type: str = "application/octet-stream"
    size_bytes: int = 0
    metadata: dict = Field(default_factory=dict)


class DownloadRequest(BaseModel):
    bucket: str
    key: str


# ── Storage Client ─────────────────────────────────────────

class ObjectStorageClient:
    """
    S3-compatible object storage client.

    In production, wraps boto3.client('s3') or the MinIO SDK.
    This implementation provides the interface with in-memory simulation.
    """

    def __init__(self, config: Optional[S3Config] = None):
        self.config = config or S3Config()
        self._objects: dict[str, StoredObject] = {}
        self._buckets: set[str] = {self.config.default_bucket}
        logger.info(f"S3 client initialized: {self.config.endpoint_url}")

    async def ensure_bucket(self, bucket: str) -> bool:
        """Create bucket if it doesn't exist."""
        if bucket not in self._buckets:
            self._buckets.add(bucket)
            logger.info(f"Bucket created: {bucket}")
        return True

    def _make_key(self, agent_id: str, artifact_type: str, filename: str) -> str:
        """Generate object key with structured path."""
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        return f"agents/{agent_id}/{artifact_type}/{date_prefix}/{filename}"

    async def generate_upload_url(self, req: UploadRequest) -> StoredObject:
        """
        Generate a presigned upload URL.

        In production:
        - Calls s3.generate_presigned_url('put_object', ...)
        - Sets Content-Type and metadata headers
        - Returns URL valid for config.presigned_url_expiry seconds
        """
        bucket = self.config.default_bucket
        key = self._make_key(req.agent_id, req.artifact_type, req.filename)
        object_id = f"obj-{uuid.uuid4().hex[:12]}"

        obj = StoredObject(
            object_id=object_id,
            bucket=bucket,
            key=key,
            content_hash="pending",
            size_bytes=req.size_bytes,
            content_type=req.content_type,
            upload_url=f"{self.config.endpoint_url}/{bucket}/{key}?X-Amz-Expires={self.config.presigned_url_expiry}",
            created_at=datetime.utcnow().isoformat(),
            metadata={
                **req.metadata,
                "agent_id": req.agent_id,
                "artifact_type": req.artifact_type,
            },
        )

        self._objects[object_id] = obj
        return obj

    async def generate_download_url(self, bucket: str, key: str) -> Optional[StoredObject]:
        """
        Generate a presigned download URL.

        In production:
        - Calls s3.generate_presigned_url('get_object', ...)
        - Returns URL valid for config.presigned_url_expiry seconds
        """
        for obj in self._objects.values():
            if obj.bucket == bucket and obj.key == key:
                obj.download_url = f"{self.config.endpoint_url}/{bucket}/{key}?X-Amz-Expires={self.config.presigned_url_expiry}"
                return obj
        return None

    async def confirm_upload(self, object_id: str, content_hash: str, size_bytes: int) -> StoredObject:
        """
        Confirm that an upload completed successfully.

        Called after the client uploads via the presigned URL.
        Records the content hash for integrity verification.
        """
        if object_id not in self._objects:
            raise ValueError(f"Object {object_id} not found")

        obj = self._objects[object_id]
        obj.content_hash = content_hash
        obj.size_bytes = size_bytes
        obj.version_id = f"v-{uuid.uuid4().hex[:8]}"
        return obj

    async def delete_object(self, object_id: str) -> bool:
        """Delete an object from storage."""
        if object_id in self._objects:
            del self._objects[object_id]
            return True
        return False

    async def list_objects(
        self,
        agent_id: Optional[str] = None,
        artifact_type: Optional[str] = None,
        prefix: Optional[str] = None,
    ) -> list[StoredObject]:
        """List objects with optional filtering."""
        results = list(self._objects.values())
        if agent_id:
            results = [o for o in results if o.metadata.get("agent_id") == agent_id]
        if artifact_type:
            results = [o for o in results if o.metadata.get("artifact_type") == artifact_type]
        if prefix:
            results = [o for o in results if o.key.startswith(prefix)]
        return sorted(results, key=lambda o: o.created_at, reverse=True)

    async def get_storage_stats(self, agent_id: Optional[str] = None) -> dict:
        """Get storage usage statistics."""
        objects = list(self._objects.values())
        if agent_id:
            objects = [o for o in objects if o.metadata.get("agent_id") == agent_id]

        total_size = sum(o.size_bytes for o in objects)
        by_type: dict[str, int] = {}
        for o in objects:
            atype = o.metadata.get("artifact_type", "unknown")
            by_type[atype] = by_type.get(atype, 0) + o.size_bytes

        return {
            "total_objects": len(objects),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "by_type": by_type,
        }


# ── Module-level singleton ─────────────────────────────────

_client: Optional[ObjectStorageClient] = None


def get_storage_client(config: Optional[S3Config] = None) -> ObjectStorageClient:
    """Get or create the storage client singleton."""
    global _client
    if _client is None:
        _client = ObjectStorageClient(config)
    return _client
