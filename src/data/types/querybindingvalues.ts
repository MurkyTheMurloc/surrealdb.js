import type { Gap } from "../../cbor";
import type { RecordId, StringRecordId } from "./recordid";
import type { Table } from "./table";
import type { Uuid } from "./uuid";
export type SurqlFuture<F extends string> = `<future> ${F}`;

export type SocketConnectionVariables<K extends string, V> = Record<K, V>;

type BrandedError<Msg extends string, T> = T & { __brand: Msg };
type SqlKeyword =
	| "SELECT"
	| "INSERT"
	| "UPDATE"
	| "DELETE"
	| "CREATE"
	| "DROP"
	| "select"
	| "insert"
	| "update"
	| "delete"
	| "create"
	| "drop";
type IsSurqlQuery<T extends string> = T extends `${SqlKeyword} ${string}`
	? true
	: false;

type IsRecord<T extends string> = T extends `${string}:${string}`
	? true
	: false;

type IsUuid<T extends string> =
	T extends `${string}-${string}-${string}-${string}-${string}` ? true : false;

type IsIsoDate<T extends string> =
	T extends `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`
		? true
		: T extends `${number}-${number}-${number}T${number}:${number}:${number}Z` // Without milliseconds
			? true
			: false;

export type SurqlQueryBindingValue =
	| SurqlFuture<string>
	| Date
	| string
	| StringRecordId
	| RecordId
	| Uuid
	| boolean
	| Gap
	| Table
	| number;

export type AssertValidSurqlValue<
	T extends string,
	V extends SurqlQueryBindingValue = SurqlQueryBindingValue,
> = IsIsoDate<T> extends true
	? BrandedError<"Use d`…` for ISO-dates", T>
	: IsUuid<T> extends true
		? BrandedError<"Use u`…` instead for UUIDs", T>
		: IsRecord<T> extends true
			? BrandedError<"Use r`…` instead for record IDs", T>
			: IsSurqlQuery<T> extends true
				? BrandedError<"Use f`…` instead for futures", T>
				: V;

export type MustBeSurqlValue<V> = V extends Date
	? V
	: V extends Table
		? V
		: V extends boolean
			? V
			: V extends Gap
				? V
				: V extends number
					? V
					: V extends Uuid
						? V
						: V extends StringRecordId
							? V
							: V extends Date
								? V
								: V extends RecordId
									? V
									: V extends string
										? AssertValidSurqlValue<V>
										: V extends unknown
											? V
											: never;
