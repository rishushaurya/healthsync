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
                ...messages.map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user',
                    content: m.content,
                })),
            ],
            temperature: 0.7,
            max_completion_tokens: 2048,
        }),
    });

    const data = await response.json();

    if (data.error && keyIndex === 0) {
        return callGroq(messages, systemPrompt, 1);
    }

    if (data.error) {
        throw new Error(data.error.message || 'Groq API error');
    }

    return data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';
}

export async function POST(request: NextRequest) {
    try {
        const { messages, systemPrompt, userContext } = await request.json();

        let fullPrompt = systemPrompt || getDefaultSystemPrompt();

        if (userContext) {
            fullPrompt += `\n\n${userContext}`;
        }

        const text = await callGroq(messages, fullPrompt);

        return NextResponse.json({ response: text });
    } catch (error) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

function getDefaultSystemPrompt() {
    return `You are HealthSync AI, a compassionate and intelligent health assistant. You are part of the HealthSync platform — an AI-Assisted Recovery Journey System.

CRITICAL RULES:
1. You NEVER diagnose diseases. You help users understand symptoms and guide them to appropriate specialists.
2. You NEVER prescribe medications. You only help users understand prescribed medications.
3. You provide clear, structured, empathetic responses.
4. You always suggest consulting a qualified doctor for medical decisions.
5. You explain medical terms in simple, understandable language.
6. You are aware of the Indian healthcare context (ABHA, Jan Aushadhi, common conditions in India).
7. You personalize responses based on user profile when available.
8. You remember previous conversations and reference them when relevant.
9. When recommending doctors, specify the SPECIALIST TYPE needed (e.g., Nephrologist, Cardiologist).
10. For medications, always mention Jan Aushadhi (generic) alternatives if available to save costs.

BEHAVIOR:
- Be warm and reassuring, like a knowledgeable friend
- Use simple language, avoid medical jargon unless explaining it
- Structure responses with clear sections using markdown
- When discussing symptoms, always include urgency guidance (seek immediate care vs. schedule appointment)
- Suggest generic medicine alternatives when relevant to save costs
- Support Hindi and English responses based on user preference`;
}
