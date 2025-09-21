import { DateTime } from "luxon";
import { HolidayProvider, IsoDateOnly } from "../domain/types";

function isIsoDateOnly(value: unknown): value is IsoDateOnly {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export class CaptaHolidayProvider implements HolidayProvider {
	private static readonly URL = "https://content.capta.co/Recruitment/WorkingDays.json";
	private cache: Set<IsoDateOnly> | null = null;
	private lastLoaded: number | null = null;
	private readonly TTL_MS = 60 * 60 * 1000;

	public async load(): Promise<Set<IsoDateOnly>> {
		const now = Date.now();
		if (this.cache && this.lastLoaded && now - this.lastLoaded < this.TTL_MS) {
			return this.cache;
		}

		let raw: unknown;
		try {
			const res = await fetch(CaptaHolidayProvider.URL, { method: "GET" });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			raw = await res.json();
		} catch {
			throw new Error("FailedToFetchHolidays");
		}

		const candidateSet = this.normalizeToSet(raw);
		if (!candidateSet || candidateSet.size === 0) {
			throw new Error("EmptyHolidayList");
		}

		const normalized = new Set<IsoDateOnly>();
		for (const d of candidateSet) {
			if (isIsoDateOnly(d)) {
				const dt = DateTime.fromISO(d, { zone: "utc" });
				if (dt.isValid) normalized.add(dt.toISODate() as IsoDateOnly);
				continue;
			}

			if (typeof d === "string") {
				const dt = DateTime.fromISO(d, { zone: "utc" });
				if (dt.isValid) {
					const only = dt.toISODate();
					if (only) normalized.add(only as IsoDateOnly);
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

	private normalizeToSet(raw: unknown): Set<string> {
		const out = new Set<string>();

		if (Array.isArray(raw)) {
			raw.forEach((d) => typeof d === "string" && out.add(d));
			return out;
		}

		if (raw && typeof raw === "object") {
			const maybe = (raw as Record<string, unknown>)["holidays"];
			if (Array.isArray(maybe)) {
				maybe.forEach((d) => typeof d === "string" && out.add(d));
				return out;
			}

			for (const v of Object.values(raw as Record<string, unknown>)) {
				if (Array.isArray(v)) {
					v.forEach((d) => typeof d === "string" && out.add(d));
				}
			}
		}

		return out;
	}
}
