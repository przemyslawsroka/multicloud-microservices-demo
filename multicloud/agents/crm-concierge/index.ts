import {
  LlmAgent,
  FunctionTool,
  Gemini
} from '@google/adk';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// ==========================================
// 1. The MCP Adapter Tool (Connects to CRM Backend)
// ==========================================
export const crmDatabaseQueryTool = new FunctionTool({
  name: 'crm_database_query',
  description: 'Perform a deterministic query on the CRM database utilizing the standard Model Context Protocol (MCP). Use operation "lookup_customer" (params: name, surname) or "find_order" (params: trackingId).',
  parameters: z.object({
    operation: z.enum(['lookup_customer', 'find_order']),
    name: z.string().optional(),
    surname: z.string().optional(),
    trackingId: z.string().optional()
  }),
  execute: async (params) => {
    const transport = new SSEClientTransport(new URL('http://localhost:9081/sse'));
    const client = new Client({ name: "adk-backend-worker", version: "1.0.0" }, { capabilities: {} });

    try {
      await client.connect(transport);

      let args = {};
      if (params.operation === 'lookup_customer') {
        args = { name: params.name, surname: params.surname };
      } else if (params.operation === 'find_order') {
        args = { trackingId: params.trackingId };
      }

      console.log(`[MCP Client] Executing ${params.operation}...`);
      const result = await client.callTool({ name: params.operation, arguments: args });
      return JSON.stringify(result.content);
    } catch (e: any) {
      return `[MCP Client Error] ${e.message}`;
    }
  }
});

// ==========================================
// 2. The Back-Office CRM Agent (Worker)
// ==========================================
// The worker is explicitly given access to the MCP layer. It understands database models.
const crmWorkerAgent = new LlmAgent({
  name: 'crm_investigator',
  model: new Gemini({ model: 'gemini-3-flash-preview', vertexai: true }),
  tools: [crmDatabaseQueryTool],
  instruction: `
    You are the 'CRM Investigator', a specialized back-office worker agent.
    You have exclusive access to the CRM Backend database via the Model Context Protocol (MCP).
    When asked about a customer or order, you MUST use the 'crm_database_query' tool.
    Never guess data. Only report exactly what the database tool returns.
  `
});

// ==========================================
// 3. The Front-Desk Concierge Agent (Supervisor)
// ==========================================
// The concierge talks to the user, but utilizes A2A (Agent-to-Agent) communication 
// to ask the crm_investigator to do the heavy lifting safely.
export const conciergeAgent = new LlmAgent({
  name: 'frontend_concierge',
  model: new Gemini({ model: 'gemini-3-flash-preview', vertexai: true }),
  subAgents: [crmWorkerAgent],
  // tools: [crmWorkerAgent.asTool()], // In ADK 0.2+, subAgents property handles A2A delegation magically, but asTool() is explicitly clear.
  instruction: `
    You are the 'Frontend Concierge'. You talk directly to retail customers using the e-commerce platform.
    You DO NOT have direct access to internal databases.
    If you need to verify an order or check customer metrics (like lifetime revenue), you MUST ask the 'crm_investigator' agent to look it up for you.
    Be extremely polite, concise, and professional. 
    Never reveal internal tracking IDs or exact backend schema details like 'lifetimeRevenue' variable names to the user. Translate them into natural speech (e.g. "total amount spent").
    Remember, we do not have a hardcoded 'VIP' status flag. VIP is purely based on how much they've spent (e.g. over $1000).
  `
});
