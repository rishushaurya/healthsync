import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_2 || '', // Use Agent 2 for report analysis
    process.env.GROQ_API_KEY_1 || '',
];

export async function POST(request: NextRequest) {
    try {
        const { reportText, fileName, userContext } = await request.json();

        const systemPrompt = `You are HealthSync's Medical Report Analyzer (Agent 2). Analyze the given medical report text content.

${userContext ? `PATIENT CONTEXT:\n${userContext}\n` : ''}

PROVIDE YOUR RESPONSE IN THIS EXACT JSON FORMAT:
{
  "laymanSummary": "A clear, simple explanation of the report in everyday language. Explain what each test means and whether values are normal. Use analogies when helpful.",
  "technicalSummary": "A professional medical summary suitable for a doctor's review.",
  "abnormalities": ["List each abnormal finding as a separate string"],
  "recommendations": ["List each recommendation as a separate string"],
  "urgencyLevel": "green|amber|red",
  "urgencyExplanation": "Brief explanation of why this urgency level was assigned",
  "suggestedSpecialist": "Type of specialist to consult, if needed",
  "estimatedCondition": "What condition these results might indicate (with disclaimer)",
  "medications": ["Any medications that could help based on findings"],
  "followUpTests": ["Any recommended follow-up tests"],
  "janAushadhiAlternatives": ["Generic medicine alternatives with approximate prices"],
  "isFake": false
}

CRITICAL: FAKE REPORT DETECTION
- If the content does NOT look like a genuine medical report (random text, gibberish, lorem ipsum, jokes, non-medical content, test data, or obviously fabricated values), set "isFake": true
- When isFake is true, set laymanSummary to "This does not appear to be a genuine medical report. Please upload a real medical report for analysis."
- When isFake is true, set urgencyLevel to "red" and leave abnormalities/recommendations empty
- If the content contains image data markers [IMAGE_BASE64], analyze it as a scanned medical report image

RULES:
- NEVER diagnose. Use phrases like "these results may suggest" or "your doctor should evaluate"
- Flag any critical values prominently
- Explain in simple Hindi/English terms
- Suggest Jan Aushadhi (generic) alternatives for expensive medicines
- Include a disclaimer that this is AI analysis and must be verified by a doctor
- If the text seems incomplete or unclear, do your best and note limitations`;

        let data;
        for (let i = 0; i < GROQ_KEYS.length; i++) {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_KEYS[i]}`,
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Analyze this medical report. File: ${fileName}.\n\nReport Content:\n${reportText}\n\nProvide structured analysis in JSON format.` },
                    ],
                    temperature: 0.3,
                    max_completion_tokens: 4096,
                }),
            });

            data = await response.json();
            if (!data.error) break;
        }

        if (data.error) {
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        const text = data.choices?.[0]?.message?.content || '';

        let analysis;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { laymanSummary: text, technicalSummary: text, abnormalities: [], recommendations: [], urgencyLevel: 'green' };
        } catch {
            analysis = { laymanSummary: text, technicalSummary: text, abnormalities: [], recommendations: [], urgencyLevel: 'green' };
        }

        // Map isFake to isValidReport for frontend
        if (analysis.isFake === true) {
            analysis.isValidReport = false;
            analysis.validationMessage = analysis.laymanSummary || 'This does not appear to be a legitimate medical report.';
        } else {
            analysis.isValidReport = true;
        }

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('Report Analysis Error:', error);
        return NextResponse.json({ error: 'Failed to analyze report' }, { status: 500 });
    }
}
