import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_1 || '',
    process.env.GROQ_API_KEY_2 || '',
];

export async function POST(request: NextRequest) {
    try {
        const { text, task } = await request.json();

        let systemPrompt = '';

        switch (task) {
            case 'translate':
                systemPrompt = 'You are a medical translator. Translate the given text accurately between Hindi and English. Preserve medical terminology while making it understandable. Only return the translated text, nothing else.';
                break;
            case 'summarize':
                systemPrompt = 'Summarize the text in 2-3 concise sentences. For medical content, highlight key findings and action items. Only return the summary.';
                break;
            case 'process_voice':
                systemPrompt = 'You are processing voice input for a health app. Clean up the transcribed text, fix any transcription errors, and extract the key health information. Return a clean version of what the user said.';
                break;
            case 'generate_insights':
                systemPrompt = `You are HealthSync's Health Insights Generator. Based on the user's health data, generate 3 short, actionable, personalized insights. Return ONLY a JSON array of objects with "text" and "type" fields. Type can be "positive", "tip", or "reminder". Keep each insight under 80 characters. Example: [{"text": "Your BP is stable for 5 days! Great progress", "type": "positive"}]`;
                break;
            case 'recommend_doctor':
                systemPrompt = `Based on the symptoms/conditions described, recommend what type of specialist doctor the patient should visit. Include urgency level (routine/urgent/emergency). Be specific about the specialist type. Return JSON: {"specialist": "type", "urgency": "level", "reason": "why this specialist"}`;
                break;
            default:
                systemPrompt = 'You are a helpful health assistant. Respond concisely and accurately.';
        }

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
                        { role: 'user', content: text },
                    ],
                    temperature: 0.7,
                    max_completion_tokens: 1024,
                }),
            });

            data = await response.json();
            if (!data.error) break;
        }

        if (data?.error) {
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        const result = data?.choices?.[0]?.message?.content || '';
        return NextResponse.json({ result });
    } catch (error) {
        console.error('Groq API Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
