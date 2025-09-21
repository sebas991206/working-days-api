"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const luxon_1 = require("luxon");
const holidayProvider_1 = require("./services/holidayProvider");
const parsing_1 = require("./utils/parsing");
const businessTime_1 = require("./utils/businessTime");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const holidayProvider = new holidayProvider_1.CaptaHolidayProvider();
app.get("/api/calc", async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    let q;
    try {
        q = (0, parsing_1.parseQuery)(req.query);
    }
    catch (e) {
        return sendError(res, 400, "InvalidParameters", humanError(e?.message));
    }
    let startLocal;
    if (q.date) {
        const utc = luxon_1.DateTime.fromISO(q.date, { zone: "utc" });
        if (!utc.isValid) {
            return sendError(res, 400, "InvalidDate", "Invalid ISO UTC date.");
        }
        startLocal = utc.setZone(businessTime_1.TZ);
    }
    else {
        startLocal = luxon_1.DateTime.now().setZone(businessTime_1.TZ);
    }
    let holidays;
    try {
        holidays = await holidayProvider.load();
    }
    catch {
        return sendError(res, 503, "ServiceUnavailable", "Failed to load Colombian holidays.");
    }
    let current = (0, businessTime_1.roundBackwardToWorkBoundary)(startLocal, holidays);
    if (q.days) {
        current = (0, businessTime_1.addBusinessDays)(current, q.days, holidays);
    }
    if (q.hours) {
        current = (0, businessTime_1.addBusinessHours)(current, q.hours, holidays);
    }
    const outIso = current.setZone("utc").toISO({ suppressMilliseconds: true });
    if (!outIso) {
        return sendError(res, 503, "ServiceUnavailable", "Failed to produce ISO UTC output.");
    }
    const body = { date: outIso };
    return res.status(200).json(body);
});
app.use((_req, res) => {
    res
        .status(404)
        .json({ error: "InvalidParameters", message: "Route not found" });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
function sendError(res, status, error, message) {
    const payload = { error, message };
    res.status(status).json(payload);
}
function humanError(code) {
    switch (code) {
        case "MissingParams":
            return 'At least one of "days" or "hours" is required.';
        case "InvalidDays":
            return '"days" must be a positive integer.';
        case "InvalidHours":
            return '"hours" must be a positive integer.';
        case "InvalidDate":
            return '"date" must be an ISO UTC string with suffix Z.';
        default:
            return "Invalid parameters.";
    }
}
