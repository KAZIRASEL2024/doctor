// BovineMed Tele-Veterinary Web Application Logic

let currentRole = 'FARMER';
let currentConsultations = [];
let currentCattleList = [];
let activeCaseId = null;

// Initial state and active user
const currentUser = {
  id: 'usr-farmer-1',
  name: 'Rahim Khan',
  farm_id: 'frm-001',
  sub_zone_id: 'subz-n1',
  zone_id: 'zone-north',
  role: 'FARMER'
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMediaPreviews();
  setupConsultationForm();
  loadCattleHerd();
  loadConsultations();
  loadHierarchy();
});

// 1. Navigation & Role Switching
function setupNavigation() {
  const roleButtons = document.querySelectorAll('.role-btn');
  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      setRole(role);
    });
  });

  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDoctorQueue(btn.dataset.filter);
    });
  });

  document.getElementById('btnRefreshFarmerTickets')?.addEventListener('click', loadConsultations);
}

function setRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.role === role);
  });

  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));

  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const subtextEl = document.getElementById('userSubtext');

  if (role === 'FARMER') {
    document.getElementById('viewFarmer').classList.add('active');
    avatar.textContent = 'RK';
    avatar.style.background = '#0284c7';
    nameEl.textContent = 'Rahim Khan';
    subtextEl.textContent = 'Green Valley Dairy Firm • Sub-Zone N1';
  } else if (role === 'DOCTOR') {
    document.getElementById('viewDoctor').classList.add('active');
    avatar.textContent = 'SC';
    avatar.style.background = '#10b981';
    nameEl.textContent = 'Dr. Sarah Connor (DVM)';
    subtextEl.textContent = 'River Valley Sector Assigned Vet';
    renderDoctorQueue('ALL');
  } else if (role === 'ADMIN') {
    document.getElementById('viewAdmin').classList.add('active');
    avatar.textContent = 'ES';
    avatar.style.background = '#6366f1';
    nameEl.textContent = 'Dr. Edward Stone';
    subtextEl.textContent = 'Territory Regional Director';
  }
}

// 2. Media Upload & Live Audio/Image Previews
function setupMediaPreviews() {
  const picInput = document.getElementById('pictureInput');
  const picPreview = document.getElementById('imagePreview');
  const picContainer = document.getElementById('imagePreviewContainer');
  const picName = document.getElementById('picFileName');

  picInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      picName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        picPreview.src = ev.target.result;
        picContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  const audInput = document.getElementById('audioInput');
  const audPreview = document.getElementById('audioPreview');
  const audContainer = document.getElementById('audioPreviewContainer');
  const audName = document.getElementById('audioFileName');

  audInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      audName.textContent = file.name;
      audPreview.src = URL.createObjectURL(file);
      audContainer.classList.remove('hidden');
    }
  });
}

// 3. Cattle Herd Loading
async function loadCattleHerd() {
  try {
    const res = await fetch('/api/cattle?farm_id=frm-001');
    const data = await res.json();
    currentCattleList = data.cattle || [];

    const select = document.getElementById('selectCattle');
    select.innerHTML = '<option value="">-- Choose Cow from Farm Herd --</option>';

    currentCattleList.forEach(cow => {
      const opt = document.createElement('option');
      opt.value = cow.id;
      opt.textContent = `${cow.tag_number} - ${cow.name} (${cow.breed})`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const selected = currentCattleList.find(c => c.id === select.value);
      if (selected) {
        document.getElementById('cattleBreed').value = selected.breed;
        document.getElementById('cowWeight').value = selected.weight_kg;
        document.getElementById('cowSize').value = selected.size_category;
      } else {
        document.getElementById('cattleBreed').value = '';
        document.getElementById('cowWeight').value = '';
        document.getElementById('cowSize').value = '';
      }
    });

    // Auto-select first cow for immediate testing
    if (currentCattleList.length > 0) {
      select.value = currentCattleList[0].id;
      select.dispatchEvent(new Event('change'));
    }
  } catch (err) {
    console.warn('Failed loading cattle:', err);
  }
}

