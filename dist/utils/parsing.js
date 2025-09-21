"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQuery = parseQuery;
function parsePositiveInt(value) {
    if (!/^\d+$/.test(value))
        return null;
    const n = Number(value);
    return n > 0 ? n : null;
}
function parseIsoUtc(value) {
    return value.endsWith("Z") ? value : null;
}
function parseQuery(qp) {
    const daysRaw = qp["days"];
    const hoursRaw = qp["hours"];
    const dateRaw = qp["date"];
    const q = {};
    if (typeof daysRaw === "string" && daysRaw.trim() !== "") {
        const n = parsePositiveInt(daysRaw);
        if (n == null)
            throw new Error("InvalidDays");
        q.days = n;
    }
    if (typeof hoursRaw === "string" && hoursRaw.trim() !== "") {
        const n = parsePositiveInt(hoursRaw);
        if (n == null)
            throw new Error("InvalidHours");
        q.hours = n;
    }
    if (typeof dateRaw === "string" && dateRaw.trim() !== "") {
        const iso = parseIsoUtc(dateRaw);
        if (iso == null)
            throw new Error("InvalidDate");
        q.date = iso;
    }
    if (q.days == null && q.hours == null) {
        throw new Error("MissingParams");
    }
    return q;
}
