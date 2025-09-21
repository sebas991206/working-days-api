import express, { Request, Response } from "express";
import { DateTime } from "luxon";
import { CaptaHolidayProvider } from "./services/holidayProvider";
import { parseQuery } from "./utils/parsing";
import { ErrorResponse, HolidayProvider, QueryParams, SuccessResponse, IsoUtcString, IsoDateOnly } from "./domain/types";
import { TZ, roundBackwardToWorkBoundary, addBusinessDays, addBusinessHours } from "./utils/businessTime";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const holidayProvider: HolidayProvider = new CaptaHolidayProvider();

app.get("/", (_req: Request, res: Response) => {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.json({ ok: true, ping: "Connect" });
});

app.get("/api/calc", async (req: Request, res: Response) => {
	res.setHeader("Content-Type", "application/json; charset=utf-8");

	let q: QueryParams;
	try {
		q = parseQuery(req.query as Record<string, string | string[] | undefined>);
	} catch (e: any) {
		return sendError(res, 400, "InvalidParameters", humanError(e?.message));
	}

	let startLocal: DateTime;
	if (q.date) {
		const utc = DateTime.fromISO(q.date, { zone: "utc" });
		if (!utc.isValid) {
			return sendError(res, 400, "InvalidDate", "Invalid ISO UTC date.");
		}

		startLocal = utc.setZone(TZ);
	} else {
		startLocal = DateTime.now().setZone(TZ);
	}

	let holidays: Set<IsoDateOnly>;
	try {
		holidays = await holidayProvider.load();
	} catch {
		return sendError(
			res,
			503,
			"ServiceUnavailable",
			"Failed to load Colombian holidays."
		);
	}

	let current = roundBackwardToWorkBoundary(startLocal, holidays);

	if (q.days) {
		current = addBusinessDays(current, q.days, holidays);
	}

	if (q.hours) {
		current = addBusinessHours(current, q.hours, holidays);
	}

	const outIso = current.setZone("utc").toISO({ suppressMilliseconds: true }) as IsoUtcString | null;
	if (!outIso) {
		return sendError(
			res,
			503,
			"ServiceUnavailable",
			"Failed to produce ISO UTC output."
		);
	}

	const body: SuccessResponse = { date: outIso };

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

function sendError(res: Response, status: number, error: ErrorResponse["error"], message: string ) {
	const payload: ErrorResponse = { error, message };
	res.status(status).json(payload);
}

function humanError(code: string | undefined): string {
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