// 4. Submit Consultation Case (The Core Policy)
function setupConsultationForm() {
  const form = document.getElementById('consultationForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('btnSubmitConsultation');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Analyzing audio, image & sending to Doctor...';

    const formData = new FormData();
    const select = document.getElementById('selectCattle');
    const selectedCow = currentCattleList.find(c => c.id === select.value);

    formData.append('cattle_id', select.value || 'cat-101');
    formData.append('farm_id', currentUser.farm_id);
    formData.append('sub_zone_id', currentUser.sub_zone_id);
    formData.append('zone_id', currentUser.zone_id);
    formData.append('farmer_id', currentUser.id);

    formData.append('cow_weight_kg', document.getElementById('cowWeight').value);
    formData.append('cow_size', document.getElementById('cowSize').value);
    formData.append('symptoms_text', document.getElementById('symptomsText').value);
    formData.append('problem_duration_days', document.getElementById('problemDuration').value);

    const picFile = document.getElementById('pictureInput').files[0];
    if (picFile) formData.append('picture', picFile);

    const audFile = document.getElementById('audioInput').files[0];
    if (audFile) formData.append('audio', audFile);

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to submit consultation');
      }

      alert('✅ Cow Problem & Media submitted to Doctor successfully!\nAssigned Doctor: ' + (resData.assigned_doctor ? resData.assigned_doctor.full_name : 'Dr. Sarah Connor'));

      // Clear problem description
      document.getElementById('symptomsText').value = '';
      
      // Reload tickets
      await loadConsultations();

      // If doctor view is open, update queue
      if (currentRole === 'DOCTOR') {
        renderDoctorQueue('ALL');
      }

    } catch (err) {
      alert('Error submitting consultation: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🚀 Send Problem to Doctor';
    }
  });
}

// 5. Fetch & Render Consultations
async function loadConsultations() {
  try {
    const res = await fetch('/api/consultations');
    const data = await res.json();
    currentConsultations = data.consultations || [];
    renderFarmerTickets();
    if (currentRole === 'DOCTOR') {
      renderDoctorQueue('ALL');
    }
  } catch (err) {
    console.error('Failed fetching consultations:', err);
  }
}

function renderFarmerTickets() {
  const container = document.getElementById('farmerTicketsList');
  if (!container) return;

  if (currentConsultations.length === 0) {
    container.innerHTML = '<div class="empty-state">No consultations submitted yet.</div>';
    return;
  }

  container.innerHTML = currentConsultations.map(c => {
    const statusClass = c.status === 'DIAGNOSED' ? 'badge-diagnosed' : c.status === 'UNDER_REVIEW' ? 'badge-review' : 'badge-pending';
    const priorityClass = c.priority === 'EMERGENCY' ? 'badge-emergency' : c.priority === 'HIGH' ? 'badge-high' : 'badge-normal';

    const hasRx = !!c.prescription;

    return `
      <div class="ticket-item">
        <div class="ticket-top">
          <span class="badge ${statusClass}">${c.status}</span>
          <span class="badge ${priorityClass}">Priority: ${c.priority}</span>
        </div>
        <div class="ticket-title">🐮 ${c.cattle_name || 'Cow'} (${c.cattle_tag || 'Tag'}) - ${c.cattle_breed}</div>
        <div class="ticket-meta">
          <span>⚖️ <strong>${c.cow_weight_kg} kg</strong></span>
          <span>📏 <strong>${c.cow_size}</strong></span>
          <span>👨‍⚕️ Vet: <strong>${c.doctor_name || 'Assigned Vet'}</strong></span>
        </div>
        <div class="ticket-symptoms">
          <strong>Reported Symptoms:</strong> ${escapeHtml(c.symptoms_text)}
        </div>
        ${c.fastapi_triage_summary ? `
          <div style="font-size:0.75rem; color:#0369a1; background:#e0f2fe; padding:6px 10px; border-radius:6px; margin-bottom:8px;">
            🤖 <strong>Automated Triage:</strong> ${escapeHtml(c.fastapi_triage_summary)}
          </div>
        ` : ''}
        ${hasRx ? `
          <button class="btn btn-sm btn-primary prescription-preview-btn" onclick="openPrescriptionModal('${c.id}')">
            📋 View Doctor's Prescription & Treatment Advice
          </button>
        ` : `
          <div style="font-size:0.78rem; color:#64748b; font-style:italic;">
            ⏳ Assigned Doctor is reviewing your audio & picture.
          </div>
        `}
      </div>
    `;
  }).join('');
}

