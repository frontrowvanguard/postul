from openai import AsyncOpenAI
from typing import Dict, Any
import logging
import json

from config import settings

logger = logging.getLogger(__name__)


class AIService:
    """Service for OpenAI integration and AI-powered analysis generation."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
    
    async def analyze_idea(self, transcribed_text: str) -> Dict[str, Any]:
        """
        Generate AI analysis for a startup idea.
        
        Args:
            transcribed_text: The transcribed text from voice input
            
        Returns:
            Dictionary containing analysis with problem statement, strengths,
            weaknesses, opportunities, threats, and actionable items
        """
        prompt = self._build_analysis_prompt(transcribed_text)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert startup advisor and innovation consultant. "
                                 "Your role is to help aspiring entrepreneurs validate their startup ideas "
                                 "by providing clear, actionable feedback and analysis. "
                                 "Focus on problem validation, market clarity, and practical next steps."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"} if self.model.startswith("gpt-4") else None,
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON response
            try:
                analysis = json.loads(content)
            except json.JSONDecodeError:
                # Fallback: try to extract structured data from text response
                analysis = self._parse_text_response(content)
            
            # Ensure all required fields are present
            analysis = self._normalize_analysis(analysis)
            
            logger.info(f"Successfully generated analysis for idea (length: {len(transcribed_text)})")
            return analysis
            
        except Exception as e:
            logger.error(f"Error generating AI analysis: {e}")
            # Return a fallback analysis structure
            return self._get_fallback_analysis(transcribed_text)
    
    def _build_analysis_prompt(self, transcribed_text: str) -> str:
        """Build the prompt for AI analysis."""
        return f"""Analyze the following startup idea and provide a comprehensive analysis:

Idea: {transcribed_text}

Please provide your analysis in the following JSON format:
{{
    "problem_statement": "A clear, research-backed problem statement that the idea addresses",
    "summary": "A brief summary of the idea and its core value proposition",
    "strengths": "Key strengths and potential advantages of this idea",
    "weaknesses": "Potential weaknesses, risks, or challenges",
    "opportunities": "Market opportunities and growth potential",
    "threats": "Competitive threats and market risks",
    "actionable_items": [
        "Specific, actionable step 1 to validate this idea",
        "Specific, actionable step 2 to validate this idea",
        "Specific, actionable step 3 to validate this idea"
    ],
    "validation_priority": "High/Medium/Low - priority for validation based on idea clarity and market potential"
}}

Focus on:
1. Problem clarity and validation needs
2. Market opportunity assessment
3. Practical next steps for validation
4. Critical assumptions that need testing

Be constructive, specific, and actionable in your feedback."""

    def _parse_text_response(self, content: str) -> Dict[str, Any]:
        """Parse text response when JSON parsing fails."""
        # Simple fallback parser - extract sections from text
        analysis = {
            "problem_statement": "",
            "summary": content[:500] if len(content) > 500 else content,
            "strengths": "",
            "weaknesses": "",
            "opportunities": "",
            "threats": "",
            "actionable_items": [],
            "validation_priority": "Medium"
        }
        return analysis
    
    def _normalize_analysis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure analysis has all required fields with defaults."""
        return {
            "problem_statement": analysis.get("problem_statement", ""),
            "summary": analysis.get("summary", ""),
            "strengths": analysis.get("strengths", ""),
            "weaknesses": analysis.get("weaknesses", ""),
            "opportunities": analysis.get("opportunities", ""),
            "threats": analysis.get("threats", ""),
            "actionable_items": analysis.get("actionable_items", []),
            "validation_priority": analysis.get("validation_priority", "Medium")
        }
    
    def _get_fallback_analysis(self, transcribed_text: str) -> Dict[str, Any]:
        """Return a fallback analysis when AI service fails."""
        return {
            "problem_statement": "Unable to generate problem statement. Please try again.",
            "summary": f"Analysis for: {transcribed_text[:200]}...",
            "strengths": "Analysis temporarily unavailable",
            "weaknesses": "Analysis temporarily unavailable",
            "opportunities": "Analysis temporarily unavailable",
            "threats": "Analysis temporarily unavailable",
            "actionable_items": [
                "Review and refine your idea statement",
                "Try submitting your idea again",
                "Consider breaking down your idea into smaller components"
            ],
            "validation_priority": "Medium"
        }


# Singleton instance
ai_service = AIService()

