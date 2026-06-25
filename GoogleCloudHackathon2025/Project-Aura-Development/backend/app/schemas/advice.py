"""
File: advice.py
Author: Christian Lew
Date: November 20, 2025
Description: Pydantic schemas for relationship advice endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class AdviceRequest(BaseModel):
    """Request schema for getting relationship advice."""

    question: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="The relationship question or situation to get advice about",
        examples=["How can I improve communication with my partner?"]
    )

    class Config:
        json_schema_extra = {
            "example": {
                "question": "How can I improve communication with my partner when we disagree?"
            }
        }


class SourceDocument(BaseModel):
    """Schema for source document information."""

    content: str = Field(
        ...,
        description="Excerpt from the source document"
    )
    metadata: dict = Field(
        default_factory=dict,
        description="Metadata about the source document (page, file, etc.)"
    )


class AdviceResponse(BaseModel):
    """Response schema for relationship advice."""

    answer: str = Field(
        ...,
        description="The relationship advice answer"
    )
    sources: List[SourceDocument] = Field(
        default_factory=list,
        description="Source documents used to generate the answer"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if something went wrong"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "answer": "Improving communication with your partner involves active listening, expressing your feelings clearly, and showing empathy...",
                "sources": [
                    {
                        "content": "Active listening is the foundation of healthy communication...",
                        "metadata": {
                            "source": "relationship_book.pdf",
                            "page": 42
                        }
                    }
                ],
                "error": None
            }
        }


class AddDocumentRequest(BaseModel):
    """Request schema for adding a new document to the knowledge base."""

    pdf_path: str = Field(
        ...,
        description="Path to the PDF file to add to the knowledge base"
    )


class AddDocumentResponse(BaseModel):
    """Response schema for adding a document."""

    success: bool = Field(
        ...,
        description="Whether the document was added successfully"
    )
    message: str = Field(
        ...,
        description="Status message"
    )
