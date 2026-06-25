import json
from typing import Optional

from sqlalchemy.orm import Session

# Import the SQLAlchemy model
from app.models import UserPreferences
# Import the Pydantic schemas (for type hinting)
from app.schemas.preference import UserPreferenceCreate, UserPreferenceResponse

def upsert_user_preferences(
    db: Session, preference_data: UserPreferenceCreate
) -> UserPreferences:
    """
    Creates or updates a user's preference record.
    The complex 'filter_by' data is stored as a JSON string.
    """
    user_id = preference_data.user_id
    
    # 1. Convert complex filter_by Pydantic model to a reliable JSON string
    # We use model_dump() -> dict first, then json.dumps() to ensure proper quoting for the database.
    filter_by_json = json.dumps(preference_data.filter_by.model_dump())

    # Data structure for saving/updating
    preference_dict = {
        "min_age": preference_data.min_age,
        "max_age": preference_data.max_age,
        "prefers_verified_only": preference_data.prefers_verified_only,
        "filter_by": filter_by_json, # The JSON string
    }

    # Check if a record already exists
    existing_prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()

    if existing_prefs:
        # Update existing record
        for key, value in preference_dict.items():
            setattr(existing_prefs, key, value)
        db.commit()
        db.refresh(existing_prefs)
        updated_prefs = existing_prefs
    else:
        # Create new record (Ensuring we link the user_id)
        db_prefs = UserPreferences(user_id=user_id, **preference_dict)
        db.add(db_prefs)
        db.commit()
        db.refresh(db_prefs)
        updated_prefs = db_prefs

    # After save/update, prepare the response by deserializing filter_by back into a dict
    # This prepares the data to match the UserPreferenceResponse schema
    if updated_prefs.filter_by:
        updated_prefs.filter_by = json.loads(updated_prefs.filter_by)
        
    return updated_prefs

def get_user_preferences(db: Session, user_id: int) -> Optional[UserPreferenceResponse]:
    """Retrieves user preferences and deserializes the filter_by JSON."""
    db_prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    
    if db_prefs:
        # Deserialize the JSON string back into a Python dictionary for the response
        if db_prefs.filter_by:
            db_prefs.filter_by = json.loads(db_prefs.filter_by)
        else:
            db_prefs.filter_by = {}
        
        return db_prefs
        
    return None
