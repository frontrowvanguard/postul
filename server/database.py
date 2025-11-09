from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from datetime import datetime
from typing import AsyncGenerator

from config import settings


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
engine = create_async_engine(
    get_async_database_url(settings.database_url),
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    echo=settings.debug,
)

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
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
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
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Idea(id={self.id}, user_id='{self.user_id}', project_id={self.project_id})>"


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
        finally:
            await session.close()


async def init_db():
    """Initialize database tables (create if not exist)."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        # Log error but don't fail startup if tables already exist
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Database initialization note: {e}")
        # Try to continue - tables might already exist
        pass

