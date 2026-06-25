"""
Profile Completion Calculator

This module provides functions to calculate the profile completion rate
for users, matching the logic used in the frontend EditProfile.jsx component.

The completion rate is used to sort profiles in the Discover feature,
showing more complete profiles first (descending order).

Total: 20 points = 100%
"""

from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import Profile, User, ProfilePicture, UserPrompt


# Photo slot categories (excluding 'profile' which is counted separately)
PHOTO_SLOT_CATEGORIES = ['bestSelfie', 'activity', 'travel', 'withPets', 'myLife']


def calculate_profile_completion(
    profile: "Profile",
    user: "User",
    profile_pictures: List["ProfilePicture"],
    user_prompts: List["UserPrompt"]
) -> int:
    """
    Calculate profile completion rate (0-100).

    This matches the logic in frontend/src/components/Main/EditProfile.jsx
    for consistency between what users see when editing their profile
    and how profiles are sorted in the Discover feature.

    Scoring breakdown (20 points total):
    - Profile picture: 1 point
    - Photo slots (bestSelfie, activity, travel, withPets, myLife): 5 points (1 each)
    - About Me: 1 point
    - Interests: 1 point (if any selected)
    - Relationship status: 1 point
    - Editable fields (7 total):
        - Come From (location): 1 point
        - Speaking (languages): 1 point
        - Height: 1 point
        - Zodiac: 1 point
        - Education (degree): 1 point
        - Employment (work): 1 point
        - Industry: 1 point
    - Prompts: Up to 3 points (1 per prompt)
    - My Goal: 1 point

    Args:
        profile: The Profile model instance
        user: The User model instance (for user-level data)
        profile_pictures: List of ProfilePicture instances for this user
        user_prompts: List of UserPrompt instances for this user

    Returns:
        int: Completion percentage (0-100)
    """
    completed = 0
    total = 20

    # Build a set of categories that have pictures
    picture_categories = {pic.category for pic in profile_pictures if pic.category}

    # 1. Profile picture (1 point)
    if 'profile' in picture_categories:
        completed += 1

    # 2. Photo slots: bestSelfie, activity, travel, withPets, myLife (5 points)
    for category in PHOTO_SLOT_CATEGORIES:
        if category in picture_categories:
            completed += 1

    # 3. About Me (1 point)
    if profile.about_me and profile.about_me.strip():
        completed += 1

    # 4. Interests (1 point) - check if profile has any interests
    if profile.interests and len(profile.interests) > 0:
        completed += 1

    # 5. Relationship status (1 point)
    if profile.relationship_id:
        completed += 1

    # 6. Editable fields (7 points)

    # Come From / Location (1 point)
    if profile.come_from and profile.come_from.strip():
        completed += 1

    # Speaking / Languages (1 point) - check if profile has any languages
    if profile.languages_selected and len(profile.languages_selected) > 0:
        completed += 1

    # Height (1 point)
    if profile.height_cm is not None and profile.height_cm > 0:
        completed += 1

    # Zodiac (1 point)
    if profile.zodiac and profile.zodiac.strip():
        completed += 1

    # Education/Degree (1 point)
    if profile.education_id:
        completed += 1

    # Employment/Work (1 point)
    if profile.employment_id:
        completed += 1

    # Industry (1 point)
    if profile.industry_id:
        completed += 1

    # 7. Prompts (up to 3 points, 1 per prompt)
    prompt_count = len(user_prompts) if user_prompts else 0
    completed += min(prompt_count, 3)

    # 8. My Goal (1 point)
    if profile.my_goal_id:
        completed += 1

    # Calculate percentage
    return round((completed / total) * 100)


def get_completion_breakdown(
    profile: "Profile",
    user: "User",
    profile_pictures: List["ProfilePicture"],
    user_prompts: List["UserPrompt"]
) -> dict:
    """
    Get a detailed breakdown of profile completion for debugging/display.

    Returns:
        dict: Breakdown of which fields are complete and the total score
    """
    picture_categories = {pic.category for pic in profile_pictures if pic.category}

    breakdown = {
        "profile_picture": 'profile' in picture_categories,
        "photo_slots": {
            cat: cat in picture_categories
            for cat in PHOTO_SLOT_CATEGORIES
        },
        "about_me": bool(profile.about_me and profile.about_me.strip()),
        "interests": bool(profile.interests and len(profile.interests) > 0),
        "relationship_status": bool(profile.relationship_id),
        "come_from": bool(profile.come_from and profile.come_from.strip()),
        "languages": bool(profile.languages_selected and len(profile.languages_selected) > 0),
        "height": bool(profile.height_cm is not None and profile.height_cm > 0),
        "zodiac": bool(profile.zodiac and profile.zodiac.strip()),
        "education": bool(profile.education_id),
        "employment": bool(profile.employment_id),
        "industry": bool(profile.industry_id),
        "prompts_count": len(user_prompts) if user_prompts else 0,
        "my_goal": bool(profile.my_goal_id),
    }

    # Calculate score
    score = 0
    if breakdown["profile_picture"]: score += 1
    score += sum(1 for v in breakdown["photo_slots"].values() if v)
    if breakdown["about_me"]: score += 1
    if breakdown["interests"]: score += 1
    if breakdown["relationship_status"]: score += 1
    if breakdown["come_from"]: score += 1
    if breakdown["languages"]: score += 1
    if breakdown["height"]: score += 1
    if breakdown["zodiac"]: score += 1
    if breakdown["education"]: score += 1
    if breakdown["employment"]: score += 1
    if breakdown["industry"]: score += 1
    score += min(breakdown["prompts_count"], 3)
    if breakdown["my_goal"]: score += 1

    breakdown["total_score"] = score
    breakdown["total_possible"] = 20
    breakdown["percentage"] = round((score / 20) * 100)

    return breakdown
