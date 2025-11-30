from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import logging

from database import get_db, Idea, Project
from schema import (
    IdeaAnalysisRequest,
    IdeaResponse,
    ExtendedIdeaAnalysis,
    TikiTakaRequest,
    TikiTakaResponse,
    TikiTakaMessage,
    GenerateSurveyPostsRequest,
    GenerateSurveyPostsResponse,
    SurveyPostMessage,
)
from services.ai_service import ai_service
from dependencies import OptionalCurrentUser, get_user_id_or_anonymous

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ideas", tags=["ideas"])


@router.post("/analyze", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def analyze_idea(
    request: IdeaAnalysisRequest,
    optional_user_id: OptionalCurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a transcribed idea and generate AI-powered insights.
    Works for both authenticated and anonymous users.
    
    Args:
        request: Idea analysis request with transcribed text
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session
        
    Returns:
        IdeaResponse with analysis and actionable items
    """
    try:
        # Get user ID (authenticated or anonymous)
        user_id = get_user_id_or_anonymous(optional_user_id)
        
        # Validate project_id if provided
        if request.project_id:
            result = await db.execute(
                select(Project).where(
                    Project.id == request.project_id,
                    Project.user_id == user_id
                )
            )
            project = result.scalar_one_or_none()
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Project with id {request.project_id} not found"
                )
        
        # Generate AI analysis
        user_type = "authenticated" if optional_user_id else "anonymous"
        logger.info(f"Generating analysis for {user_type} user {user_id}")
        analysis = await ai_service.analyze_idea(request.transcribed_text)
        
        # Convert ExtendedIdeaAnalysis to dict for JSON storage
        analysis_dict = analysis.model_dump()
        
        # Create idea record in database
        idea = Idea(
            user_id=user_id,
            project_id=request.project_id,  # Allow project_id for both authenticated and anonymous users
            transcribed_text=request.transcribed_text,
            analysis_json=analysis_dict,
        )
        
        db.add(idea)
        await db.flush()  # Flush to get the ID
        await db.refresh(idea)
        
        # Build response
        response = IdeaResponse(
            id=idea.id,
            user_id=idea.user_id,
            project_id=idea.project_id,
            transcribed_text=idea.transcribed_text,
            analysis=analysis,
            created_at=idea.created_at,
            updated_at=idea.updated_at,
        )
        
        logger.info(f"Successfully created idea analysis with id {idea.id} for {user_type} user")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing idea: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze idea. Please try again."
        )


@router.get("/{idea_id}", response_model=IdeaResponse)
async def get_idea(
    idea_id: int,
    optional_user_id: OptionalCurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific idea by ID.
    Works for both authenticated and anonymous users.
    Anonymous users can only access ideas they created.
    
    Args:
        idea_id: Idea ID
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session
        
    Returns:
        IdeaResponse with analysis
    """
    user_id = get_user_id_or_anonymous(optional_user_id)
    
    result = await db.execute(
        select(Idea).where(
            Idea.id == idea_id,
            Idea.user_id == user_id
        )
    )
    idea = result.scalar_one_or_none()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Idea with id {idea_id} not found"
        )
    
    # Convert analysis_json to ExtendedIdeaAnalysis model
    analysis = ExtendedIdeaAnalysis(**idea.analysis_json)
    
    return IdeaResponse(
        id=idea.id,
        user_id=idea.user_id,
        project_id=idea.project_id,
        transcribed_text=idea.transcribed_text,
        analysis=analysis,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
    )


@router.get("", response_model=list[IdeaResponse])
async def list_ideas(
    optional_user_id: OptionalCurrentUser,
    project_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    List ideas for the current user.
    Works for both authenticated and anonymous users.
    Anonymous users can only see ideas they created.
    
    Args:
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        project_id: Optional project ID filter (only for authenticated users)
        limit: Maximum number of results
        offset: Offset for pagination
        db: Database session
        
    Returns:
        List of IdeaResponse objects
    """
    user_id = get_user_id_or_anonymous(optional_user_id)
    
    query = select(Idea).where(Idea.user_id == user_id)
    
    # Project filtering for both authenticated and anonymous users
    if project_id:
        query = query.where(Idea.project_id == project_id)
    
    query = query.order_by(Idea.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    ideas = result.scalars().all()
    
    responses = []
    for idea in ideas:
        analysis = ExtendedIdeaAnalysis(**idea.analysis_json)
        responses.append(
            IdeaResponse(
                id=idea.id,
                user_id=idea.user_id,
                project_id=idea.project_id,
                transcribed_text=idea.transcribed_text,
                analysis=analysis,
                created_at=idea.created_at,
                updated_at=idea.updated_at,
            )
        )
    
    return responses


@router.patch("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: int,
    project_id: Optional[int] = None,
    optional_user_id: OptionalCurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an idea, primarily to associate it with a project.
    Works for both authenticated and anonymous users.
    
    Args:
        idea_id: Idea ID to update
        project_id: Optional project ID to associate the idea with
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session
        
    Returns:
        Updated IdeaResponse
    """
    user_id = get_user_id_or_anonymous(optional_user_id)
    
    # Get the idea
    result = await db.execute(
        select(Idea).where(
            Idea.id == idea_id,
            Idea.user_id == user_id
        )
    )
    idea = result.scalar_one_or_none()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Idea with id {idea_id} not found"
        )
    
    # Validate project_id if provided
    if project_id is not None:
        project_result = await db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.user_id == user_id
            )
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found"
            )
        idea.project_id = project_id
    
    await db.flush()
    await db.refresh(idea)
    
    # Convert analysis_json to ExtendedIdeaAnalysis model
    analysis = ExtendedIdeaAnalysis(**idea.analysis_json)
    
    return IdeaResponse(
        id=idea.id,
        user_id=idea.user_id,
        project_id=idea.project_id,
        transcribed_text=idea.transcribed_text,
        analysis=analysis,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
    )


