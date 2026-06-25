# app/routes/__init__.py
from .users import router as users_router
from .profiles import router as profiles_router
from .messages import router as messages_router
from .matches import router as matches_router
from .common import router as common_router
from .likes import router as likes_router
from .payment import router as payment_router
from .ai import router as ai_router
from .profile_analysis import router as profile_analysis_router
from .advice import router as advice_router # <--- NEW: Import the advice router
from .compatibility import router as compatibility_router

__all__ = [
    "users_router",
    "profiles_router",
    "messages_router",
    "matches_router",
    "common_router",
    "likes_router",
    "payment_router", # <--- NEW: Add to __all__
    "profile_analysis_router",
    "advice_router",
    "ai_router",
    "compatibility_router"
]