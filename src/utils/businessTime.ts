import { DateTime, Duration } from "luxon";
import type { IsoDateOnly } from "../domain/types";

export const TZ = "America/Bogota";
const MORNING_START = { hour: 8, minute: 0 };
const MORNING_END = { hour: 12, minute: 0 };
const LUNCH_START = { hour: 12, minute: 0 };
const LUNCH_END = { hour: 13, minute: 0 };
const AFTER_START = { hour: 13, minute: 0 };
const AFTER_END = { hour: 17, minute: 0 };

function isWeekend(dt: DateTime): boolean {
	const wk = dt.weekday;
	return wk === 6 || wk === 7;
}

export function isBusinessDay(dt: DateTime, holidays: Set<IsoDateOnly>): boolean {
	if (isWeekend(dt)) return false;
	return !holidays.has(dt.toISODate()!);
}

function at(dt: DateTime, h: number, m = 0): DateTime {
	return dt.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

function inRange(dt: DateTime, start: DateTime, end: DateTime): boolean {
	return dt >= start && dt < end;
}

function isInMorning(dt: DateTime): boolean {
	const s = at(dt, MORNING_START.hour);
	const e = at(dt, MORNING_END.hour);
	return inRange(dt, s, e);
}

function isInLunch(dt: DateTime): boolean {
	const s = at(dt, LUNCH_START.hour);
	const e = at(dt, LUNCH_END.hour);
	return inRange(dt, s, e);
}

function isInAfternoon(dt: DateTime): boolean {
	const s = at(dt, AFTER_START.hour);
	const e = at(dt, AFTER_END.hour);
	return inRange(dt, s, e);
}

export function roundBackwardToWorkBoundary(dtLocal: DateTime, holidays: Set<IsoDateOnly>): DateTime {
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

export function nextBusinessDay(dt: DateTime, holidays: Set<IsoDateOnly>): DateTime {
	let d = dt.plus({ days: 1 }).startOf("day");

	while (!isBusinessDay(d, holidays)) {
		d = d.plus({ days: 1 });
	}

	return d;
}

export function prevBusinessDay(dt: DateTime, holidays: Set<IsoDateOnly>): DateTime {
	let d = dt.minus({ days: 1 }).startOf("day");

	while (!isBusinessDay(d, holidays)) {
		d = d.minus({ days: 1 });
	}

	return d;
}

export function addBusinessDays(dtLocal: DateTime, days: number, holidays: Set<IsoDateOnly>): DateTime {
	let d = dtLocal;

	for (let i = 0; i < days; i++) {
		const next = nextBusinessDay(d, holidays);
		d = next.set({ hour: d.hour, minute: d.minute, second: 0, millisecond: 0 });
	}

	return d;
}

function moveToNextWorkingSlot(dt: DateTime, holidays: Set<IsoDateOnly>): DateTime {
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

export function addBusinessHours(dtLocal: DateTime, hours: number, holidays: Set<IsoDateOnly>): DateTime {
	let dt = moveToNextWorkingSlot(dtLocal, holidays);
	let remainingMin = Math.round(Duration.fromObject({ hours }).as("minutes"));

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
