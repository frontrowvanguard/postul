"""
server/routers/surveys.py
APIs for creating a Discord survey (pin) and collecting responses.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
import json
from server.services import supabase_service

router = APIRouter(prefix="/surveys", tags=["surveys"])
logger = logging.getLogger(__name__)

class CreateSurveyReq(BaseModel):
    idea_id: int
    channel_id: str
    message_id: Optional[str] = None
    title: Optional[str] = None

class SurveyResp(BaseModel):
    id: int
    idea_id: int
    channel_id: str
    message_id: str

@router.post("/", response_model=SurveyResp)
async def create_survey(req: CreateSurveyReq):
    await supabase_service.connect()
    q = """
    INSERT INTO surveys (idea_id, channel_id, message_id, title, created_at)
    VALUES (:idea_id, :channel_id, :message_id, :title, now())
    RETURNING id;
    """
    values = {"idea_id": req.idea_id, "channel_id": req.channel_id, "message_id": req.message_id or "", "title": req.title or ""}
    try:
        sid = await supabase_service.database.execute(query=q, values=values)
    except Exception as exc:
        logger.exception("Failed to create survey")
        raise HTTPException(status_code=500, detail="Failed to create survey")
    return {"id": sid, "idea_id": req.idea_id, "channel_id": req.channel_id, "message_id": req.message_id or ""}

class SubmitVoteReq(BaseModel):
    survey_id: int
    user_id: str
    response: str  # 'yes'|'maybe'|'no'

@router.post("/response")
async def submit_vote(req: SubmitVoteReq):
    await supabase_service.connect()
    # Ensure single vote per user per survey
    delete_q = "DELETE FROM survey_responses WHERE survey_id = :survey_id AND user_id = :user_id;"
    insert_q = """
    INSERT INTO survey_responses (survey_id, user_id, response, created_at)
    VALUES (:survey_id, :user_id, :response, now());
    """
    try:
        await supabase_service.database.execute(query=delete_q, values={"survey_id": req.survey_id, "user_id": req.user_id})
        await supabase_service.database.execute(query=insert_q, values={"survey_id": req.survey_id, "user_id": req.user_id, "response": req.response})
    except Exception:
        logger.exception("Failed to record vote")
        raise HTTPException(status_code=500, detail="Failed to record vote")
    return {"status": "ok"}