// 6. Doctor Workstation Logic
function renderDoctorQueue(filter = 'ALL') {
  const container = document.getElementById('doctorQueueList');
  const countEl = document.getElementById('ticketCount');
  if (!container) return;

  let filtered = currentConsultations;
  if (filter !== 'ALL') {
    filtered = currentConsultations.filter(c => c.status === filter);
  }

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px; text-align:center; color:#94a3b8;">No cases in this category.</div>';
    return;
  }

  container.innerHTML = filtered.map(c => {
    const statusClass = c.status === 'DIAGNOSED' ? 'badge-diagnosed' : c.status === 'UNDER_REVIEW' ? 'badge-review' : 'badge-pending';
    const isActive = c.id === activeCaseId ? 'active' : '';

    return `
      <div class="queue-item ${isActive}" onclick="selectCaseForReview('${c.id}')">
        <div class="ticket-top">
          <span class="badge ${statusClass}">${c.status}</span>
          <span style="font-size:0.75rem; color:#64748b;">${new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="font-weight:700; font-size:0.9rem; margin-top:4px;">
          ${c.cattle_name || 'Cow'} (${c.cattle_tag || 'Tag'})
        </div>
        <div style="font-size:0.78rem; color:#475569; margin:4px 0;">
          🏡 ${c.farm_name} • ⚖️ ${c.cow_weight_kg}kg
        </div>
        <div style="font-size:0.75rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${escapeHtml(c.symptoms_text)}
        </div>
      </div>
    `;
  }).join('');
}

