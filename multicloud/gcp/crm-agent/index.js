"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conciergeAgent = exports.crmDatabaseQueryTool = void 0;
var adk_1 = require("@google/adk");
var zod_1 = require("zod");
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var sse_js_1 = require("@modelcontextprotocol/sdk/client/sse.js");
// ==========================================
// 1. The MCP Adapter Tool (Connects to CRM Backend)
// ==========================================
exports.crmDatabaseQueryTool = new adk_1.FunctionTool({
    name: 'crm_database_query',
    description: 'Perform a deterministic query on the CRM database utilizing the standard Model Context Protocol (MCP). Use operation "lookup_customer" (params: name, surname) or "find_order" (params: trackingId).',
    parameters: zod_1.z.object({
        operation: zod_1.z.enum(['lookup_customer', 'find_order']),
        name: zod_1.z.string().optional(),
        surname: zod_1.z.string().optional(),
        trackingId: zod_1.z.string().optional()
    }),
    execute: function (params) { return __awaiter(void 0, void 0, void 0, function () {
        var backendUrl, transport, client, args, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    backendUrl = process.env.CRM_BACKEND_URL || 'http://localhost:9081';
                    transport = new sse_js_1.SSEClientTransport(new URL("".concat(backendUrl, "/sse")));
                    client = new index_js_1.Client({ name: "adk-backend-worker", version: "1.0.0" }, { capabilities: {} });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, client.connect(transport)];
                case 2:
                    _a.sent();
                    args = {};
                    if (params.operation === 'lookup_customer') {
                        args = { name: params.name, surname: params.surname };
                    }
                    else if (params.operation === 'find_order') {
                        args = { trackingId: params.trackingId };
                    }
                    console.log("[MCP Client] Executing ".concat(params.operation, "..."));
                    return [4 /*yield*/, client.callTool({ name: params.operation, arguments: args })];
                case 3:
                    result = _a.sent();
                    return [2 /*return*/, JSON.stringify(result.content)];
                case 4:
                    e_1 = _a.sent();
                    return [2 /*return*/, "[MCP Client Error] ".concat(e_1.message)];
                case 5: return [2 /*return*/];
            }
        });
    }); }
});
// ==========================================
// 2. The Back-Office CRM Agent (Worker)
// ==========================================
// The worker is explicitly given access to the MCP layer. It understands database models.
var crmWorkerAgent = new adk_1.LlmAgent({
    name: 'crm_investigator',
    model: new adk_1.Gemini({
        model: 'gemini-2.0-flash-exp',
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || 'gcp-ecommerce-demo',
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    }),
    tools: [exports.crmDatabaseQueryTool],
    instruction: "\n    You are the 'CRM Investigator', a specialized back-office worker agent.\n    You have exclusive access to the CRM Backend database via the Model Context Protocol (MCP).\n    When asked about a customer or order, you MUST use the 'crm_database_query' tool.\n    Never guess data. Only report exactly what the database tool returns.\n  "
});
// ==========================================
// 3. The Front-Desk Concierge Agent (Supervisor)
// ==========================================
// The concierge talks to the user, but utilizes A2A (Agent-to-Agent) communication 
// to ask the crm_investigator to do the heavy lifting safely.
exports.conciergeAgent = new adk_1.LlmAgent({
    name: 'frontend_concierge',
    model: new adk_1.Gemini({
        model: 'gemini-2.0-flash-exp',
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || 'gcp-ecommerce-demo',
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    }),
    subAgents: [crmWorkerAgent],
    // tools: [crmWorkerAgent.asTool()], // In ADK 0.2+, subAgents property handles A2A delegation magically, but asTool() is explicitly clear.
    instruction: "\n    You are the 'Frontend Concierge'. You talk directly to retail customers using the e-commerce platform.\n    You DO NOT have direct access to internal databases.\n    If you need to verify an order or check customer metrics (like lifetime revenue), you MUST ask the 'crm_investigator' agent to look it up for you.\n    Be extremely polite, concise, and professional. \n    Never reveal internal tracking IDs or exact backend schema details like 'lifetimeRevenue' variable names to the user. Translate them into natural speech (e.g. \"total amount spent\").\n    Remember, we do not have a hardcoded 'VIP' status flag. VIP is purely based on how much they've spent (e.g. over $1000).\n  "
});
exports.default = exports.conciergeAgent;
