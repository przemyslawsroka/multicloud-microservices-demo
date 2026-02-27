---
name: crm_mcp_agent_architecture
description: Demonstrates how a Front-Desk Concierge AI can delegate deterministic database tasks via MCP to a Back-Office CRM Agent.
---

# Demonstrating MCP and Agent-to-Agent (A2A) Architecture

## Overview
This skill demonstrates a powerful enterprise scenario: securely exposing private relational data (like the CRM SQLite and Ecommerce backend) to an AI without giving it direct raw querying power. Instead, we use the standard **Model Context Protocol (MCP)**, consumed by highly constrained **ADK Agents**.

1. **CRM MCP Server**: The backend (`app.js`) exposes two deterministic tools over SSE (`lookup_customer` and `find_order`). No raw SQL is ever exposed.
2. **Back-Office Agent (`crm_investigator`)**: A constrained TypeScript agent running in the Vertex AI Agent Engine. It natively implements an MCP client and is strictly instructed to query tools to answer requests.
3. **Supervisor Agent (`frontend_concierge`)**: The agent the user talks to out front. It delegates requests via **A2A (Agent-to-Agent) communication** to the investigator when it needs real facts.

## Scenario
1. Bring up the **CRM Application** at `http://localhost:9082`.
2. Notice the new **Concierge AI Widget** floating in the bottom right corner of the Dashboard.
3. Click the widget to start a conversation. 
4. Pretend to be a customer checking on an order or inquiring about an account.

### Suggested Execution (Chat Input)
*   **"Hi, my name is John Doe. Could you look up how much money I've spent in total across all my orders?"**
    *   *What happens:* The Concierge realizes it needs data and delegates to the `crm_investigator`. The investigator uses the MCP `lookup_customer` call. The backend aggregates orders and responds. The Concierge formats an elegant reply.
*   **"Can you find the status of my order tracking ID UPS-123?"**
    *   *What happens:* The investigator triggers the `find_order` MCP tool, fetches the backend value without exposing the raw internal database schema, and passes the context back to the Concierge.

## Behind the Scenes
This guarantees high fidelity. By chaining `frontend_concierge -> crm_investigator -> CRM MCP Server`, you strictly decouple the LLM logic from unauthorized backend execution while preserving conversational elegance!