function selectCaseForReview(caseId) {
  activeCaseId = caseId;
  renderDoctorQueue();

  const caseData = currentConsultations.find(c => c.id === caseId);
  if (!caseData) return;

  const placeholder = document.getElementById('noCaseSelected');
  const content = document.getElementById('caseDetailsContent');

  placeholder.classList.add('hidden');
  content.classList.remove('hidden');

  // Media files (find image and audio)
  const picMedia = (caseData.media || []).find(m => m.media_type === 'PICTURE');
  const audMedia = (caseData.media || []).find(m => m.media_type === 'AUDIO');

  content.innerHTML = `
    <div class="case-review-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Case #${caseData.id.slice(-6)}: ${caseData.cattle_name || 'Cow'} (${caseData.cattle_tag || 'Tag'})</h3>
        <span class="badge ${caseData.status === 'DIAGNOSED' ? 'badge-diagnosed' : 'badge-pending'}">${caseData.status}</span>
      </div>
      <p style="font-size:0.85rem; color:#64748b; margin-top:4px;">
        Owner: <strong>${caseData.farmer_name || 'Farmer'}</strong> • Firm: <strong>${caseData.farm_name}</strong> • Sub-Zone: <strong>${caseData.sub_zone_name}</strong>
      </p>
    </div>

    <!-- Vitals banner -->
    <div class="vitals-banner">
      <div class="vital-card">
        <span>COW WEIGHT:</span>
        <strong>${caseData.cow_weight_kg} kg</strong>
      </div>
      <div class="vital-card">
        <span>COW SIZE & FRAME:</span>
        <strong style="font-size:0.85rem;">${caseData.cow_size}</strong>
      </div>
      <div class="vital-card">
        <span>BREED:</span>
        <strong>${caseData.cattle_breed}</strong>
      </div>
      <div class="vital-card">
        <span>DURATION:</span>
        <strong>${caseData.problem_duration_days || 1} Days</strong>
      </div>
    </div>

    <!-- Reported Symptoms -->
    <div style="margin-bottom:18px;">
      <h4 style="font-size:0.88rem; margin-bottom:6px;">📝 Farmer's Symptom Narrative:</h4>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:0.9rem;">
        ${escapeHtml(caseData.symptoms_text)}
      </div>
    </div>

    <!-- Multimedia Auscultation & Visual Inspection -->
    <div class="media-inspector-box">
      <div class="media-col">
        <h4>📷 Cow Picture Examination:</h4>
        ${picMedia ? `
          <img src="${picMedia.file_path}" alt="Cow Lesion / Photo" onclick="window.open('${picMedia.file_path}')">
          <small style="display:block; margin-top:4px; color:#64748b;">Click image to enlarge</small>
        ` : `
          <div style="height:120px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b; border-radius:6px;">No picture provided</div>
        `}
      </div>

      <div class="media-col">
        <h4>🎙️ Auscultation & Respiratory Audio:</h4>
        ${audMedia ? `
          <div style="background:#fff; padding:16px; border:1px solid #cbd5e1; border-radius:8px;">
            <p style="font-size:0.8rem; margin-bottom:8px; font-weight:600;">Play bovine lung/cough recording:</p>
            <audio controls style="width:100%;" src="${audMedia.file_path}"></audio>
            <small style="display:block; margin-top:6px; color:#64748b;">Duration: ~15s • Format: ${audMedia.mime_type}</small>
          </div>
        ` : `
          <div style="height:120px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b; border-radius:6px;">No audio provided</div>
        `}
      </div>
    </div>

    <!-- FastAPI Automated Triage Insight -->
    ${caseData.fastapi_triage_summary ? `
      <div class="ai-triage-card">
        <h4>⚡ FastAPI Automated Acoustic & Visual Assessment:</h4>
        <p style="font-size:0.85rem; color:#1e3a8a;">${escapeHtml(caseData.fastapi_triage_summary)}</p>
      </div>
    ` : ''}

    <!-- Prescription Form -->
    <div class="prescription-form-box">
      <h3 style="color:#065f46; font-size:1.1rem; margin-bottom:12px;">✍️ Issue Diagnosis & Prescription</h3>
      <form id="rxForm" onsubmit="submitDoctorPrescription(event, '${caseData.id}')">
        <div class="form-group">
          <label>Primary Clinical Diagnosis: <span class="required">*</span></label>
          <input type="text" id="rxDiagnosis" class="form-control" required placeholder="e.g. Bovine Respiratory Disease (BRD) Complex" value="${caseData.prescription ? caseData.prescription.diagnosis : 'Bovine Respiratory Disease Complex'}">
        </div>

        <div class="form-group">
          <label>Clinical Notes / Auscultation Findings:</label>
          <textarea id="rxClinical" rows="2" class="form-control" placeholder="Observed wheezing in audio, elevated respiratory rate, mucoid nasal exudate...">${caseData.prescription ? caseData.prescription.clinical_findings : 'Confirmed abnormal bronchovesicular sounds on auscultation. Mucosal irritation noted.'}</textarea>
        </div>

        <div class="form-group">
          <label>Medication Regimen (Calibrated to ${caseData.cow_weight_kg}kg body weight):</label>
          <table class="rx-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Dose / Route</th>
                <th>Frequency</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody id="rxMedicineRows">
              <tr>
                <td><input type="text" class="form-control med-name" value="Oxytetracycline LA 200mg/ml"></td>
                <td><input type="text" class="form-control med-dose" value="20 mg/kg (${Math.round(caseData.cow_weight_kg * 0.1)} ml IM)"></td>
                <td><input type="text" class="form-control med-freq" value="Single dose"></td>
                <td><input type="text" class="form-control med-dur" value="Repeat in 72h"></td>
              </tr>
              <tr>
                <td><input type="text" class="form-control med-name" value="Flunixin Meglumine"></td>
                <td><input type="text" class="form-control med-dose" value="2.2 mg/kg (${Math.round(caseData.cow_weight_kg * 0.044)} ml IV)"></td>
                <td><input type="text" class="form-control med-freq" value="Once daily"></td>
                <td><input type="text" class="form-control med-dur" value="3 Days"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-group">
          <label>Dietary & Farm Isolation Advice:</label>
          <textarea id="rxAdvice" rows="2" class="form-control" placeholder="Isolate in dry well-ventilated stall, avoid dusty straw, provide warm electrolyte drench...">${caseData.prescription ? caseData.prescription.dietary_advice : 'Separate from herd to prevent horizontal transmission. Provide palatable green forage and clean ad-libitum water.'}</textarea>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%;">
          💾 Save Diagnosis & Issue Prescription to Farmer
        </button>
      </form>
    </div>
  `;
}

