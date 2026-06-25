"""
File: advice.py
Author: Christian Lew
Date: November 20, 2025
Description: API routes for relationship advice using RAG.
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.advice import (
    AdviceRequest,
    AdviceResponse,
    SourceDocument,
    AddDocumentRequest,
    AddDocumentResponse
)
from app.services.relationship_advice_service import get_advice_service

router = APIRouter(prefix="/api/v1/advice", tags=["Relationship Advice"])


@router.post("/", response_model=AdviceResponse, status_code=status.HTTP_200_OK)
def get_relationship_advice(request: AdviceRequest):
    """
    Get relationship advice based on a user's question.

    This endpoint uses RAG (Retrieval-Augmented Generation) to provide advice
    based on relationship books and expert knowledge.

    Args:
        request: AdviceRequest containing the user's question

    Returns:
        AdviceResponse with the answer and source information
    """
    try:
        # Get the advice service instance
        advice_service = get_advice_service()

        # Get advice for the question
        result = advice_service.get_advice(request.question)

        # Convert sources to SourceDocument schema
        sources = [
            SourceDocument(
                content=source["content"],
                metadata=source["metadata"]
            )
            for source in result["sources"]
        ]

        return AdviceResponse(
            answer=result["answer"],
            sources=sources,
            error=result.get("error")
        )

    except ValueError as e:
        # This typically happens when GOOGLE_API_KEY is not set
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Advice service not available: {str(e)}"
        )
    except Exception as e:
        # Generic error handling
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationship advice: {str(e)}"
        )


@router.post("/add-document", response_model=AddDocumentResponse, status_code=status.HTTP_200_OK)
def add_document_to_knowledge_base(request: AddDocumentRequest):
    """
    Add a new PDF document to the relationship advice knowledge base.

    This endpoint allows administrators to expand the knowledge base by adding
    new relationship books or resources.

    Args:
        request: AddDocumentRequest with the path to the PDF file

    Returns:
        AddDocumentResponse indicating success or failure
    """
    try:
        # Get the advice service instance
        advice_service = get_advice_service()

        # Add the document
        success = advice_service.add_document(request.pdf_path)

        if success:
            return AddDocumentResponse(
                success=True,
                message=f"Document successfully added to knowledge base: {request.pdf_path}"
            )
        else:
            return AddDocumentResponse(
                success=False,
                message=f"Failed to add document: {request.pdf_path}"
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Advice service not available: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add document: {str(e)}"
        )


@router.get("/health", status_code=status.HTTP_200_OK)
def check_advice_service_health():
    """
    Check if the advice service is healthy and ready to serve requests.

    Returns:
        Status information about the advice service
    """
    try:
        advice_service = get_advice_service()

        # Check if vector store is initialized
        has_vector_store = advice_service.vector_store is not None
        has_qa_chain = advice_service.qa_chain is not None

        return {
            "status": "healthy" if (has_vector_store and has_qa_chain) else "initializing",
            "vector_store_initialized": has_vector_store,
            "qa_chain_initialized": has_qa_chain,
            "data_directory": str(advice_service.data_dir),
            "vector_store_path": str(advice_service.vector_store_path)
        }

    except ValueError as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "GOOGLE_API_KEY not configured"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
