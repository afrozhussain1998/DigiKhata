// Web Speech API wrapper for Adding Transaction
const speech = {
    recognition: null,
    isListening: false,
    callback: null,

    init() {
        // Check support
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!window.SpeechRecognition) {
            console.warn('Speech Recognition API not supported in this browser.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-IN'; // Fallback to en-IN, supports English mapping
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onStartCallback) this.onStartCallback();
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (this.callback) this.callback(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech Recognition Error', event.error);
            if (this.onErrorCallback) this.onErrorCallback(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            clearTimeout(this.timeoutId);
            if (this.onEndCallback) this.onEndCallback();
        };
    },

    start(onResult, onStart, onEnd, onError, timeoutMs = 30000) {
        if (!this.recognition) return false;

        this.callback = onResult;
        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;
        this.onErrorCallback = onError;

        try {
            this.recognition.start();
            // Automatically stop after the specified timeout (default 10s as requested)
            this.timeoutId = setTimeout(() => {
                this.stop();
            }, timeoutMs);
            return true;
        } catch (err) {
            return false;
        }
    },

    stop() {
        clearTimeout(this.timeoutId);
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    // Parse voice string to extract amount and description
    parseTransactionVoice(text) {
        // e.g., "500 rupees for sugar" or "1000 payment received"
        const lowerText = text.toLowerCase();

        // Extract first number found
        const match = lowerText.match(/\d+/);
        let amount = match ? parseInt(match[0], 10) : 0;

        // Default values
        let desc = lowerText;

        // Remove the number and common words from description
        if (amount > 0) {
            desc = lowerText.replace(match[0], '').replace('rupees', '').replace('rs', '').trim();
        }

        return { amount, details: desc };
    },

    // Global voice parser for dashboard interactions
    // Priority: Expense > Customer > Paid > Credit (broadest catch-all)
    parseGlobalVoice(text) {
        const lower = text.toLowerCase().trim();

        // Helper: extract first number from a string
        const extractAmount = (str) => {
            const m = str.match(/\d+/);
            return m ? parseInt(m[0], 10) : 0;
        };

        // Helper: extract description after 'for' or 'ke liye'
        const extractDescription = (str) => {
            if (str.includes(' for ')) {
                const parts = str.split(' for ');
                return { before: parts[0].trim(), desc: 'For ' + parts.slice(1).join(' for ').trim() };
            }
            if (str.includes(' ke liye ')) {
                const parts = str.split(' ke liye ');
                return { before: parts[0].trim(), desc: 'For ' + parts.slice(1).join(' ke liye ').trim() };
            }
            return { before: str, desc: '' };
        };

        // ─── 1. EXPENSE (highest priority — "expense" or "spent" keyword) ───
        if (/expense|spent|kharcha|kharche/.test(lower)) {
            const amount = extractAmount(lower);
            let cleaned = lower.replace(/\d+/g, '').replace(/expense|add|spent|kharcha|kharche|rupees|rs|for/g, '').trim();
            return { intent: 'add_expense', amount, description: cleaned || 'Voice Expense' };
        }

        // ─── 2. ADD CUSTOMER (explicit "customer" keyword) ───
        if (/\b(add|new)\s+(customer|client)\b|\bcustomer\s+(add|new)\b/.test(lower)) {
            let nameStr = lower.replace(/add|new|customer|client/g, '').trim();
            let phone = '0000000000';
            if (/phone|number|mobile/.test(nameStr)) {
                const parts = nameStr.split(/phone|number|mobile/);
                nameStr = parts[0].trim();
                phone = (parts[1] || '').replace(/\D/g, '').trim() || '0000000000';
            }
            return { intent: 'add_customer', name: nameStr, phone };
        }

        // ─── 3. PAID / RECEIVED (check BEFORE credit, since "paid" is more specific) ───
        if (/\b(paid|payment|received|receive|got|jama|aaya|vasool)\b/.test(lower)) {
            const amount = extractAmount(lower);
            // Extract description from the ORIGINAL string first, before stripping anything
            const { before: rawBefore, desc } = extractDescription(lower);
            // Now strip action words/numbers from the before portion to get the customer name
            let nameStr = rawBefore.replace(/\d+/g, '').replace(/\b(paid|payment|received|receive|got|jama|aaya|vasool|rupees|rs|from|by)\b/g, '').trim();
            return { intent: 'add_transaction', type: 'Paid', amount, customerName: nameStr, description: desc || 'Added via Voice' };
        }

        // ─── 4. CREDIT / GIVE (broadest — "add", "give", etc.) ───
        // This is checked LAST because "add" is a very common word
        if (/\b(add|credit|give|gave|given|sent|lent|diya|diye|udhaar)\b/.test(lower)) {
            const amount = extractAmount(lower);
            // Extract description from the ORIGINAL string first
            const { before: rawBefore, desc } = extractDescription(lower);
            // Strip action words/numbers from the before portion to get the customer name
            let nameStr = rawBefore.replace(/\d+/g, '').replace(/\b(add|credit|give|gave|given|sent|lent|diya|diye|udhaar|rupees|rs|to)\b/g, '').trim();
            return { intent: 'add_transaction', type: 'Credit', amount, customerName: nameStr, description: desc || 'Added via Voice' };
        }

        // ─── 5. LAST RESORT: if there's a number, assume credit transaction ───
        const fallbackAmount = extractAmount(lower);
        if (fallbackAmount > 0) {
            const { before: rawBefore, desc } = extractDescription(lower);
            let nameStr = rawBefore.replace(/\d+/g, '').replace(/\b(rupees|rs|to)\b/g, '').trim();
            return { intent: 'add_transaction', type: 'Credit', amount: fallbackAmount, customerName: nameStr, description: desc || 'Added via Voice' };
        }

        return { intent: 'unknown', text };
    }
};

speech.init();
