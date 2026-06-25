from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import httpx

router = APIRouter(prefix="/common", tags=["Common"])

# A simple in-memory cache for proxied images
# In a production environment, consider using Redis or a more robust caching solution.
IMAGE_CACHE = {}

@router.get("/proxy-image")
async def proxy_image(url: str):
    """
    Proxies an external image URL to bypass Content Security Policy (CSP) issues.
    It fetches an image from the given URL and streams it back to the client.
    Includes a simple in-memory cache to reduce redundant fetches.
    """
    if not url:
        raise HTTPException(status_code=400, detail="URL parameter is required")

    # Check cache first
    if url in IMAGE_CACHE:
        cached_image = IMAGE_CACHE[url]
        return StreamingResponse(iter([cached_image['content']]), media_type=cached_image['media_type'])

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes

            content = await response.aread()
            media_type = response.headers.get("Content-Type", "image/jpeg")

            # Cache the image content and media type
            if len(IMAGE_CACHE) > 100: # Simple cache eviction
                IMAGE_CACHE.pop(next(iter(IMAGE_CACHE)))
            
            IMAGE_CACHE[url] = {'content': content, 'media_type': media_type}

            return StreamingResponse(iter([content]), media_type=media_type)

        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch image: {e}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"An error occurred while requesting the image: {e}")
