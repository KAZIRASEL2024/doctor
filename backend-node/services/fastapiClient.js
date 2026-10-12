const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

class FastApiClient {
  /**
   * Sends cow symptoms, size, weight, picture, and audio to the FastAPI microservice
   * for automated acoustic feature extraction and visual inflammation analysis.
   */
  static async analyzeCase({ symptomsText, cowWeightKg, cowSize, durationDays, imageFilePath, audioFilePath }) {
    try {
      const form = new FormData();
      form.append('symptoms_text', symptomsText || 'No description');
      form.append('cow_weight_kg', String(cowWeightKg || 400));
      form.append('cow_size', cowSize || 'Standard');
      form.append('problem_duration_days', String(durationDays || 1));

      if (imageFilePath && fs.existsSync(imageFilePath)) {
        form.append('image_file', fs.createReadStream(imageFilePath));
      }

      if (audioFilePath && fs.existsSync(audioFilePath)) {
        form.append('audio_file', fs.createReadStream(audioFilePath));
      }

      const response = await axios.post(`${FASTAPI_URL}/api/v1/media/analyze-case`, form, {
        headers: form.getHeaders(),
        timeout: 8000 // 8-second timeout
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.warn(`[FastAPI Service Warning] Microservice unavailable at ${FASTAPI_URL}: ${error.message}`);
      
      // Fallback local heuristic triage if FastAPI microservice is offline
      let localPriority = 'NORMAL';
      const text = (symptomsText || '').toLowerCase();
      if (text.includes('cough') || text.includes('fever') || text.includes('not eating') || text.includes('downer')) {
        localPriority = 'HIGH';
      }

      return {
        success: false,
        fallback: true,
        data: {
          composite_risk_score: localPriority === 'HIGH' ? 0.65 : 0.25,
          recommended_priority: localPriority,
          summary: `FastAPI Microservice offline. Local triage assigned ${localPriority} priority based on symptom keywords. Cow weight: ${cowWeightKg}kg (${cowSize}).`,
          triage_flags: ['Local fallback triage applied'],
          audio_analysis: null,
          image_analysis: null
        }
      };
    }
  }
}

module.exports = FastApiClient;
