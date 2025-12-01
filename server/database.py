from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, text
from datetime import datetime
from typing import AsyncGenerator
import logging

from config import settings

logger = logging.getLogger(__name__)


# Base class for declarative models
class Base(DeclarativeBase):
    pass


# Convert database URL to asyncpg format if needed
def get_async_database_url(database_url: str) -> str:
    """Convert PostgreSQL URL to asyncpg format."""
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql+asyncpg://"):
        return database_url
    else:
        raise ValueError(f"Unsupported database URL format: {database_url}")


# Database engine

try:
    async_database_url = get_async_database_url(settings.database_url)
    # Log the URL with masked password for debugging
    masked_url = async_database_url.split("@")[0].split(":")[0] + ":***@" + "@".join(async_database_url.split("@")[1:]) if "@" in async_database_url else async_database_url
    logger.info(f"Connecting to database: {masked_url}")
    
    engine = create_async_engine(
        async_database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,  # Verify connections before using them
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=settings.debug,
    )
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    logger.error(f"Database URL (masked): {settings.database_url.split('@')[0].split(':')[0] + ':***@' + '@'.join(settings.database_url.split('@')[1:]) if '@' in settings.database_url else 'NOT SET'}")
    raise

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Database Models
class Project(Base):
    """Project model for user projects."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Supabase user UUID
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', user_id='{self.user_id}')>"


class Idea(Base):
    """Idea model for storing user ideas and AI analysis."""

    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Supabase user UUID
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    transcribed_text = Column(Text, nullable=False)  # Original voice input text
    analysis_json = Column(JSON, nullable=True)  # AI-generated analysis stored as JSON
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<Idea(id={self.id}, user_id='{self.user_id}', project_id={self.project_id})>"


class Flyer(Base):
    """Flyer model for storing generated flyers and editing state."""

    __tablename__ = "flyers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Supabase user UUID
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    idea_id = Column(Integer, ForeignKey("ideas.id"), nullable=False, index=True)
    image_url = Column(Text, nullable=True)  # URL to generated flyer image
    edit_count = Column(Integer, default=0, nullable=False)  # Track number of edits (max 5)
    conversation_history = Column(JSON, nullable=True)  # Store multi-turn editing conversation
    status = Column(String, default="pending", nullable=False)  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)  # Error message if status is failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<Flyer(id={self.id}, project_id={self.project_id}, edit_count={self.edit_count})>"


# Database dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        # Note: session.close() is automatically called by the async with context manager


async def init_db():
    """Initialize database tables (create if not exist)."""
    try:
        # Test connection first
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection test successful")
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully")
    except Exception as e:
        # Log error with more details
        error_msg = str(e)
        if "nodename nor servname provided" in error_msg or "could not translate hostname" in error_msg.lower() or "Name or service not known" in error_msg:
            logger.error(
                f"Database connection failed: Cannot resolve database hostname '{settings.database_url.split('@')[1].split('/')[0] if '@' in settings.database_url else 'UNKNOWN'}'. "
                f"This usually means:\n"
                f"  1. The Supabase project is paused or deleted\n"
                f"  2. The DATABASE_URL hostname in .env is incorrect\n"
                f"  3. The project reference ID doesn't match your Supabase project\n\n"
                f"Please check your Supabase dashboard and update the DATABASE_URL in .env file.\n"
                f"Error: {e}"
            )
        else:
            logger.warning(f"Database initialization note: {e}")
        # Don't raise - let the app start and show the error in logs
        pass
