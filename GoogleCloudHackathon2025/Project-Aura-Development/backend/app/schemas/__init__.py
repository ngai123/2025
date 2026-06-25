from .user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserLogin,
    PasswordChange
)
from .profile import (
ProfileCreate, ProfileUpdate, ProfileFullResponse, # Changed ProfileResponse to ProfileFullResponse
ProfilePictureResponse, ProfilePictureUpload, # Changed ProfilePictureCreate to ProfilePictureUpload
EmergencyContactCreate, EmergencyContactResponse,
UserPreferencesUpdate, UserPreferencesResponse,
UserPromptItem, # Changed UserPromptCreate, UserPromptUpdate, UserPromptResponse to UserPromptItem
LoveStyleCreate, LoveStyleUpdate, LoveStyleResponse
)
from .message import (
    ChatSessionCreate,
    ChatSessionResponse,
    MessageCreate,
    MessageUpdate,
    MessageResponse,
    MessageAttachmentCreate,
    MessageAttachmentResponse
)
from .match import (
    LikeDislikeCreate,
    LikeDislikeResponse,
    MatchResponse
)
from .common import (
    InterestCreate,
    InterestResponse,
    LanguageCreate,
    LanguageResponse,
    PromptCreate,
    PromptResponse,
    SuccessResponse
)
from .advice import (
    AdviceRequest,
    AdviceResponse,
    SourceDocument,
    AddDocumentRequest,
    AddDocumentResponse
)

__all__ = [
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserLogin",
    "PasswordChange",
    "ProfileCreate",
    "ProfileUpdate",
    "ProfileFullResponse",
    "MessageCreate",
    "MessageResponse",
    "LikeDislikeCreate",
    "SuccessResponse",
    "AdviceRequest",
    "AdviceResponse",
    "SourceDocument",
    "AddDocumentRequest",
    "AddDocumentResponse",
]