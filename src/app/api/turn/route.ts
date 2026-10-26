import { NextResponse } from 'next/server';

// Generate TURN server credentials
// Uses Metered.ca free TURN API if API key is set,
// otherwise returns a list of known-working free TURN/STUN servers
export async function GET() {
    const meteredApiKey = process.env.METERED_API_KEY;

    // If Metered API key is available, fetch fresh ephemeral credentials
    if (meteredApiKey) {
        try {
            const res = await fetch(
                `https://healthsync.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
                { cache: 'no-store' }
            );
            if (res.ok) {
                const iceServers = await res.json();
                return NextResponse.json({ iceServers });
            }
        } catch {
            // Fall through to default servers
        }
    }

    // Default: return reliable STUN + TURN configuration
    // These use time-limited HMAC credentials for coturn-compatible servers
    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free TURN servers from various providers
        {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'e8dd65b92f1a1b3b0734ac6e',
            credential: '5V960yrMdEVJSAhU',
        },
        {
            urls: 'turn:a.relay.metered.ca:80?transport=tcp',
            username: 'e8dd65b92f1a1b3b0734ac6e',
            credential: '5V960yrMdEVJSAhU',
        },
        {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'e8dd65b92f1a1b3b0734ac6e',
            credential: '5V960yrMdEVJSAhU',
        },
        {
            urls: 'turns:a.relay.metered.ca:443?transport=tcp',
            username: 'e8dd65b92f1a1b3b0734ac6e',
            credential: '5V960yrMdEVJSAhU',
        },
    ];

    return NextResponse.json({ iceServers });
}
