import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_1 || '',
    process.env.GROQ_API_KEY_2 || '',
];

async function callGroq(messages: { role: string; content: string }[], systemPrompt: string, keyIndex = 0): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEYS[keyIndex]}`,
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
            temperature: 0.4,
            max_completion_tokens: 3000,
        }),
    });

    const data = await response.json();

    if (data.error && keyIndex === 0) {
        return callGroq(messages, systemPrompt, 1);
    }
    if (data.error) {
        throw new Error(data.error.message || 'Groq API error');
    }
    return data.choices?.[0]?.message?.content || '';
}

const PRESCRIPTION_SYSTEM_PROMPT = `You are an AI medical assistant that helps doctors generate prescriptions after a teleconsultation call.

Based on the consultation context provided, generate a COMPLETE prescription in the following strict JSON format. Do NOT include any text outside the JSON block.

RESPOND ONLY WITH VALID JSON — no markdown, no explanation, no backticks. Just the raw JSON object.

JSON Format:
{
  "diagnosis": "Brief diagnosis based on the consultation",
  "medicines": [
    {
      "name": "Medicine Name",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "duration": "e.g. 7 days",
      "notes": "e.g. After meals"
    }
  ],
  "advice": "General health advice, diet recommendations, lifestyle changes, and recovery plan. Include both Hindi and English advice if the language preference is Hindi.",
  "followUpDays": 7
}

RULES:
1. Always include 2-5 medicines that are commonly prescribed for the diagnosis.
2. Prefer generic medicine names and mention brand alternatives in notes.
3. Include Jan Aushadhi (Indian generic pharmacy) alternatives where possible.
4. The advice section should include: diet plan, exercise recommendations, things to avoid, and recovery timeline.
5. If the language is Hindi, write advice in both Hindi (Devanagari) and English.
6. Be medically accurate but remember this is for demonstration purposes.
7. The followUpDays should be a reasonable number (7, 14, 21, or 30).`;

export async function POST(request: NextRequest) {
    try {
        const { doctorName, doctorSpecialty, patientName, patientConditions, patientAge, patientGender, callDuration, consultationNotes, language } = await request.json();

        const userMessage = `
CONSULTATION DETAILS:
- Doctor: ${doctorName} (${doctorSpecialty})
- Patient: ${patientName}
- Patient Age: ${patientAge || 'Not specified'}
- Patient Gender: ${patientGender || 'Not specified'}
- Known Conditions: ${patientConditions?.join(', ') || 'None reported'}
- Call Duration: ${callDuration} minutes
- Language Preference: ${language || 'English'}
${consultationNotes ? `- Doctor's Notes from Consultation: ${consultationNotes}` : '- General consultation for the known conditions'}

Please generate a complete prescription based on this teleconsultation.`;

        const result = await callGroq(
            [{ role: 'user', content: userMessage }],
            PRESCRIPTION_SYSTEM_PROMPT
        );

        // Parse the JSON response
        let prescription;
        try {
            // Try to extract JSON from the response (handle if wrapped in backticks)
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            prescription = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
        } catch {
            // If parsing fails, return a structured fallback
            prescription = {
                diagnosis: 'General consultation',
                medicines: [
                    { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '5 days', notes: 'For fever/pain relief' }
                ],
                advice: result, // Use the raw AI text as advice
                followUpDays: 7
            };
        }

        return NextResponse.json({ prescription });
    } catch (error) {
        console.error('AI Prescription Error:', error);
        return NextResponse.json({ error: 'Failed to generate prescription' }, { status: 500 });
    }
}
