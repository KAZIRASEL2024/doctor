from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Cattle Doctor Media & Triage Microservice",
        "version": "1.0.0"
    }
