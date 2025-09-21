"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptaHolidayProvider = void 0;
const luxon_1 = require("luxon");
function isIsoDateOnly(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
class CaptaHolidayProvider {
    static URL = "https://content.capta.co/Recruitment/WorkingDays.json";
    cache = null;
    lastLoaded = null;
    TTL_MS = 60 * 60 * 1000;
    async load() {
        const now = Date.now();
        if (this.cache && this.lastLoaded && now - this.lastLoaded < this.TTL_MS) {
            return this.cache;
        }
        let raw;
        try {
            const res = await fetch(CaptaHolidayProvider.URL, { method: "GET" });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            raw = await res.json();
        }
        catch {
            throw new Error("FailedToFetchHolidays");
        }
        const candidateSet = this.normalizeToSet(raw);
        if (!candidateSet || candidateSet.size === 0) {
            throw new Error("EmptyHolidayList");
        }
        const normalized = new Set();
        for (const d of candidateSet) {
            if (isIsoDateOnly(d)) {
                const dt = luxon_1.DateTime.fromISO(d, { zone: "utc" });
                if (dt.isValid)
                    normalized.add(dt.toISODate());
                continue;
            }
            if (typeof d === "string") {
                const dt = luxon_1.DateTime.fromISO(d, { zone: "utc" });
                if (dt.isValid) {
                    const only = dt.toISODate();
                    if (only)
                        normalized.add(only);
                }
            }
        }
        if (normalized.size === 0) {
            throw new Error("EmptyHolidayList");
        }
        this.cache = normalized;
        this.lastLoaded = Date.now();
        return this.cache;
    }
    normalizeToSet(raw) {
        const out = new Set();
        if (Array.isArray(raw)) {
            raw.forEach((d) => typeof d === "string" && out.add(d));
            return out;
        }
        if (raw && typeof raw === "object") {
            const maybe = raw["holidays"];
            if (Array.isArray(maybe)) {
                maybe.forEach((d) => typeof d === "string" && out.add(d));
                return out;
            }
            for (const v of Object.values(raw)) {
                if (Array.isArray(v)) {
                    v.forEach((d) => typeof d === "string" && out.add(d));
                }
            }
        }
        return out;
    }
}
exports.CaptaHolidayProvider = CaptaHolidayProvider;
