import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_DOCTORS } from '@/lib/data';

// Only recommend specialties that have bookable doctors on the platform
const SPECIALTIES = [...new Set(PLATFORM_DOCTORS.map(d => d.specialty))];

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_1 || '',
    process.env.GROQ_API_KEY_2 || '',
].filter(Boolean);

const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

async function callGroq(prompt: string): Promise<string> {
    let lastError: any = null;

    for (const model of GROQ_MODELS) {
        for (const key of GROQ_KEYS) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.2,
                        max_completion_tokens: 2048,
                        response_format: { type: "json_object" }
                    }),
                });

                const data = await response.json();
                if (!data.error && data.choices?.[0]?.message?.content) {
                    return data.choices[0].message.content;
                }
                lastError = data.error;
            } catch (err) {
                lastError = err;
            }
        }
    }

    throw new Error(lastError?.message || 'Failed to call Groq API');
}

export async function POST(request: NextRequest) {
    try {
        const { transcript, documents, consultationType, patientContext } = await request.json();

        let prompt = `You are an AI Clinical Synthesizer for an Indian hospital kiosk.
You are given a raw conversational transcript between a patient and a triage AI, and OCR text from uploaded medical documents.
Synthesize this into a structured Clinical Intake Summary.

CONSULTATION TYPE: ${consultationType || 'Allopathic'}

ABHA PRE-EXISTING RECORDS (If available):
${patientContext ? patientContext : "None"}

CONVERSATION TRANSCRIPT:
${transcript}

UPLOADED DOCUMENTS OCR:
${(documents || []).map((d: any) => `Document: ${d.name}\n${d.text}`).join('\n\n')}

CRITICAL RULES:
1. Merge information intelligently. If documents show a history of diabetes, add it to pastMedicalHistory.
2. Structure the HPI using the SOCRATES framework if applicable.
3. Extract any "red flag" emergency symptoms into the redFlags array.
4. Return ONLY a valid JSON object matching exactly this structure:
{
  "chiefComplaint": "string",
  "hpi": "string",
  "pastMedicalHistory": "string",
  "drugAllergyHistory": "string",
  "reviewOfSystems": "string",
  "familyHistory": "string",
  "prakriti": "string (only if AYUSH, else empty)",
  "vikriti": "string (only if AYUSH, else empty)",
  "agni": "string (only if AYUSH, else empty)",
  "aharaVihara": "string (only if AYUSH, else empty)",
  "redFlags": ["array of strings"],
  "explanation": "2-4 plain-language sentences for the patient: what may be causing these symptoms (possibilities, not a diagnosis)",
  "recommendedSpecialty": "exactly one of: ${SPECIALTIES.join(', ')}",
  "specialtyReason": "one sentence on why this specialist"
}
5. For AYUSH consultations prefer an Ayurvedic or Homeopath specialty; otherwise General Physician when unsure.`;

        const text = await callGroq(prompt);
        
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                throw new Error("Failed to parse JSON");
            }
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('AI Summarize Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
