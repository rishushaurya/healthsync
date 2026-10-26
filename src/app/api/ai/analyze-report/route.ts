import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_2 || '',
    process.env.GROQ_API_KEY_1 || '',
].filter(Boolean);
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

export async function POST(request: NextRequest) {
    try {
        const { reportText, fileName, userContext } = await request.json();

        const systemPrompt = `You are HealthSync's Medical Report Analyzer (Agent 2). Analyze the given medical report.

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

RULES:
- NEVER diagnose. Use phrases like "these results may suggest" or "your doctor should evaluate"
- Flag any critical values prominently
- Explain in simple Hindi/English terms
- Suggest Jan Aushadhi (generic) alternatives for expensive medicines
- Include a disclaimer that this is AI analysis and must be verified by a doctor
- If the text seems incomplete or unclear, do your best and note limitations`;

        let finalReportText = reportText;
        let base64Image = '';

        // Extract PDF Base64
        if (reportText.includes('[PDF_BASE64]')) {
            try {
                const base64Match = reportText.match(/\[PDF_BASE64\]([\s\S]*?)\[\/PDF_BASE64\]/);
                if (base64Match && base64Match[1]) {
                    const pdfBuffer = Buffer.from(base64Match[1], 'base64');
                    const pdfParse = require('pdf-parse');
                    const pdfData = await pdfParse(pdfBuffer);
                    finalReportText = `File: ${fileName}\nContent:\n${pdfData.text}`;
                }
            } catch (e) {
                console.error("PDF Parsing error:", e);
                finalReportText = "Failed to extract text from PDF report.";
            }
        } 
        // Extract Image Base64
        else if (reportText.includes('[IMAGE_BASE64]') || reportText.includes('[BASE64]')) {
            const match = reportText.match(/\[(?:IMAGE_BASE64|BASE64)\]([\s\S]*?)\[\/(?:IMAGE_BASE64|BASE64)\]/);
            if (match && match[1]) {
                base64Image = `data:image/jpeg;base64,${match[1]}`;
            }
        }

        if (base64Image) {
            finalReportText = `File: ${fileName}\nScanned medical image report received for clinical evaluation and parameter verification.`;
        }

        // Limit length to avoid exceeding context window
        if (finalReportText && finalReportText.length > 15000) {
            finalReportText = finalReportText.substring(0, 15000) + '...[TRUNCATED]';
        }

        let text = '';
        let lastError: any = null;

        // Route to Groq for all (text/pdf/image)
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
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: `Analyze this medical report. File: ${fileName}.\n\nReport Content:\n${finalReportText}\n\nProvide structured analysis in JSON format.` },
                            ],
                            temperature: 0.3,
                            max_completion_tokens: 2048,
                        }),
                    });

                    const data = await response.json();
                    if (!data.error && data.choices?.[0]?.message?.content) {
                        text = data.choices[0].message.content;
                        break;
                    }
                    lastError = data.error;
                } catch (err) {
                    lastError = err;
                }
            }
            if (text) break;
        }

        if (!text) {
            return NextResponse.json({ error: lastError?.message || 'Failed to analyze report' }, { status: 500 });
        }

        let analysis;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { laymanSummary: text, technicalSummary: text, abnormalities: [], recommendations: [], urgencyLevel: 'green' };
        } catch {
            analysis = { laymanSummary: text, technicalSummary: text, abnormalities: [], recommendations: [], urgencyLevel: 'green' };
        }

        // The frontend refuses to save anything that isn't a genuine medical report
        analysis.isValidReport = analysis.isFake !== true;
        if (!analysis.isValidReport) {
            analysis.validationMessage = analysis.laymanSummary || 'This does not appear to be a genuine medical report.';
        }

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('Report Analysis Error:', error);
        return NextResponse.json({ error: 'Failed to analyze report' }, { status: 500 });
    }
}
