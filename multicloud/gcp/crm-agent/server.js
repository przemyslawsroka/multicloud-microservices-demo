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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var adk_1 = require("@google/adk");
var index_1 = require("./index");
var app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Initialize the InMemoryRunner
var runner = new adk_1.InMemoryRunner({
    appName: 'crm-concierge-app',
    agent: index_1.conciergeAgent,
});
app.post('/v1/chat', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, message, _b, sessionId, appName, userId, _c, events, reply, _d, events_1, events_1_1, e, txt, e_1_1, err_1;
    var _e, e_1, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 18, , 19]);
                _a = req.body, message = _a.message, _b = _a.sessionId, sessionId = _b === void 0 ? 'default-session' : _b;
                appName = 'crm-concierge-app';
                userId = 'local-user';
                _h.label = 1;
            case 1:
                _h.trys.push([1, 3, , 5]);
                return [4 /*yield*/, runner.sessionService.getSession({ appName: appName, userId: userId, sessionId: sessionId })];
            case 2:
                _h.sent();
                return [3 /*break*/, 5];
            case 3:
                _c = _h.sent();
                return [4 /*yield*/, runner.sessionService.createSession({ appName: appName, userId: userId, sessionId: sessionId })];
            case 4:
                _h.sent();
                return [3 /*break*/, 5];
            case 5:
                events = runner.runAsync({
                    userId: userId,
                    sessionId: sessionId,
                    newMessage: { role: 'user', parts: [{ text: message }] }
                });
                reply = "The agent is thinking...";
                _h.label = 6;
            case 6:
                _h.trys.push([6, 11, 12, 17]);
                _d = true, events_1 = __asyncValues(events);
                _h.label = 7;
            case 7: return [4 /*yield*/, events_1.next()];
            case 8:
                if (!(events_1_1 = _h.sent(), _e = events_1_1.done, !_e)) return [3 /*break*/, 10];
                _g = events_1_1.value;
                _d = false;
                e = _g;
                if (e.author === index_1.conciergeAgent.name && e.content && e.content.parts) {
                    txt = e.content.parts.find(function (c) { return c.text; });
                    if (txt && txt.text)
                        reply = txt.text;
                }
                _h.label = 9;
            case 9:
                _d = true;
                return [3 /*break*/, 7];
            case 10: return [3 /*break*/, 17];
            case 11:
                e_1_1 = _h.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 17];
            case 12:
                _h.trys.push([12, , 15, 16]);
                if (!(!_d && !_e && (_f = events_1.return))) return [3 /*break*/, 14];
                return [4 /*yield*/, _f.call(events_1)];
            case 13:
                _h.sent();
                _h.label = 14;
            case 14: return [3 /*break*/, 16];
            case 15:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 16: return [7 /*endfinally*/];
            case 17:
                res.json({ response: reply });
                return [3 /*break*/, 19];
            case 18:
                err_1 = _h.sent();
                console.error('Agent Failure:', err_1);
                res.status(500).json({ error: err_1.message });
                return [3 /*break*/, 19];
            case 19: return [2 /*return*/];
        }
    });
}); });
app.post('/v1/chat/clear', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // To clear session we can just use a new sessionId
        res.json({ success: true, message: "Use a new sessionId to clear context." });
        return [2 /*return*/];
    });
}); });
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9083;
app.listen(PORT, '0.0.0.0', function () {
    console.log("ADK Agent (Concierge) running on port ".concat(PORT));
});
