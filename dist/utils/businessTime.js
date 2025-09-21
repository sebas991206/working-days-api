"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TZ = void 0;
exports.isBusinessDay = isBusinessDay;
exports.roundBackwardToWorkBoundary = roundBackwardToWorkBoundary;
exports.nextBusinessDay = nextBusinessDay;
exports.prevBusinessDay = prevBusinessDay;
exports.addBusinessDays = addBusinessDays;
exports.addBusinessHours = addBusinessHours;
const luxon_1 = require("luxon");
exports.TZ = "America/Bogota";
const MORNING_START = { hour: 8, minute: 0 };
const MORNING_END = { hour: 12, minute: 0 };
const LUNCH_START = { hour: 12, minute: 0 };
const LUNCH_END = { hour: 13, minute: 0 };
const AFTER_START = { hour: 13, minute: 0 };
const AFTER_END = { hour: 17, minute: 0 };
function isWeekend(dt) {
    const wk = dt.weekday;
    return wk === 6 || wk === 7;
}
function isBusinessDay(dt, holidays) {
    if (isWeekend(dt))
        return false;
    const d = dt.toISODate();
    if (!d)
        return true;
    return !holidays.has(d);
}
function at(dt, h, m = 0) {
    return dt.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}
function inRange(dt, start, end) {
    return dt >= start && dt < end;
}
function isInMorning(dt) {
    const s = at(dt, MORNING_START.hour);
    const e = at(dt, MORNING_END.hour);
    return inRange(dt, s, e);
}
function isInLunch(dt) {
    const s = at(dt, LUNCH_START.hour);
    const e = at(dt, LUNCH_END.hour);
    return inRange(dt, s, e);
}
function isInAfternoon(dt) {
    const s = at(dt, AFTER_START.hour);
    const e = at(dt, AFTER_END.hour);
    return inRange(dt, s, e);
}
function roundBackwardToWorkBoundary(dtLocal, holidays) {
    let dt = dtLocal;
    while (!isBusinessDay(dt, holidays)) {
        dt = prevBusinessDay(dt, holidays).set({ hour: AFTER_END.hour, minute: 0, second: 0, millisecond: 0 });
    }
    const before0800 = dt < at(dt, MORNING_START.hour);
    const inLunch = isInLunch(dt);
    const after1700 = dt >= at(dt, AFTER_END.hour);
    if (before0800) {
        const prev = prevBusinessDay(dt, holidays).set({ hour: AFTER_END.hour, minute: 0, second: 0, millisecond: 0 });
        return prev;
    }
    if (inLunch) {
        return at(dt, LUNCH_START.hour);
    }
    if (after1700) {
        return at(dt, AFTER_END.hour);
    }
    return dt.set({ second: 0, millisecond: 0 });
}
function nextBusinessDay(dt, holidays) {
    let d = dt.plus({ days: 1 }).startOf("day");
    while (!isBusinessDay(d, holidays)) {
        d = d.plus({ days: 1 });
    }
    return d;
}
function prevBusinessDay(dt, holidays) {
    let d = dt.minus({ days: 1 }).startOf("day");
    while (!isBusinessDay(d, holidays)) {
        d = d.minus({ days: 1 });
    }
    return d;
}
function addBusinessDays(dtLocal, days, holidays) {
    let d = dtLocal;
    for (let i = 0; i < days; i++) {
        const next = nextBusinessDay(d, holidays);
        d = next.set({ hour: d.hour, minute: d.minute, second: 0, millisecond: 0 });
    }
    return d;
}
function moveToNextWorkingSlot(dt, holidays) {
    if (!isBusinessDay(dt, holidays)) {
        const nb = nextBusinessDay(dt, holidays);
        return at(nb, MORNING_START.hour);
    }
    if (dt < at(dt, MORNING_START.hour)) {
        return at(dt, MORNING_START.hour);
    }
    if (isInLunch(dt)) {
        return at(dt, AFTER_START.hour);
    }
    if (dt >= at(dt, AFTER_END.hour)) {
        const nb = nextBusinessDay(dt, holidays);
        return at(nb, MORNING_START.hour);
    }
    return dt.set({ second: 0, millisecond: 0 });
}
function addBusinessHours(dtLocal, hours, holidays) {
    let dt = moveToNextWorkingSlot(dtLocal, holidays);
    let remainingMin = Math.round(luxon_1.Duration.fromObject({ hours }).as("minutes"));
    while (remainingMin > 0) {
        if (isInMorning(dt)) {
            const end = at(dt, MORNING_END.hour);
            const avail = Math.round(end.diff(dt, "minutes").minutes);
            if (remainingMin <= avail) {
                return dt.plus({ minutes: remainingMin }).set({ second: 0, millisecond: 0 });
            }
            dt = at(dt, AFTER_START.hour);
            remainingMin -= avail;
            continue;
        }
        if (isInAfternoon(dt)) {
            const end = at(dt, AFTER_END.hour);
            const avail = Math.round(end.diff(dt, "minutes").minutes);
            if (remainingMin <= avail) {
                return dt.plus({ minutes: remainingMin }).set({ second: 0, millisecond: 0 });
            }
            const nb = nextBusinessDay(dt, holidays);
            dt = at(nb, MORNING_START.hour);
            remainingMin -= avail;
            continue;
        }
        dt = moveToNextWorkingSlot(dt, holidays);
    }
    return dt.set({ second: 0, millisecond: 0 });
}
