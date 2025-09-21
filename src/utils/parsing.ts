import { QueryParams, IsoUtcString } from "../domain/types";

function parsePositiveInt(value: string): number | null {
	if (!/^\d+$/.test(value)) return null;
	const n = Number(value);
	return n > 0 ? n : null;
}

function parseIsoUtc(value: string): IsoUtcString | null {
	return value.endsWith("Z") ? (value as IsoUtcString) : null;
}

export function parseQuery(qp: Record<string, string | string[] | undefined>): QueryParams {
	const daysRaw = qp["days"];
	const hoursRaw = qp["hours"];
	const dateRaw = qp["date"];

	const q: QueryParams = {};

	if (typeof daysRaw === "string" && daysRaw.trim() !== "") {
		const n = parsePositiveInt(daysRaw);
		if (n == null) throw new Error("InvalidDays");
		q.days = n;
	}

	if (typeof hoursRaw === "string" && hoursRaw.trim() !== "") {
		const n = parsePositiveInt(hoursRaw);
		if (n == null) throw new Error("InvalidHours");
		q.hours = n;
	}

	if (typeof dateRaw === "string" && dateRaw.trim() !== "") {
		const iso = parseIsoUtc(dateRaw);
		if (iso == null) throw new Error("InvalidDate");
		q.date = iso;
	}

	if (q.days == null && q.hours == null) {
		throw new Error("MissingParams");
	}

	return q;
}
