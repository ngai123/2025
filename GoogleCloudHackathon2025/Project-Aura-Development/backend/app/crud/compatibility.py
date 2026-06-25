"""
File: compatibility.py
Description: CRUD operations for profile compatibility analysis using Gemini AI.

Performance optimizations:
- Singleton model instance (gemini-2.5-flash for speed)
- Compatibility caching with 10-minute TTL
- Parallel profile data fetching
"""

import os
import time
import asyncio
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from app.models import Profile, User, ProfileInterest, Interest, Goal, ProfileAnalysis
from app.schemas.compatibility import CompatibilityResponse
import google.generativeai as genai

# Configure Gemini API
_api_key = os.environ.get("GEMINI_API_KEY")
if _api_key:
    genai.configure(api_key=_api_key)

# ============= SINGLETON MODEL INSTANCE =============
# Using Flash model for speed - sufficient for simple compatibility text generation
_compatibility_model: Optional[genai.GenerativeModel] = None


def get_compatibility_model() -> genai.GenerativeModel:
    """Get or create the shared Gemini Flash model instance (singleton pattern)"""
    global _compatibility_model
    if _compatibility_model is None:
        # Flash model is 3-5x faster and sufficient for 2-3 sentence summaries
        _compatibility_model = genai.GenerativeModel('gemini-2.5-flash')
    return _compatibility_model


# ============= COMPATIBILITY CACHE =============
# Cache compatibility results to avoid repeated AI calls for same user pairs
_compatibility_cache: Dict[Tuple[int, int], Tuple[CompatibilityResponse, float]] = {}
_CACHE_TTL_SECONDS = 600  # 10 minutes


def get_cached_compatibility(current_user_id: int, target_user_id: int) -> Optional[CompatibilityResponse]:
    """Get cached compatibility result if not expired"""
    cache_key = (current_user_id, target_user_id)
    if cache_key in _compatibility_cache:
        result, cached_at = _compatibility_cache[cache_key]
        if time.time() - cached_at < _CACHE_TTL_SECONDS:
            return result
        # Expired, remove from cache
        del _compatibility_cache[cache_key]
    return None


def set_cached_compatibility(current_user_id: int, target_user_id: int, result: CompatibilityResponse) -> None:
    """Cache compatibility result with timestamp"""
    cache_key = (current_user_id, target_user_id)
    _compatibility_cache[cache_key] = (result, time.time())


def get_profile_data(db: Session, user_id: int) -> dict:
    """
    Fetch profile data for a user including interests, goal, and personality analysis.

    Args:
        db: Database session
        user_id: User ID to fetch profile for

    Returns:
        Dictionary containing profile data
    """
    # Query profile with related data
    profile = db.query(Profile).options(
        joinedload(Profile.interests).joinedload(ProfileInterest.interest),
        joinedload(Profile.my_goal),
        joinedload(Profile.user)
    ).filter(Profile.user_id == user_id).first()

    if not profile:
        return None

    # Get user's full name
    user = profile.user

    # Get interests as list of names
    interests = [pi.interest.name for pi in profile.interests if pi.interest]

    # Get goal name
    goal_name = profile.my_goal.name if profile.my_goal else None

    # Get personality analysis if available
    personality_analysis = db.query(ProfileAnalysis).filter(
        ProfileAnalysis.user_id == user_id
    ).first()
    personality = personality_analysis.characteristic_json if personality_analysis else None

    return {
        "user_id": user_id,
        "first_name": profile.first_name,
        "full_name": user.full_name if user else f"{profile.first_name} {profile.last_name}",
        "interests": interests,
        "goal": goal_name,
        "about_me": profile.about_me,
        "zodiac": profile.zodiac,
        "location": profile.come_from,
        "personality": personality
    }


def find_shared_interests(profile1: dict, profile2: dict) -> list:
    """
    Find interests that both profiles share.

    Args:
        profile1: First profile data dict
        profile2: Second profile data dict

    Returns:
        List of shared interest names
    """
    interests1 = set(profile1.get("interests", []))
    interests2 = set(profile2.get("interests", []))
    return list(interests1.intersection(interests2))


