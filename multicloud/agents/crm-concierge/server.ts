import express from 'express';
import cors from 'cors';
import { InMemoryRunner } from '@google/adk';
import { conciergeAgent } from './index';

const app = express();
app.use(express.json());
app.use(cors());

// Initialize the InMemoryRunner
const runner = new InMemoryRunner({
  appName: 'crm-concierge-app',
  agent: conciergeAgent,
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
    } catch {
      await runner.sessionService.createSession({ appName, userId, sessionId });
    }

    const events = runner.runAsync({
      userId,
      sessionId: sessionId,
      newMessage: { role: 'user', parts: [{ text: message }] }
    });

    let reply = "The agent is thinking...";
    for await (const e of events) {
      if (e.author === conciergeAgent.name && e.content && e.content.parts) {
        const txt = e.content.parts.find((c: any) => c.text);
        if (txt && txt.text) reply = txt.text;
      }
    }

    res.json({ response: reply });
  } catch (err: any) {
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