// 7. Doctor Submits Prescription
async function submitDoctorPrescription(event, caseId) {
  event.preventDefault();

  const diagnosis = document.getElementById('rxDiagnosis').value;
  const clinical = document.getElementById('rxClinical').value;
  const advice = document.getElementById('rxAdvice').value;

  const medRows = document.querySelectorAll('#rxMedicineRows tr');
  const medications = [];

  medRows.forEach(row => {
    const name = row.querySelector('.med-name')?.value;
    const dose = row.querySelector('.med-dose')?.value;
    const freq = row.querySelector('.med-freq')?.value;
    const dur = row.querySelector('.med-dur')?.value;
    if (name) {
      medications.push({ name, dose, frequency: freq, duration: dur });
    }
  });

  try {
    const res = await fetch(`/api/consultations/${caseId}/prescribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diagnosis,
        clinical_findings: clinical,
        medications,
        dietary_advice: advice,
        doctor_id: 'doc-001'
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to issue prescription');

    alert('🎉 Prescription successfully issued to the sub-zone farmer!');
    await loadConsultations();
    selectCaseForReview(caseId);
  } catch (err) {
    alert('Error saving prescription: ' + err.message);
  }
}

// 8. Prescription Modal View for Farmers
function openPrescriptionModal(caseId) {
  const caseData = currentConsultations.find(c => c.id === caseId);
  if (!caseData || !caseData.prescription) return;

  const rx = caseData.prescription;
  const modal = document.getElementById('prescriptionModal');
  const content = document.getElementById('prescriptionModalContent');

  content.innerHTML = `
    <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color:#059669; font-size:1.3rem;">Bovine Clinical Prescription</h2>
      <p style="font-size:0.85rem; color:#64748b;">Case ID: ${caseData.id} • Issued: ${new Date(rx.created_at || Date.now()).toLocaleDateString()}</p>
    </div>

    <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:14px; font-size:0.85rem;">
      <p><strong>Patient Cattle:</strong> ${caseData.cattle_name} (${caseData.cattle_tag}) - ${caseData.cattle_breed}</p>
      <p><strong>Body Weight:</strong> ${caseData.cow_weight_kg} kg | <strong>Size:</strong> ${caseData.cow_size}</p>
      <p><strong>Doctor:</strong> ${caseData.doctor_name || 'Dr. Sarah Connor (DVM)'} (License: VET-LIC-98421)</p>
    </div>

    <div style="margin-bottom:14px;">
      <h4 style="font-size:0.9rem; color:#1e293b;">🩺 Clinical Diagnosis:</h4>
      <p style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-top:2px;">${escapeHtml(rx.diagnosis)}</p>
    </div>

    <div style="margin-bottom:14px;">
      <h4 style="font-size:0.9rem; color:#1e293b; margin-bottom:6px;">💊 Prescribed Medications:</h4>
      <table class="rx-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${(rx.medications || []).map(m => `
            <tr>
              <td><strong>${escapeHtml(m.name)}</strong></td>
              <td>${escapeHtml(m.dose)}</td>
              <td>${escapeHtml(m.frequency)}</td>
              <td>${escapeHtml(m.duration)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-bottom:14px;">
      <h4 style="font-size:0.9rem; color:#1e293b;">🌾 Care & Feeding Instructions:</h4>
      <p style="font-size:0.85rem; color:#334155; background:#f0fdf4; padding:10px; border-radius:6px; border:1px solid #bbf7d0;">
        ${escapeHtml(rx.dietary_advice)}
      </p>
    </div>

    <div style="text-align:right; font-size:0.8rem; color:#64748b; margin-top:16px;">
      Verified by Sub-Zone Veterinary Officer
    </div>
  `;

  modal.classList.remove('hidden');
}

function closePrescriptionModal() {
  document.getElementById('prescriptionModal').classList.add('hidden');
}

// 9. Load Territory Hierarchy Tree
async function loadHierarchy() {
  try {
    const res = await fetch('/api/zones/tree/full');
    const data = await res.json();
    const tree = data.hierarchy || [];

    const container = document.getElementById('hierarchyTree');
    if (!container) return;

    container.innerHTML = tree.map(zone => `
      <div class="zone-tree-node">
        <div class="zone-title">📍 ${zone.name} (${zone.code})</div>
        <p style="font-size:0.82rem; color:#64748b; margin-bottom:10px;">${zone.description}</p>
        <div class="subzones-list">
          ${(zone.sub_zones || []).map(sz => `
            <div class="subzone-node">
              <strong style="color:#059669;">Area: ${sz.name} (${sz.code})</strong>
              <div class="farms-chips">
                ${(sz.farms || []).map(f => `
                  <span class="farm-chip">🏡 ${f.name} (${f.total_cattle_count} cattle)</span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Failed loading hierarchy:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