def generate_compatibility_summary(
    current_profile: dict,
    target_profile: dict,
    shared_interests: list
) -> tuple[str, list]:
    """
    Generate AI-powered compatibility summary using Gemini.

    Args:
        current_profile: Current user's profile data
        target_profile: Target user's profile data
        shared_interests: List of shared interest names

    Returns:
        Tuple of (summary string, compatibility highlights list)
    """
    # Check if API key is configured (done at module level)
    if not _api_key:
        # Return a basic summary without AI
        return _generate_basic_summary(current_profile, target_profile, shared_interests)

    # Build the prompt
    prompt = f"""You are a friendly dating app assistant. Generate a brief, positive compatibility insight between two users.

## Current User Profile:
- Name: {current_profile.get('first_name', 'User')}
- Interests: {', '.join(current_profile.get('interests', [])) or 'Not specified'}
- Relationship Goal: {current_profile.get('goal') or 'Not specified'}
- About: {current_profile.get('about_me') or 'Not specified'}

## Profile Being Viewed:
- Name: {target_profile.get('first_name', 'This person')}
- Interests: {', '.join(target_profile.get('interests', [])) or 'Not specified'}
- Relationship Goal: {target_profile.get('goal') or 'Not specified'}
- About: {target_profile.get('about_me') or 'Not specified'}
- Location: {target_profile.get('location') or 'Not specified'}

## Shared Interests: {', '.join(shared_interests) if shared_interests else 'None found yet'}

## Task:
Write a SHORT, friendly compatibility insight (2-3 sentences max) that:
1. Highlights what they have in common (shared interests, similar goals, etc.)
2. Is encouraging and positive without being over-the-top
3. Uses the target user's first name naturally
4. If there are no shared interests, focus on other potential connections or be optimistic

Also provide 2-3 short compatibility highlights as bullet points (5-8 words each).

## Format your response EXACTLY like this:
SUMMARY: [Your 2-3 sentence summary here]
HIGHLIGHTS:
- [First highlight]
- [Second highlight]
- [Third highlight if applicable]
"""

    try:
        model = get_compatibility_model()  # Use singleton Flash model
        response = model.generate_content(prompt)
        response_text = response.text

        # Parse the response
        summary = ""
        highlights = []

        lines = response_text.strip().split('\n')
        parsing_highlights = False

        for line in lines:
            line = line.strip()
            if line.startswith('SUMMARY:'):
                summary = line.replace('SUMMARY:', '').strip()
            elif line.startswith('HIGHLIGHTS:'):
                parsing_highlights = True
            elif parsing_highlights and line.startswith('-'):
                highlight = line.lstrip('- ').strip()
                if highlight:
                    highlights.append(highlight)

        # Fallback if parsing fails
        if not summary:
            summary = response_text.split('\n')[0][:200]
        if not highlights:
            highlights = ["Potential connection to explore"]

        return summary, highlights[:3]  # Max 3 highlights

    except Exception as e:
        print(f"[Compatibility] Gemini API error: {e}")
        return _generate_basic_summary(current_profile, target_profile, shared_interests)


def _generate_basic_summary(
    current_profile: dict,
    target_profile: dict,
    shared_interests: list
) -> tuple[str, list]:
    """
    Generate a basic summary without AI when API is unavailable.
    """
    target_name = target_profile.get('first_name', 'This person')
    highlights = []

    if shared_interests:
        interest_str = ', '.join(shared_interests[:3])
        summary = f"You and {target_name} both share an interest in {interest_str}!"
        highlights.append(f"Shared love for {shared_interests[0]}")
    else:
        summary = f"Discover what you might have in common with {target_name}."

    # Check for same goal
    if current_profile.get('goal') and current_profile.get('goal') == target_profile.get('goal'):
        goal = current_profile.get('goal')
        summary += f" You're both looking for {goal.lower()}."
        highlights.append(f"Same relationship goal: {goal}")

    if not highlights:
        highlights = ["New connection to explore"]

    return summary, highlights


