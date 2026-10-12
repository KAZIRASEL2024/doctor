import io
import os
from typing import Dict, Any
from PIL import Image

class ImageAnalyzer:
    """
    Veterinary Cattle Image Analyzer.
    Validates resolution, format, color balance, and screens for potential
    lesions, redness, or skin/mucosal inflammation.
    """

    @staticmethod
    def analyze_image_bytes(file_bytes: bytes, filename: str, mime_type: str) -> Dict[str, Any]:
        file_size = len(file_bytes)
        ext = os.path.splitext(filename)[1].lower()

        result: Dict[str, Any] = {
            "format": ext.replace(".", "").upper() or "UNKNOWN",
            "mime_type": mime_type,
            "file_size_bytes": file_size,
            "dimensions": {"width": 0, "height": 0},
            "aspect_ratio": "1:1",
            "visual_features": {},
            "bovine_triage_flags": [],
            "visual_risk_score": 0.15,
            "visual_quality_rating": "ACCEPTABLE"
        }

        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                width, height = img.size
                result["dimensions"] = {"width": width, "height": height}
                result["aspect_ratio"] = f"{round(width / max(1, height), 2)}:1"
                result["color_mode"] = img.mode

                # Quality assessment
                if width < 300 or height < 300:
                    result["visual_quality_rating"] = "LOW_RESOLUTION"
                    result["bovine_triage_flags"].append("Image resolution is low; recommend farmer provide higher detail capture.")
                elif width >= 1200 and height >= 1200:
                    result["visual_quality_rating"] = "HIGH_DEFINITION"
                else:
                    result["visual_quality_rating"] = "GOOD"

                # Convert to RGB for basic color histogram analysis
                rgb_img = img.convert("RGB")
                
                # Sample thumbnail for fast processing
                rgb_img.thumbnail((150, 150))
                pixels = list(rgb_img.getdata())
                num_pixels = len(pixels)

                if num_pixels > 0:
                    total_r = sum(p[0] for p in pixels)
                    total_g = sum(p[1] for p in pixels)
                    total_b = sum(p[2] for p in pixels)

                    avg_r = total_r / num_pixels
                    avg_g = total_g / num_pixels
                    avg_b = total_b / num_pixels

                    # Check for elevated red channel dominance (potential erythema/wound/inflammation/lesions)
                    red_ratio = avg_r / (max(1.0, (avg_g + avg_b) / 2.0))

                    result["visual_features"] = {
                        "average_rgb": [round(avg_r, 1), round(avg_g, 1), round(avg_b, 1)],
                        "red_dominance_ratio": round(red_ratio, 2)
                    }

                    if red_ratio > 1.35:
                        result["bovine_triage_flags"].append("High erythema/red spectrum density detected (Potential mucosal inflammation, udder mastitis, or skin wound).")
                        result["visual_risk_score"] = 0.72
                    else:
                        result["visual_risk_score"] = 0.20

        except Exception as e:
            result["error"] = f"Failed to parse image file: {str(e)}"
            result["visual_quality_rating"] = "UNREADABLE"

        return result
