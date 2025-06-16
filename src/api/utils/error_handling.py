# src/api/utils/error_handling.py

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class APIError(HTTPException):
    """Custom API error class with additional metadata"""
    def __init__(
        self, 
        status_code: int, 
        detail: str, 
        error_code: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code or f"ERROR_{status_code}"
        self.extra = extra or {}

async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handler for API errors"""
    # Log the error
    logger.error(
        f"API Error: {exc.error_code} - {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_code": exc.error_code,
            **exc.extra
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "status": exc.status_code,
                **(exc.extra if exc.extra else {})
            }
        }
    )