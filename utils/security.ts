
// --- NEURAL GUARD PROTOCOL ---
// Client-side rate limiting and sanitization utilities.

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number; // Time window in milliseconds
}

const LIMITS: Record<string, RateLimitConfig> = {
    'generate_quiz': { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 per day
    'generate_podcast': { maxRequests: 2, windowMs: 24 * 60 * 60 * 1000 }, // 2 per day
    'generate_path': { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 per day
    'ai_chat': { maxRequests: 20, windowMs: 60 * 60 * 1000 } // 20 per hour
};

export const checkRateLimit = (actionType: string): { allowed: boolean; waitTime?: string } => {
    const config = LIMITS[actionType];
    if (!config) return { allowed: true };

    const key = `neurally_limit_${actionType}`;
    const now = Date.now();
    
    try {
        const record = JSON.parse(localStorage.getItem(key) || '{"count": 0, "startTime": 0}');
        
        // Reset window if expired
        if (now - record.startTime > config.windowMs) {
            localStorage.setItem(key, JSON.stringify({ count: 1, startTime: now }));
            return { allowed: true };
        }

        // Check limit
        if (record.count >= config.maxRequests) {
            const timeLeft = config.windowMs - (now - record.startTime);
            const hours = Math.ceil(timeLeft / (1000 * 60 * 60));
            return { allowed: false, waitTime: `${hours} hours` };
        }

        // Increment
        record.count += 1;
        localStorage.setItem(key, JSON.stringify(record));
        return { allowed: true };

    } catch (e) {
        // If storage fails, default to allow but log error (fail open)
        console.error("Rate limit check failed", e);
        return { allowed: true };
    }
};

export const sanitizeInput = (input: string): string => {
    if (!input) return "";
    // 1. Trim whitespace
    let clean = input.trim();
    
    // 2. Remove potential HTML/Script tags (Basic XSS prevention)
    clean = clean.replace(/<[^>]*>?/gm, '');
    
    // 3. Limit length to prevent token overflow attacks
    if (clean.length > 20000) {
        clean = clean.substring(0, 20000);
    }

    return clean;
};

export const getRemainingQuota = (actionType: string): number => {
    const config = LIMITS[actionType];
    if (!config) return 0;
    const key = `neurally_limit_${actionType}`;
    try {
        const record = JSON.parse(localStorage.getItem(key) || '{"count": 0, "startTime": 0}');
        const now = Date.now();
        if (now - record.startTime > config.windowMs) return config.maxRequests;
        return Math.max(0, config.maxRequests - record.count);
    } catch {
        return config.maxRequests;
    }
};
