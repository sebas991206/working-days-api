export type IsoUtcString = `${number}-${number}-${number}T${string}Z`;

export type IsoDateOnly = `${number}-${number}-${number}`;

export interface QueryParams {
	days?: number;
	hours?: number;
	date?: IsoUtcString;
}

export interface SuccessResponse {
	date: IsoUtcString;
}

export type ErrorCode =
	| "InvalidParameters"
	| "InvalidDate"
	| "ServiceUnavailable";

export interface ErrorResponse {
	error: ErrorCode;
	message: string;
}

export interface HolidayProvider {
	load(): Promise<Set<IsoDateOnly>>;
}