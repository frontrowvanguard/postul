"""Flyer generation and editing API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging
import asyncio

from database import get_db, Flyer, Project, Idea, AsyncSessionLocal
from schema import (
    GenerateFlyerRequest,
    GenerateFlyerResponse,
    EditFlyerRequest,
    EditFlyerResponse,
    FlyerResponse,
)
from services.flyer_service import flyer_service
from dependencies import OptionalCurrentUser, get_user_id_or_anonymous

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/flyers", tags=["flyers"])


async def process_flyer_generation(
    flyer_id: int,
    project_name: str,
    project_description: str,
    problem_statement: str,
    project_id: int,
):
    """Background task to generate flyer."""
    logger.info(f"Background task started for flyer {flyer_id}")
    # Add a small delay to ensure the commit from the request handler is visible
    await asyncio.sleep(0.1)  # Small delay to ensure transaction is committed
    
    async with AsyncSessionLocal() as db:
        try:
            # Update status to processing
            logger.info(f"Updating flyer {flyer_id} status to processing")
            flyer_result = await db.execute(select(Flyer).where(Flyer.id == flyer_id))
            flyer = flyer_result.scalar_one_or_none()
            if not flyer:
                logger.error(f"Flyer {flyer_id} not found for background processing. Retrying...")
                # Retry once after a short delay
                await asyncio.sleep(0.5)
                flyer_result = await db.execute(select(Flyer).where(Flyer.id == flyer_id))
                flyer = flyer_result.scalar_one_or_none()
                if not flyer:
                    logger.error(f"Flyer {flyer_id} still not found after retry")
                    return

            flyer.status = "processing"
            await db.commit()
            await db.refresh(flyer)
            logger.info(f"Flyer {flyer_id} status updated to processing")

            logger.info(f"Starting background generation for flyer {flyer_id}")

            # Generate flyer using flyer service
            flyer_data = await flyer_service.generate_initial_flyer(
                project_name=project_name,
                project_description=project_description,
                problem_statement=problem_statement,
                project_id=project_id,
            )

            # Update flyer with results
            flyer.image_url = flyer_data["image_url"]
            flyer.conversation_history = flyer_data["conversation_history"]
            flyer.status = "completed"
            await db.commit()

            logger.info(
                f"Successfully completed background generation for flyer {flyer_id}"
            )

        except Exception as e:
            logger.error(f"Error in background flyer generation: {e}", exc_info=True)
            # Update flyer status to failed
            try:
                flyer_result = await db.execute(
                    select(Flyer).where(Flyer.id == flyer_id)
                )
                flyer = flyer_result.scalar_one_or_none()
                if flyer:
                    flyer.status = "failed"
                    flyer.error_message = str(e)[:500]  # Limit error message length
                    await db.commit()
            except Exception as update_error:
                logger.error(
                    f"Failed to update flyer error status: {update_error}",
                    exc_info=True,
                )


async def process_flyer_edit(
    flyer_id: int,
    edit_instruction: str,
    conversation_history: list,
):
    """Background task to edit flyer."""
    logger.info(f"Background edit task started for flyer {flyer_id}")
    async with AsyncSessionLocal() as db:
        try:
            # Get flyer
            logger.info(f"Fetching flyer {flyer_id} for editing")
            flyer_result = await db.execute(select(Flyer).where(Flyer.id == flyer_id))
            flyer = flyer_result.scalar_one_or_none()
            if not flyer:
                logger.error(f"Flyer {flyer_id} not found for background editing")
                return

            if not flyer.image_url:
                flyer.status = "failed"
                flyer.error_message = "No image available to edit"
                await db.commit()
                return

            # Update status to processing
            logger.info(f"Updating flyer {flyer_id} status to processing")
            flyer.status = "processing"
            await db.commit()
            await db.refresh(flyer)
            logger.info(f"Flyer {flyer_id} status updated to processing")

            logger.info(f"Starting background edit for flyer {flyer_id}")

            # Edit flyer using flyer service
            edited_data = await flyer_service.edit_flyer(
                current_image_base64=flyer.image_url,
                edit_instruction=edit_instruction,
                conversation_history=conversation_history,
            )

            # Update flyer with results
            flyer.image_url = edited_data["image_url"]
            flyer.edit_count += 1
            flyer.conversation_history = edited_data["conversation_history"]
            flyer.status = "completed"
            await db.commit()

            logger.info(f"Successfully completed background edit for flyer {flyer_id}")

        except Exception as e:
            logger.error(f"Error in background flyer editing: {e}", exc_info=True)
            # Update flyer status to failed
            try:
                flyer_result = await db.execute(
                    select(Flyer).where(Flyer.id == flyer_id)
                )
                flyer = flyer_result.scalar_one_or_none()
                if flyer:
                    flyer.status = "failed"
                    flyer.error_message = str(e)[:500]  # Limit error message length
                    await db.commit()
            except Exception as update_error:
                logger.error(
                    f"Failed to update flyer error status: {update_error}",
                    exc_info=True,
                )


@router.post(
    "/generate",
    response_model=GenerateFlyerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_flyer(
    request: GenerateFlyerRequest,
    background_tasks: BackgroundTasks,
    optional_user_id: OptionalCurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a flyer for a project and idea (asynchronous).
    Works for both authenticated and anonymous users.
    Returns immediately with flyer_id and status. Generation happens in background.

    Args:
        request: Flyer generation request with project_id and idea_id
        background_tasks: FastAPI background tasks
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session

    Returns:
        GenerateFlyerResponse with flyer_id, status, and edit_count
    """
    try:
        user_id = get_user_id_or_anonymous(optional_user_id)

        # Verify project exists and belongs to user
        project_result = await db.execute(
            select(Project).where(
                Project.id == request.project_id, Project.user_id == user_id
            )
        )
        project = project_result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {request.project_id} not found",
            )

        # Verify idea exists and belongs to user
        idea_result = await db.execute(
            select(Idea).where(
                Idea.id == request.idea_id,
                Idea.user_id == user_id,
                Idea.project_id == request.project_id,
            )
        )
        idea = idea_result.scalar_one_or_none()

        if not idea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Idea with id {request.idea_id} not found or not associated with project",
            )

        # Check if flyer already exists for this project
        existing_flyer_result = await db.execute(
            select(Flyer).where(
                Flyer.project_id == request.project_id, Flyer.user_id == user_id
            )
        )
        existing_flyer = existing_flyer_result.scalar_one_or_none()

        if existing_flyer:
            # Return existing flyer
            return GenerateFlyerResponse(
                flyer_id=existing_flyer.id,
                image_url=existing_flyer.image_url,
                edit_count=existing_flyer.edit_count,
                status=existing_flyer.status,
            )

        # Get idea analysis for context
        idea_analysis = idea.analysis_json or {}
        problem_statement = idea_analysis.get("problem_statement", "")
        if not problem_statement:
            problem_statement = idea.transcribed_text[:200]

        # Create flyer record immediately with pending status
        flyer = Flyer(
            user_id=user_id,
            project_id=request.project_id,
            idea_id=request.idea_id,
            image_url=None,
            edit_count=0,
            conversation_history=None,
            status="pending",
        )

        db.add(flyer)
        await db.commit()  # Commit immediately so background task can see it
        await db.refresh(flyer)

        # Start background task for generation
        # FastAPI BackgroundTasks supports async functions - they will be awaited after response
        logger.info(f"Scheduling background task for flyer {flyer.id}")
        background_tasks.add_task(
            process_flyer_generation,
            flyer.id,
            project.name,
            project.description or "",
            problem_statement,
            request.project_id,
        )
        logger.info(
            f"Background task scheduled for flyer {flyer.id} (project {request.project_id})"
        )

        return GenerateFlyerResponse(
            flyer_id=flyer.id,
            image_url=None,
            edit_count=flyer.edit_count,
            status="pending",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating flyer generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate flyer generation. Please try again.",
        )


