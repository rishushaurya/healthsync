import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_1 || '',
    process.env.GROQ_API_KEY_2 || '',
].filter(Boolean);

// Same model list as the other AI routes (the previous llama-4-scout model was retired by Groq)
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

async function callGroq(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    let lastError = 'Groq API error';
    for (const model of GROQ_MODELS) {
        for (const key of GROQ_KEYS) {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'system', content: systemPrompt }, ...messages],
                    temperature: 0.4,
                    max_completion_tokens: 3000,
                }),
            });
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!data.error && content) return content;
            lastError = data.error?.message || lastError;
        }
    }
    throw new Error(lastError);
}

const PRESCRIPTION_SYSTEM_PROMPT = `You are an AI medical scribe. You draft a care plan from a doctor–patient consultation for the doctor to review, edit and sign. Nothing reaches the patient until the doctor approves it.

RESPOND ONLY WITH VALID JSON — no markdown, no explanation, no backticks. Just the raw JSON object:
{
  "summary": "3-5 sentence clinical summary of the consultation for the doctor",
  "diagnosis": "Working diagnosis as discussed",
  "medicines": [
    { "name": "Generic name", "dosage": "e.g. 500 mg", "frequency": "with clock times, e.g. Twice daily — 8 AM and 8 PM", "duration": "e.g. 5 days", "notes": "e.g. After food" }
  ],
  "diet": "Specific diet guidance for this condition: what to eat, what to avoid",
  "exercise": "Exercise and activity guidance, including what to avoid and when to resume normal activity",
  "advice": "Other instructions and warning signs that need urgent care",
  "followUpDays": 7
}

RULES:
1. Use the medicines, doses and instructions the doctor actually says in the transcript. Only if the transcript has none, suggest commonly used generics and start their notes with "AI suggestion — confirm".
2. Prefer generic names; mention Jan Aushadhi availability in notes where relevant.
3. Every medicine must have clock times in "frequency" so the patient knows when to take it.
4. If the language preference is Hindi, write diet, exercise and advice in Hindi (Devanagari) followed by English.
5. followUpDays must be 3, 7, 14, 21 or 30.
6. Never invent findings: no vitals, examination results, test values or history that are not in the transcript or record. If something was not captured, say "not recorded".`;

export async function POST(request: NextRequest) {
    try {
        const { doctorName, doctorSpecialty, patientName, patientConditions, patientAge, patientGender, callDuration, consultationNotes, transcript, clinicalContext, language } = await request.json();

        const userMessage = `
CONSULTATION DETAILS:
- Doctor: ${doctorName} (${doctorSpecialty})
- Patient: ${patientName}, ${patientAge || 'age not specified'}, ${patientGender || 'gender not specified'}
- Known Conditions: ${patientConditions?.join(', ') || 'None reported'}
- Consultation length: ${callDuration || 'unknown'} minutes
- Language Preference: ${language || 'English'}

PRE-CONSULTATION RECORD (intake, assessment, vitals, reports):
${clinicalContext || 'Not available'}

CONSULTATION TRANSCRIPT (recorded with consent):
${transcript || 'No transcript captured.'}
${consultationNotes ? `\nDOCTOR'S NOTES:\n${consultationNotes}` : ''}

Draft the care plan.`;

        const result = await callGroq(
            [{ role: 'user', content: userMessage }],
            PRESCRIPTION_SYSTEM_PROMPT
        );

        let prescription;
        try {
            // Extract JSON even if the model wrapped it in backticks
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            prescription = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
        } catch {
            // Unparseable: hand the raw text to the doctor as the summary, with nothing prescribed
            prescription = { summary: result, diagnosis: '', medicines: [], diet: '', exercise: '', advice: '', followUpDays: 7 };
        }

        return NextResponse.json({ prescription });
    } catch (error) {
        console.error('AI Prescription Error:', error);
        return NextResponse.json({ error: 'Failed to generate prescription' }, { status: 500 });
    }
}
