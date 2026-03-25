"""Shared configuration — loaded from environment or .env file."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class DatabaseSettings(BaseSettings):
    """PostgreSQL connection settings."""

    host: str = "localhost"
    port: int = 5432
    user: str = "aap"
    password: str = "aap_dev_password"
    name: str = "agent_architect_pro"

    model_config = {"env_prefix": "DB_"}

    @property
    def url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

    @property
    def sync_url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class RedisSettings(BaseSettings):
    """Redis connection settings."""

    host: str = "localhost"
    port: int = 6379
    db: int = 0

    model_config = {"env_prefix": "REDIS_"}

    @property
    def url(self) -> str:
        return f"redis://{self.host}:{self.port}/{self.db}"


class KafkaSettings(BaseSettings):
    """Kafka connection settings."""

    bootstrap_servers: str = "localhost:9092"
    client_id: str = "aap-service"

    model_config = {"env_prefix": "KAFKA_"}


class TemporalSettings(BaseSettings):
    """Temporal connection settings."""

    host: str = "localhost"
    port: int = 7233
    namespace: str = "default"

    model_config = {"env_prefix": "TEMPORAL_"}

    @property
    def target(self) -> str:
        return f"{self.host}:{self.port}"


class OTelSettings(BaseSettings):
    """OpenTelemetry settings."""

    service_name: str = "aap-service"
    exporter_endpoint: str = "http://localhost:4317"
    enabled: bool = True

    model_config = {"env_prefix": "OTEL_"}


class AuthSettings(BaseSettings):
    """Authentication settings."""

    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 30
    oidc_issuer: str = "http://localhost:8080/realms/aap"

    model_config = {"env_prefix": "AUTH_"}


class Settings(BaseSettings):
    """Root settings container — aggregates all subsystems."""

    service_name: str = "agent-architect-pro"
    environment: str = "development"
    debug: bool = True

    db: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()
    kafka: KafkaSettings = KafkaSettings()
    temporal: TemporalSettings = TemporalSettings()
    otel: OTelSettings = OTelSettings()
    auth: AuthSettings = AuthSettings()

    model_config = {"env_prefix": "AAP_"}


# Singleton
settings = Settings()
