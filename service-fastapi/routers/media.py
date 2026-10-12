from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from pydantic import BaseModel
from services.audio_analyzer import AudioAnalyzer
from services.image_analyzer import ImageAnalyzer

router = APIRouter(prefix="/api/v1/media", tags=["Bovine Media Analysis"])

class CaseAnalysisRequest(BaseModel):
    symptoms_text: str
    cow_weight_kg: float
    cow_size: str
    problem_duration_days: int = 1
    audio_risk_score: Optional[float] = 0.0
    visual_risk_score: Optional[float] = 0.0

@router.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    """
    Analyzes uploaded bovine audio recording (breathing, coughing, vocalization).
    """
    try:
        content = await file.read()
        analysis = AudioAnalyzer.analyze_audio_bytes(
            file_bytes=content,
            filename=file.filename or "recording.wav",
            mime_type=file.content_type or "audio/wav"
        )
        return {
            "success": True,
            "filename": file.filename,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@router.post("/process-image")
async def process_image(file: UploadFile = File(...)):
    """
    Analyzes uploaded bovine photo (lesion, posture, skin, eyes, udder).
    """
    try:
        content = await file.read()
        analysis = ImageAnalyzer.analyze_image_bytes(
            file_bytes=content,
            filename=file.filename or "cow_image.jpg",
            mime_type=file.content_type or "image/jpeg"
        )
        return {
            "success": True,
            "filename": file.filename,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@router.post("/analyze-case")
async def analyze_full_case(
    symptoms_text: str = Form(...),
    cow_weight_kg: float = Form(...),
    cow_size: str = Form(...),
    problem_duration_days: int = Form(1),
    audio_file: Optional[UploadFile] = File(None),
    image_file: Optional[UploadFile] = File(None)
):
    """
    Holistic analysis endpoint: Evaluates cow symptoms, size, weight,
    picture, and audio to provide an automated pre-assessment for the doctor.
    """
    audio_analysis = None
    image_analysis = None
    flags = []

    # 1. Analyze Audio if provided
    if audio_file:
        audio_bytes = await audio_file.read()
        audio_analysis = AudioAnalyzer.analyze_audio_bytes(
            audio_bytes, audio_file.filename or "cow.wav", audio_file.content_type or "audio/wav"
        )
        flags.extend(audio_analysis.get("bovine_triage_flags", []))

    # 2. Analyze Image if provided
    if image_file:
        img_bytes = await image_file.read()
        image_analysis = ImageAnalyzer.analyze_image_bytes(
            img_bytes, image_file.filename or "cow.jpg", image_file.content_type or "image/jpeg"
        )
        flags.extend(image_analysis.get("bovine_triage_flags", []))

    # 3. Analyze Text Symptoms for emergency keywords
    symptoms_lower = symptoms_text.lower()
    urgent_keywords = ["downer", "cannot stand", "bloat", "severe bleeding", "frothing", "collapse", "choking", "104", "105"]
    warning_keywords = ["fever", "cough", "not eating", "off feed", "diarrhea", "mastitis", "limping", "swelling", "discharge"]

    keyword_risk = 0.2
    if any(k in symptoms_lower for k in urgent_keywords):
        keyword_risk = 0.95
        flags.append("Urgent emergency keywords detected in symptoms description")
    elif any(k in symptoms_lower for k in warning_keywords):
        keyword_risk = 0.65
        flags.append("Moderate illness indicators present in reported symptoms")

    # 4. Weight & Size check
    # Typical adult dairy cow: 400 - 750 kg
    if cow_weight_kg < 50:
        flags.append("Very low body weight (< 50kg, likely neonate calf requiring specialized dosing)")
    elif cow_weight_kg > 900:
        flags.append("Exceptionally large bovine weight (> 900kg, requires dosage calibration)")

    # 5. Composite Risk Score & Priority
    audio_risk = audio_analysis.get("respiratory_risk_score", 0.2) if audio_analysis else 0.2
    image_risk = image_analysis.get("visual_risk_score", 0.2) if image_analysis else 0.2

    composite_score = round((0.45 * keyword_risk) + (0.30 * audio_risk) + (0.25 * image_risk), 2)

    if composite_score >= 0.75:
        priority = "EMERGENCY"
    elif composite_score >= 0.50:
        priority = "HIGH"
    else:
        priority = "NORMAL"

    summary_note = (
        f"Automated Triage: Priority {priority} (Risk score {composite_score}). "
        f"Identified {len(flags)} observation flags. "
        f"Cow weight: {cow_weight_kg}kg ({cow_size}). "
        f"Consultation queued for assigned Zone Veterinarian review."
    )

    return {
        "success": True,
        "composite_risk_score": composite_score,
        "recommended_priority": priority,
        "summary": summary_note,
        "triage_flags": flags,
        "audio_analysis": audio_analysis,
        "image_analysis": image_analysis
    }
