from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import google.generativeai as genai
import os
from app.database import get_db
from app.schemas.profile import ProfileAnalysisCreate, PersonalityAnalysis
from app.schemas.common import SuccessResponse
from app.crud import profile_analysis as crud_profile_analysis

router = APIRouter(prefix="/profile-analysis", tags=["Profile Analysis"])

class PersonalityChatRequest(BaseModel):
    user_id: int
    message: str
    analysis_context: str

@router.post("/chat", response_model=dict)
async def personality_chat(data: PersonalityChatRequest):
    """
    Multi-agent chat system: Handles personality analysis, shopping lists, dating locations, and calendar events.
    """
    from app.services.ai_agents import get_agent_coordinator

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY environment variable not set"
        )

    try:
        # Get AI agent coordinator
        coordinator = get_agent_coordinator()

        # Prepare user context
        user_context = {
            "user_id": data.user_id,
            "analysis_context": data.analysis_context,
            "location": "Kuala Lumpur"  # Can be fetched from user profile
        }

        # Process message with agents
        result = await coordinator.process_message(
            user_message=data.message,
            conversation_history=[],
            user_context=user_context
        )

        # Return the result with agent type
        return {
            "response": result.get("response_message", ""),
            "agent_type": result.get("agent_type", "chat"),
            "data": result  # Full agent response with structured data
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )

@router.post("/{user_id}", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def create_profile_analysis(user_id: int, data: ProfileAnalysisCreate, db: Session = Depends(get_db)):
    """
    Create profile analysis data for a user.
    """
    try:
        success = crud_profile_analysis.create_profile_analysis(db, user_id, data)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile analysis data"
        )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile analysis data"
        )
    return SuccessResponse(success=True, message="Profile analysis data created successfully")

@router.post("/{user_id}/analyse", response_model=PersonalityAnalysis)
def analyse_user_personality(user_id: int, data: ProfileAnalysisCreate, db: Session = Depends(get_db)):
    """
    Analyse user's personality based on their answers.
    """
    try:
        personality = crud_profile_analysis.analyse_personality(db, user_id, data.answers)
    except ValueError as e:
        # Typically raised when GEMINI_API_KEY is not set
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyse personality"
        )
    if not personality:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyse personality"
        )
    return PersonalityAnalysis(personality=personality)

@router.get("/{user_id}", response_model=dict)
def get_profile_analysis(user_id: int, db: Session = Depends(get_db)):
    """
    Get user's profile analysis data.
    """
    voice_records = crud_profile_analysis.get_profile_analysis(db, user_id)
    if not voice_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile analysis data not found for this user"
        )
    return {"user_id": user_id, "records": voice_records}