@router.post("/{flyer_id}/edit", response_model=EditFlyerResponse)
async def edit_flyer(
    flyer_id: int,
    request: EditFlyerRequest,
    background_tasks: BackgroundTasks,
    optional_user_id: OptionalCurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Edit a flyer using chat-based instructions (asynchronous).
    Works for both authenticated and anonymous users.
    Maximum 5 edits allowed.
    Returns immediately with status. Editing happens in background.

    Args:
        flyer_id: ID of the flyer to edit
        request: Edit request with instruction and conversation history
        background_tasks: FastAPI background tasks
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session

    Returns:
        EditFlyerResponse with status, edit_count, and conversation_history
    """
    try:
        user_id = get_user_id_or_anonymous(optional_user_id)

        # Get flyer
        flyer_result = await db.execute(
            select(Flyer).where(Flyer.id == flyer_id, Flyer.user_id == user_id)
        )
        flyer = flyer_result.scalar_one_or_none()

        if not flyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Flyer with id {flyer_id} not found",
            )

        # Check edit limit
        if flyer.edit_count >= flyer_service.max_edits:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum edit limit ({flyer_service.max_edits}) reached",
            )

        if not flyer.image_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Flyer image not found"
            )

        # Check if already processing
        if flyer.status == "processing":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Flyer is already being processed. Please wait for the current operation to complete.",
            )

        # Get conversation history
        conversation_history = (
            request.conversation_history or flyer.conversation_history or []
        )

        # Update status to pending (will be set to processing by background task)
        flyer.status = "pending"
        await db.commit()
        await db.refresh(flyer)

        # Start background task for editing
        # FastAPI BackgroundTasks supports async functions - they will be awaited after response
        logger.info(f"Scheduling background edit task for flyer {flyer_id}")
        background_tasks.add_task(
            process_flyer_edit,
            flyer_id,
            request.edit_instruction,
            conversation_history,
        )
        logger.info(f"Background edit task scheduled for flyer {flyer_id}")

        return EditFlyerResponse(
            image_url=None,  # Will be updated by background task
            edit_count=flyer.edit_count,
            conversation_history=conversation_history,
            status="pending",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating flyer edit: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate flyer edit. Please try again.",
        )


@router.get("/{flyer_id}", response_model=FlyerResponse)
async def get_flyer(
    flyer_id: int,
    optional_user_id: OptionalCurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific flyer by ID.
    Works for both authenticated and anonymous users.

    Args:
        flyer_id: ID of the flyer
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session

    Returns:
        FlyerResponse with flyer details
    """
    user_id = get_user_id_or_anonymous(optional_user_id)

    flyer_result = await db.execute(
        select(Flyer).where(Flyer.id == flyer_id, Flyer.user_id == user_id)
    )
    flyer = flyer_result.scalar_one_or_none()

    if not flyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flyer with id {flyer_id} not found",
        )

    return FlyerResponse(
        id=flyer.id,
        user_id=flyer.user_id,
        project_id=flyer.project_id,
        idea_id=flyer.idea_id,
        image_url=flyer.image_url,
        edit_count=flyer.edit_count,
        conversation_history=flyer.conversation_history,
        status=flyer.status,
        error_message=flyer.error_message,
        created_at=flyer.created_at,
        updated_at=flyer.updated_at,
    )


@router.get("/project/{project_id}", response_model=FlyerResponse)
async def get_flyer_by_project(
    project_id: int,
    optional_user_id: OptionalCurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get flyer for a specific project.
    Works for both authenticated and anonymous users.

    Args:
        project_id: ID of the project
        optional_user_id: Optional authenticated user ID (None for anonymous users)
        db: Database session

    Returns:
        FlyerResponse with flyer details
    """
    user_id = get_user_id_or_anonymous(optional_user_id)

    flyer_result = await db.execute(
        select(Flyer)
        .where(Flyer.project_id == project_id, Flyer.user_id == user_id)
        .order_by(Flyer.created_at.desc())
    )
    flyer = flyer_result.scalar_one_or_none()

    if not flyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flyer for project {project_id} not found",
        )

    return FlyerResponse(
        id=flyer.id,
        user_id=flyer.user_id,
        project_id=flyer.project_id,
        idea_id=flyer.idea_id,
        image_url=flyer.image_url,
        edit_count=flyer.edit_count,
        conversation_history=flyer.conversation_history,
        status=flyer.status,
        error_message=flyer.error_message,
        created_at=flyer.created_at,
        updated_at=flyer.updated_at,
    )
