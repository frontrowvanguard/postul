from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated
import logging

from services.supabase_service import supabase_service

logger = logging.getLogger(__name__)

# Security scheme for JWT token
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> str:
    """
    FastAPI dependency to verify Supabase JWT token and return user ID.
    
    Args:
        credentials: HTTPBearer credentials containing the JWT token
        
    Returns:
        User ID (UUID string) from the verified token
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials
    
    try:
        user_id = supabase_service.get_user_id(token)
        return user_id
    except ValueError as e:
        logger.warning(f"Invalid token format: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Type alias for dependency injection
CurrentUser = Annotated[str, Depends(get_current_user)]

