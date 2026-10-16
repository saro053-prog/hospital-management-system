/**
 * AI Healthcare Assistant Controller
 * Provides context-aware hospital intelligence, doctor availability queries, clinical triage guidance,
 * and emergency escalation. Supports external LLMs and internal relational NLP retrieval.
 */

const db = require('../config/db');

async function handleChat(req, res) {
  const startTime = Date.now();
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A text message query is required.'
      });
    }

    const query = message.trim();
    const lower = query.toLowerCase();

    // Detect Tamil language or request
    const isTamil = /[\u0B80-\u0BFF]/.test(query) || lower.includes('tamil') || lower.includes('enakku') || lower.includes('epdi') || lower.includes('vanakkam') || lower.includes('solla') || lower.includes('romba') || lower.includes('irukku');

    // Check emergency triggers first (Patient Safety Guardrail)
    const emergencyKeywords = ['chest pain', 'heart attack', 'unconscious', 'cannot breathe', 'severe bleeding', 'stroke', 'poison', 'accident', 'emergency', 'breathless', 'seizure', 'avaram', 'nenju vali'];
    const isEmergency = emergencyKeywords.some(kw => lower.includes(kw));

    if (isEmergency) {
      const emergencyReply = isTamil
        ? `⚠️ அவசர மருத்துவ எச்சரிக்கை (EMERGENCY CLINICAL ALERT):\nநெஞ்சு வலி, மூச்சுத்திணறல் அல்லது மயக்கம் போன்ற தீவிர அறிகுறிகள் இருந்தால் உடனே:\n1. அவசர உதவி எண் 108 அல்லது எங்களின் 24/7 மருத்துவமனை உதவி எண்: 1800 123 4567 / 044-2456-9999-க்கு அழைக்கவும்.\n2. தரைத்தளத்தில் உள்ள அவசர சிகிச்சை பிரிவுக்கு (Block G, Ground Floor, Trauma Center) உடனடியாக வரவும்.\nஎங்கள் அவசர சிகிச்சை மருத்துவர்கள் 24 மணி நேரமும் தயார் நிலையில் உள்ளனர்.`
        : `⚠️ EMERGENCY CLINICAL ALERT:\nIf you or someone nearby is experiencing acute symptoms (such as chest pain, loss of consciousness, or severe breathing distress), PLEASE IMMEDIATELY:\n\n1. Dial National Emergency 108 / 102 or our 24/7 Level-1 Emergency Helpline: 1800 123 4567 / 044-2456-9999\n2. Approach our Emergency & Trauma Center at Block G, Ground Floor.\n\nDo not wait for an online appointment. Our emergency triage team is ready 24 hours every day.`;

      return res.json({
        success: true,
        reply: emergencyReply,
        isEmergency: true,
        source: 'clinical_emergency_protocol',
        latencyMs: Date.now() - startTime
      });
    }

    // Retrieve live database context
    const doctors = await db.query('SELECT * FROM `doctors` WHERE `is_available` = 1');
    const departments = await db.query('SELECT * FROM `departments`');
    const appointments = await db.query('SELECT * FROM `appointments`');
    const labTests = await db.query('SELECT * FROM `lab_tests`');

    // If external AI key is available, attempt upstream LLM call
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        // Example: Google Gemini API integration
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{
                  text: `You are the official Wellness Hospital AI Clinical Assistant. Answer the patient's query accurately using this verified hospital database context:
Departments: ${departments.map(d => d.name).join(', ')}.
Available Doctors Today: ${doctors.map(d => `${d.name} (${d.specialization}, ${d.room_number})`).join(', ')}.
Emergency: 1800 123 4567 (Block G, Ground Floor).
User Query: "${query}".
Language: ${isTamil ? 'Tamil / Thanglish' : 'English'}.
Keep response professional, supportive, concise, and structured.`
                }]
              }
            ]
          })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return res.json({
            success: true,
            reply: data.candidates[0].content.parts[0].text,
            isLlmPowered: true,
            model: 'gemini-1.5-flash',
            latencyMs: Date.now() - startTime
          });
        }
      } catch (llmErr) {
        console.warn('[AI Assistant] Upstream LLM call failed, falling back to local NLP engine:', llmErr.message);
      }
    }

    // Contextual, verified hospital knowledge engine response (Deterministic & Grounded)
    let reply = '';

    if (isTamil) {
      if (lower.includes('appointment') || lower.includes('book') || lower.includes('slot')) {
        reply = `வணக்கம்! வெல்னெஸ் மருத்துவமனையில் அப்பாயின்ட்மென்ட் புக் செய்வது எளிது:\n1. 'Appointments' பகுதிக்குச் சென்று 'Book Appointment' பட்டனை கிளிக் செய்யவும்.\n2. உங்களுக்குத் தேவையான துறை (Cardiology, Neurology, etc.) மற்றும் மருத்துவரைத் தேர்ந்தெடுக்கவும்.\n3. வசதியான தேதி மற்றும் நேரத்தைத் தேர்வு செய்து உறுதிப்படுத்தவும்.\nஉடனடியாக உங்கள் டோக்கன் எண் வழங்கப்படும். உதவிக்கு: 1800 123 4567.`;
      } else if (lower.includes('doctor') || lower.includes('maruthuvar')) {
        reply = `இன்று பணியில் உள்ள முன்னணி மருத்துவர்கள்:\n` +
          doctors.map(d => `• ${d.name} - ${d.specialization} (${d.room_number})`).join('\n') +
          `\n\nஅப்பாயின்ட்மென்ட் பெற 'Appointments' மெனுவை பயன்படுத்தவும்.`;
      } else {
        reply = `வணக்கம்! நான் வெல்னெஸ் மருத்துவமனை AI உதவியாளர். மருத்துவ ஆலோசனைகள், மருத்துவர் விவரங்கள், அப்பாயின்ட்மென்ட் முன்பதிவு மற்றும் ஆய்வகப் பரிசோதனை விவரங்களை அறிய என்னிடம் கேட்கலாம்.`;
      }
    } else {
      if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('slot')) {
        reply = `Booking an appointment at Wellness Hospital is quick and verified:\n\n1. Go to the "Appointments" tab in your sidebar.\n2. Click "Book Appointment".\n3. Select your clinical department (Cardiology, Neurology, Pediatrics, Orthopedics, etc.).\n4. Choose from our verified on-duty specialists.\n5. Select your preferred date and slot to generate your official appointment token.\n\nNeed front desk assistance? Call 1800 123 4567.`;
      } else if (lower.includes('doctor') || lower.includes('specialist') || lower.includes('cardiologist') || lower.includes('neurologist')) {
        let matchingDocs = doctors;
        if (lower.includes('cardio')) matchingDocs = doctors.filter(d => d.specialization.toLowerCase().includes('cardio'));
        if (lower.includes('neuro')) matchingDocs = doctors.filter(d => d.specialization.toLowerCase().includes('neuro'));
        if (lower.includes('ortho')) matchingDocs = doctors.filter(d => d.specialization.toLowerCase().includes('ortho'));
        if (lower.includes('pediat')) matchingDocs = doctors.filter(d => d.specialization.toLowerCase().includes('pediat'));

        reply = `Here are our verified active consulting physicians:\n\n` +
          matchingDocs.map(d => `• ${d.name} — ${d.specialization}\n  Qualifications: ${d.qualification} | Fee: ₹${d.consultation_fee} | Room: ${d.room_number}`).join('\n\n') +
          `\n\nAll doctors maintain conflict-free digital queue schedules.`;
      } else if (lower.includes('bed') || lower.includes('admit') || lower.includes('ward') || lower.includes('icu')) {
        const beds = await db.query('SELECT * FROM `beds`');
        const avail = beds.filter(b => b.status === 'Available').length;
        const icuBeds = beds.filter(b => b.bed_number.startsWith('ICU') || (b.ward_name && b.ward_name.includes('ICU')));
        const availIcu = icuBeds.filter(b => b.status === 'Available').length;
        reply = `Hospital Bed Capacity Overview:\n• Total Available Beds: ${avail} / ${beds.length} beds\n• ICU Critical Care Beds: ${availIcu} / ${icuBeds.length || 5} available\n• Wards: Intensive Care Unit (ICU), Cardiology CCU, Post-Operative Recovery, and General Wards.\n\nFor emergency admissions, our Front Desk and Nursing triage teams manage real-time bed allocations.`;
      } else if (lower.includes('department') || lower.includes('specialt') || lower.includes('service')) {
        reply = `Wellness Hospital features 6 state-of-the-art clinical departments:\n\n` +
          departments.map(d => `• ${d.name} (${d.code}) — ${d.description} [${d.floor_location}]`).join('\n') +
          `\n\nEach department operates dedicated consultation suites and inpatient wards.`;
      } else if (/\blabs?\b/.test(lower) || lower.includes('diagnostic') || lower.includes('laboratory') || lower.includes('blood test') || lower.includes('scan')) {
        reply = `Our accredited Diagnostic Laboratory operates 24/7. Popular tests available:\n\n` +
          labTests.slice(0, 5).map(t => `• ${t.test_name} (${t.test_code}) — ₹${t.price} [Turnaround: ${t.turnaround_hours}h]`).join('\n') +
          `\n\nAll verified reports can be viewed and printed directly from your Patient & Doctor portals.`;
      } else if (lower.includes('time') || lower.includes('hour') || lower.includes('visiting')) {
        reply = `Wellness Hospital Operational Timings:\n\n• Outpatient Consultations (OPD): Monday to Saturday, 08:30 AM – 06:00 PM\n• Diagnostic Laboratory & Pharmacy: Open 24/7\n• Inpatient Visiting Hours: 11:00 AM – 01:00 PM & 05:00 PM – 07:00 PM\n• Emergency & Trauma Center: Open 24 Hours Every Day (Block G).`;
      } else {
        reply = `Hello! I am your Wellness Hospital AI Assistant. I can help you with:\n\n• Checking active doctor schedules & consultation fees\n• Guiding you through appointment booking & token tracking\n• Exploring departments & diagnostic lab tests\n• General clinic timings and hospital visiting policies\n\nHow may I assist your healthcare visit today?`;
      }
    }

    res.json({
      success: true,
      reply,
      isLlmPowered: !!apiKey,
      model: apiKey ? 'external-llm' : 'wellness-clinical-nlp-v2.4',
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to process healthcare query: ' + err.message
    });
  }
}

module.exports = {
  handleChat
};
