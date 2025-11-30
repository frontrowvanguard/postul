from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class PostulIdeateRequest(BaseModel):
    idea: str


class PostulIdeateAnalysis(BaseModel):
    summary: str
    strengths: str
    weaknesses: str
    opportunities: str
    threats: str


class PostulProject(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class PostulIdeateResponse(BaseModel):
    analysis: PostulIdeateAnalysis
    idea: str
    project: PostulProject
    created_at: datetime


# New models for voice input and analysis
class IdeaAnalysisRequest(BaseModel):
    """Request model for analyzing a transcribed idea."""
    transcribed_text: str = Field(..., min_length=10, description="Transcribed text from voice input")
    project_id: Optional[int] = Field(None, description="Optional project ID to associate the idea with")


class Source(BaseModel):
    """Source model for research references."""
    title: str = Field(..., description="Source title")
    url: str = Field(..., description="Source URL")
    checked: bool = Field(default=False, description="Whether the source has been reviewed")


class IdeaAnalysis(BaseModel):
    """Analysis model containing AI-generated insights."""
    problem_statement: str = Field(..., description="Clear problem statement")
    summary: str = Field(..., description="Summary of the idea")
    strengths: str = Field(..., description="Key strengths")
    weaknesses: str = Field(..., description="Potential weaknesses")
    opportunities: str = Field(..., description="Market opportunities")
    threats: str = Field(..., description="Competitive threats")
    actionable_items: List[str] = Field(default_factory=list, description="Actionable next steps")
    validation_priority: str = Field(default="Medium", description="Validation priority level")


class ExtendedIdeaAnalysis(IdeaAnalysis):
    """Extended analysis model with scores and sources."""
    saturation_score: float = Field(default=0, ge=0, le=10, description="Market saturation score (0-10)")
    juicy_score: float = Field(default=0, ge=0, le=10, description="Idea potential/juiciness score (0-10)")
    sources: List[Source] = Field(default_factory=list, description="Research sources and references")


class IdeaResponse(BaseModel):
    """Response model for idea analysis."""
    id: int
    user_id: str
    project_id: Optional[int]
    transcribed_text: str
    analysis: ExtendedIdeaAnalysis
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectCreateRequest(BaseModel):
    """Request model for creating a new project."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")


class ProjectResponse(BaseModel):
    """Response model for project."""
    id: int
    user_id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TikiTakaMessage(BaseModel):
    """Single message in a tiki-taka conversation."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class TikiTakaRequest(BaseModel):
    """Request model for tiki-taka conversation."""
    transcribed_text: str = Field(..., min_length=1, description="User's transcribed voice input")
    conversation_history: List[TikiTakaMessage] = Field(default_factory=list, description="Previous conversation messages for context")
    idea_context: Optional[str] = Field(None, description="Optional initial idea context if this is the start of a conversation")


class TikiTakaResponse(BaseModel):
    """Response model for tiki-taka conversation."""
    advisor_message: str = Field(..., description="Advisor's response to help user think through their idea")
    conversation_history: List[TikiTakaMessage] = Field(..., description="Updated conversation history including the new exchange")


class TTSRequest(BaseModel):
    """Request model for text-to-speech synthesis."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to convert to speech")
    inference_steps: int = Field(default=2, ge=1, le=10, description="Number of inference steps (1-10)")
    style_id: int = Field(default=0, ge=0, description="Voice style ID")
    speed: float = Field(default=1.05, ge=0.5, le=2.0, description="Speech speed multiplier")


class TTSResponse(BaseModel):
    """Response model for text-to-speech synthesis."""
    audio_base64: str = Field(..., description="Base64-encoded WAV audio data")
    text: str = Field(..., description="Original text that was synthesized")
    sample_rate: int = Field(..., description="Audio sample rate")


class PollOption(BaseModel):
    """Single poll option."""
    text: str = Field(..., min_length=1, max_length=25, description="Poll option text (max 25 characters for X/Twitter)")


class SurveyPostMessage(BaseModel):
    """Single survey post message with poll options."""
    id: str = Field(..., description="Unique identifier for the post message")
    text: str = Field(..., min_length=1, max_length=500, description="Post message text")
    poll_options: List[PollOption] = Field(..., min_length=2, max_length=4, description="Poll options (2-4 options)")


class GenerateSurveyPostsRequest(BaseModel):
    """Request model for generating survey posts."""
    idea_id: int = Field(..., description="ID of the idea to generate posts for")
    platform: Optional[str] = Field(None, description="Target platform: 'x' or 'threads'")
    count: int = Field(default=3, ge=1, le=10, description="Number of post messages to generate (1-10)")


class GenerateSurveyPostsResponse(BaseModel):
    """Response model for generated survey posts."""
    messages: List[SurveyPostMessage] = Field(..., description="List of generated survey post messages")