@router.post("/tiki-taka", response_model=TikiTakaResponse, status_code=status.HTTP_200_OK)
async def tiki_taka_conversation(
    request: TikiTakaRequest,
    optional_user_id: OptionalCurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Tiki-taka conversation mode: Engage in a back-and-forth conversation 
    to help users think through their startup ideas.
    
    Acts as a thoughtful advisor that asks questions and guides users 
    to discover insights about their ideas themselves.
    
    Works for both authenticated and anonymous users.
    
    Args:
        request: Tiki-taka conversation request with transcribed text and conversation history
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session
        
    Returns:
        TikiTakaResponse with advisor's message and updated conversation history
    """
    try:
        user_id = get_user_id_or_anonymous(optional_user_id)
        user_type = "authenticated" if optional_user_id else "anonymous"
        
        logger.info(f"Tiki-taka conversation for {user_type} user {user_id}")
        
        # Convert conversation history to the format expected by AI service
        conversation_history = []
        for msg in request.conversation_history:
            conversation_history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Generate advisor response
        advisor_message = await ai_service.tiki_taka_conversation(
            transcribed_text=request.transcribed_text,
            conversation_history=conversation_history if conversation_history else None,
            idea_context=request.idea_context
        )
        
        # Build updated conversation history
        updated_history = request.conversation_history.copy()
        
        # Add user's current message
        updated_history.append(TikiTakaMessage(
            role="user",
            content=request.transcribed_text
        ))
        
        # Add advisor's response
        updated_history.append(TikiTakaMessage(
            role="assistant",
            content=advisor_message
        ))
        
        logger.info(f"Successfully generated tiki-taka response for {user_type} user")
        
        return TikiTakaResponse(
            advisor_message=advisor_message,
            conversation_history=updated_history
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in tiki-taka conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate advisor response. Please try again."
        )


@router.post("/generate-survey-posts", response_model=GenerateSurveyPostsResponse, status_code=status.HTTP_200_OK)
async def generate_survey_posts(
    request: GenerateSurveyPostsRequest,
    optional_user_id: OptionalCurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate survey post messages for social media platforms (X/Twitter or Threads).
    Uses AI to create engaging poll-style posts based on the idea context.
    
    Works for both authenticated and anonymous users.
    
    Args:
        request: GenerateSurveyPostsRequest with idea_id, platform, and count
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session
        
    Returns:
        GenerateSurveyPostsResponse with list of generated post messages
    """
    try:
        user_id = get_user_id_or_anonymous(optional_user_id)
        user_type = "authenticated" if optional_user_id else "anonymous"
        
        logger.info(f"Generating survey posts for idea {request.idea_id} for {user_type} user {user_id}")
        
        # Get the idea to access its context
        result = await db.execute(
            select(Idea).where(
                Idea.id == request.idea_id,
                Idea.user_id == user_id
            )
        )
        idea = result.scalar_one_or_none()
        
        if not idea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Idea with id {request.idea_id} not found"
            )
        
        # Build idea context from transcribed text and analysis
        idea_context_parts = [f"Idea: {idea.transcribed_text}"]
        
        # Add analysis summary if available
        if idea.analysis_json:
            try:
                analysis = ExtendedIdeaAnalysis(**idea.analysis_json)
                if analysis.summary:
                    idea_context_parts.append(f"\nSummary: {analysis.summary}")
                if analysis.problem_statement:
                    idea_context_parts.append(f"\nProblem: {analysis.problem_statement}")
            except Exception as e:
                logger.warning(f"Could not parse analysis JSON: {e}")
        
        idea_context = "\n".join(idea_context_parts)
        
        # Generate survey posts using AI service
        posts_data = await ai_service.generate_survey_posts(
            idea_context=idea_context,
            platform=request.platform,
            count=request.count
        )
        
        # Convert to response model
        from schema import PollOption
        messages = [
            SurveyPostMessage(
                id=post["id"],
                text=post["text"],
                poll_options=[PollOption(text=opt["text"]) for opt in post.get("poll_options", [])]
            )
            for post in posts_data
        ]
        
        logger.info(f"Successfully generated {len(messages)} survey posts for {user_type} user")
        
        return GenerateSurveyPostsResponse(messages=messages)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating survey posts: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate survey posts. Please try again."
        )