def get_compatibility_analysis(
    db: Session,
    current_user_id: int,
    target_user_id: int
) -> CompatibilityResponse:
    """
    Get compatibility analysis between two users.

    Performance optimizations:
    - Check cache first (10-minute TTL)
    - Parallel profile fetching when cache miss

    Args:
        db: Database session
        current_user_id: ID of the user viewing the profile
        target_user_id: ID of the profile being viewed

    Returns:
        CompatibilityResponse with summary and shared interests
    """
    start_time = time.time()

    # ============= CHECK CACHE FIRST =============
    cached_result = get_cached_compatibility(current_user_id, target_user_id)
    if cached_result:
        print(f"[Compatibility] Cache hit for ({current_user_id}, {target_user_id})")
        return cached_result

    # ============= FETCH BOTH PROFILES =============
    # Note: For sync context, we fetch sequentially but efficiently with joinedload
    current_profile = get_profile_data(db, current_user_id)
    target_profile = get_profile_data(db, target_user_id)

    db_time = time.time() - start_time
    print(f"[Compatibility] Profile data fetched in {db_time:.2f}s")

    if not current_profile or not target_profile:
        return CompatibilityResponse(
            summary="Unable to generate compatibility insights at this time.",
            shared_interests=[],
            compatibility_highlights=["Profile data unavailable"],
            same_goal=False
        )

    # Find shared interests
    shared_interests = find_shared_interests(current_profile, target_profile)

    # Check if same goal
    same_goal = (
        current_profile.get('goal') is not None and
        current_profile.get('goal') == target_profile.get('goal')
    )

    # Generate AI summary (using Flash model via singleton)
    ai_start = time.time()
    summary, highlights = generate_compatibility_summary(
        current_profile,
        target_profile,
        shared_interests
    )
    ai_time = time.time() - ai_start
    print(f"[Compatibility] AI summary generated in {ai_time:.2f}s")

    result = CompatibilityResponse(
        summary=summary,
        shared_interests=shared_interests,
        compatibility_highlights=highlights,
        same_goal=same_goal
    )

    # ============= CACHE THE RESULT =============
    set_cached_compatibility(current_user_id, target_user_id, result)

    total_time = time.time() - start_time
    print(f"[Compatibility] Total time: {total_time:.2f}s (cached for 10 min)")

    return result


async def get_compatibility_analysis_async(
    db: Session,
    current_user_id: int,
    target_user_id: int
) -> CompatibilityResponse:
    """
    Async version with parallel profile fetching for use in async endpoints.

    Args:
        db: Database session
        current_user_id: ID of the user viewing the profile
        target_user_id: ID of the profile being viewed

    Returns:
        CompatibilityResponse with summary and shared interests
    """
    start_time = time.time()

    # Check cache first
    cached_result = get_cached_compatibility(current_user_id, target_user_id)
    if cached_result:
        print(f"[Compatibility] Cache hit for ({current_user_id}, {target_user_id})")
        return cached_result

    # Fetch both profiles in parallel
    async def fetch_current():
        return await asyncio.to_thread(get_profile_data, db, current_user_id)

    async def fetch_target():
        return await asyncio.to_thread(get_profile_data, db, target_user_id)

    current_profile, target_profile = await asyncio.gather(
        fetch_current(),
        fetch_target()
    )

    db_time = time.time() - start_time
    print(f"[Compatibility] Parallel profile fetch in {db_time:.2f}s")

    if not current_profile or not target_profile:
        return CompatibilityResponse(
            summary="Unable to generate compatibility insights at this time.",
            shared_interests=[],
            compatibility_highlights=["Profile data unavailable"],
            same_goal=False
        )

    # Find shared interests
    shared_interests = find_shared_interests(current_profile, target_profile)

    # Check if same goal
    same_goal = (
        current_profile.get('goal') is not None and
        current_profile.get('goal') == target_profile.get('goal')
    )

    # Generate AI summary
    ai_start = time.time()
    summary, highlights = await asyncio.to_thread(
        generate_compatibility_summary,
        current_profile,
        target_profile,
        shared_interests
    )
    ai_time = time.time() - ai_start
    print(f"[Compatibility] AI summary generated in {ai_time:.2f}s")

    result = CompatibilityResponse(
        summary=summary,
        shared_interests=shared_interests,
        compatibility_highlights=highlights,
        same_goal=same_goal
    )

    # Cache the result
    set_cached_compatibility(current_user_id, target_user_id, result)

    total_time = time.time() - start_time
    print(f"[Compatibility] Total async time: {total_time:.2f}s")

    return result
