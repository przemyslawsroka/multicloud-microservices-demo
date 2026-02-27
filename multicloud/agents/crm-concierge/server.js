"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const adk_1 = require("@google/adk");
const index_1 = require("./index");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Initialize the InMemoryRunner
const runner = new adk_1.InMemoryRunner({
    appName: 'crm-concierge-app',
    agent: index_1.conciergeAgent,
});
app.post('/v1/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default-session' } = req.body;
        // Execute the runner async generator
        const appName = 'crm-concierge-app';
        const userId = 'local-user';
        // Ensure session exists
        try {
            await runner.sessionService.getSession({ appName, userId, sessionId });
        }
        catch {
            await runner.sessionService.createSession({ appName, userId, sessionId });
        }
        const events = runner.runAsync({
            userId,
            sessionId: sessionId,
            newMessage: { role: 'user', parts: [{ text: message }] }
        });
        let reply = "The agent is thinking...";
        for await (const e of events) {
            if (e.author === index_1.conciergeAgent.name && e.content && e.content.parts) {
                const txt = e.content.parts.find((c) => c.text);
                if (txt && txt.text)
                    reply = txt.text;
            }
        }
        res.json({ response: reply });
    }
    catch (err) {
        console.error('Agent Failure:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/v1/chat/clear', async (req, res) => {
    // To clear session we can just use a new sessionId
    res.json({ success: true, message: "Use a new sessionId to clear context." });
});
const PORT = 9083;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`ADK Agent (Concierge) running on port ${PORT}`);
});
