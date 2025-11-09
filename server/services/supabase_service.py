from supabase import create_client, Client
from typing import Optional
import jwt
import logging

from config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service for Supabase authentication and user management."""
    
    def __init__(self):
        self.client: Optional[Client] = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Ensure Supabase client is initialized (lazy initialization)."""
        if not self._initialized:
            try:
                self.client = create_client(settings.supabase_url, settings.supabase_key)
                self._initialized = True
                logger.info("Supabase service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase service: {e}")
                raise
    
    def verify_token(self, token: str) -> dict:
        """
        Verify Supabase JWT token and return decoded payload.
        
        Supabase uses HS256 algorithm with the JWT secret for token verification.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload containing user information
            
        Raises:
            jwt.InvalidTokenError: If token is invalid or expired
        """
        self._ensure_initialized()
        try:
            # Verify and decode the token using Supabase JWT secret
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            raise
    
    def get_user_id(self, token: str) -> str:
        """
        Extract user ID from verified token.
        
        Args:
            token: JWT token string
            
        Returns:
            User ID (UUID string)
        """
        payload = self.verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("User ID not found in token")
        return user_id


# Singleton instance (lazy initialization)
supabase_service = SupabaseService()

