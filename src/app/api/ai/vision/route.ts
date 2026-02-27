import { NextRequest, NextResponse } from 'next/server';

const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY || 'fbd09331-203a-486d-a5e9-ccaf9edbad9b';

export async function POST(request: NextRequest) {
    try {
        const { imageData, prompt, userContext } = await request.json();

        const systemPrompt = `You are HealthSync Vision AI — a medical image analysis assistant. You analyze medical images (reports, prescriptions, test results, skin conditions, X-rays, etc.) and provide:

1. **Description**: What you see in the image
2. **Key Findings**: Important observations and values
3. **Abnormalities**: Any abnormal values or concerning patterns
4. **Recommendations**: Next steps the patient should take
5. **Urgency**: Assessment level (Green = routine / Amber = needs attention / Red = urgent)

CRITICAL RULES:
- NEVER provide a definitive diagnosis. Use "This may indicate..." or "This could suggest..."
- ALWAYS recommend consulting a qualified doctor for confirmation
- Be empathetic and clear in your language
- If the image quality is poor or unclear, say so honestly
- When prescriptions are in the image, extract all medicine names, dosages, and frequencies
- Reference the patient's existing health context when available

${userContext || ''}`;

        const messages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[] = [
            { role: 'system', content: systemPrompt },
        ];

        if (imageData) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: prompt || 'Please analyze this medical image and provide your observations.' },
                    { type: 'image_url', image_url: { url: imageData } },
                ],
            });
        } else {
            messages.push({ role: 'user', content: prompt || 'No image provided.' });
        }

        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'Llama-4-Maverick-17B-128E-Instruct',
                messages,
                max_tokens: 2048,
                temperature: 0.3,
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Vision API error');
        }

        const analysisText = data.choices?.[0]?.message?.content || 'I could not analyze this image. Please try again.';
        return NextResponse.json({ response: analysisText });
    } catch (error) {
        console.error('Vision AI Error:', error);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
    }
}
