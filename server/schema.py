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


class IdeaResponse(BaseModel):
    """Response model for idea analysis."""
    id: int
    user_id: str
    project_id: Optional[int]
    transcribed_text: str
    analysis: IdeaAnalysis
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


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
