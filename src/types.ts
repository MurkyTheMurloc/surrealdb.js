import type { AuthController } from "./auth";
import { type RecordId, Uuid } from "./data";

import type { Fill } from "./cbor";
import type {
	MustBeSurqlValue,
	SurqlQueryBindingValue,
} from "./data/types/querybindingvalues";
import { SurrealDbError } from "./errors";
import type { Surreal } from "./surreal";
import type { PreparedQuery } from "./util/prepared-query";

//////////////////////////////////////////////
//////////   QUERY Binding TYPES   //////////
//////////////////////////////////////////////
export type ConcatStrings<
	A extends string,
	B extends readonly string[],
> = B extends []
	? A
	: B extends [infer Head extends string, ...infer Tail extends string[]]
		? ConcatStrings<`${A} ${Head}`, Tail>
		: A;

type IdentChar =
	| "_"
	| "$"
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I"
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P"
	| "Q"
	| "R"
	| "S"
	| "T"
	| "U"
	| "V"
	| "W"
	| "X"
	| "Y"
	| "Z"
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z";

type SplitIdent<
	S extends string,
	Acc extends string = "",
> = S extends `${infer First}${infer Rest}`
	? First extends IdentChar
		? SplitIdent<Rest, `${Acc}${First}`>
		: [Acc, S]
	: [Acc, ""];

type ExtractDollarWords<S extends string> =
	S extends `${infer _Before}$${infer After}`
		? SplitIdent<After> extends [
				infer Key extends string,
				infer Rem extends string,
			]
			? (Key extends "" ? never : Key) | ExtractDollarWords<Rem>
			: never
		: never;

type BindingsFor<Keys extends string, V> = {
	[K in Keys]: V;
};

export type WithPartiallyEncodeValues<T, V> = {
	[K in keyof T]: V;
};
type EnforceSurqlValues<T> = {
	[K in keyof T]: MustBeSurqlValue<T[K]>;
};
type ReservedBindingNames =
	| "this"
	| "parent"
	| "access"
	| "auth"
	| "token"
	| "session";
export type RustFnParams<S extends string> =
	S extends `${infer _Pre}${infer _Class}::${infer _Func}(${infer Body})${infer Rest}`
		? ExtractDollarWords<Body> | RustFnParams<Rest>
		: never;

export type SurqlQueryBindings<Q extends string> = Exclude<
	ExtractDollarWords<Q>,
	ReservedBindingNames | RustFnParams<Q>
> extends infer Keys
	? [Keys] extends [never]
		? Record<never, never> | undefined
		: {
				[K in Extract<Keys & string, string>]: MustBeSurqlValue<
					BindingsFor<K, SurqlQueryBindingValue>[K]
				>;
			}
	: never;

export type ParallelSurqlQueryBindingsArray<Qs extends readonly string[]> = {
	[I in keyof Qs]: SurqlQueryBindings<Qs[I]> extends infer R
		? [keyof R] extends [never]
			? undefined
			: EnforceSurqlValues<R>
		: never;
};
export type ActionResult<T extends Record<string, unknown>> = Prettify<
	T["id"] extends RecordId ? T : { id: RecordId } & T
>;

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {}; // deno-lint-ignore ban-types

export type ExecuteSurqlQuery = {
	execute<T extends unknown[T]>(): Promise<Prettify<[T]>>;
};
export type ExecuteRawSurqlQuery = {
	execute<T extends unknown[T]>(): Promise<Prettify<MapQueryResult<[T]>>>;
};

type FinalBinding<B> = B extends undefined
	? undefined
	: { [K in keyof B]: MustBeSurqlValue<B[K]> };
type IsEmptyBindings<T> = T extends undefined | Record<string, never>
	? true
	: false;
export type QueryParameters<
	Q extends string,
	B extends SurqlQueryBindings<Q> = SurqlQueryBindings<Q>,
> = IsEmptyBindings<B> extends true
	?
			| [query: Q]
			| [query: Q, bindings: undefined]
			| [
					prepared: PreparedQuery<string, Record<never, never> | undefined>,
					gaps?: Fill[],
			  ]
	:
			| [query: Q, bindings: FinalBinding<B>]
			| [prepared: PreparedQuery<Q, B>, gaps?: Fill[]];

//////////////////////////////////////////////
//////////   AUTHENTICATION TYPES   //////////
//////////////////////////////////////////////

export function convertAuth(params: AnyAuth): Record<string, unknown> {
	let result: Record<string, unknown> = {};
	const convertString = (a: string, b: string, optional?: boolean) => {
		if (a in params) {
			result[b] = `${params[a as keyof AnyAuth]}`;
			delete result[a];
		} else if (optional !== true) {
			throw new SurrealDbError(
				`Key ${a} is missing from the authentication parameters`,
			);
		}
	};

	if ("scope" in params) {
		result = { ...params };
		convertString("scope", "sc");
		convertString("namespace", "ns");
		convertString("database", "db");
	} else if ("variables" in params) {
		result = { ...params.variables };
		convertString("access", "ac");
		convertString("namespace", "ns");
		convertString("database", "db");
	} else {
		convertString("access", "ac", true);
		convertString("database", "db", true);
		convertString("namespace", "ns", !("database" in params));
		convertString("username", "user");
		convertString("password", "pass");
	}

	return result;
}

export type RootAuth = {
	username: string;
	password: string;
};

export type NamespaceAuth = {
	namespace: string;
	username: string;
	password: string;
};

export type DatabaseAuth = {
	namespace: string;
	database: string;
	username: string;
	password: string;
};

export type AccessSystemAuth = Prettify<
	(RootAuth | NamespaceAuth | DatabaseAuth) & {
		access: string;
		variables?: never;
	}
>;

export type ScopeAuth = {
	namespace?: string;
	database?: string;
	scope: string;
	[K: string]: unknown;
};

export type AccessRecordAuth = {
	namespace?: string;
	database?: string;
	access: string;
	variables: {
		ns?: never;
		db?: never;
		ac?: never;
		[K: string]: unknown;
	};
};

export type AnyAuth =
	| RootAuth
	| NamespaceAuth
	| DatabaseAuth
	| ScopeAuth
	| AccessSystemAuth
	| AccessRecordAuth;

export type Token = string;

export type AuthClient = Pick<
	Surreal,
	"signin" | "signup" | "authenticate" | "invalidate"
>;

/////////////////////////////////////
//////////   QUERY TYPES   //////////
/////////////////////////////////////

export type QueryResult<T = unknown> = QueryResultOk<T> | QueryResultErr;
export type QueryResultOk<T> = {
	status: "OK";
	time: string;
	result: T;
};

export type QueryResultErr = {
	status: "ERR";
	time: string;
	result: string;
};

export type MapQueryResult<T> = {
	[K in keyof T]: QueryResult<T[K]>;
};

/////////////////////////////////////
//////////   PATCH TYPES   //////////
/////////////////////////////////////

type BasePatch<T = string> = {
	path: T;
};

export type AddPatch<T = string, U = unknown> = BasePatch<T> & {
	op: "add";
	value: U;
};

export type RemovePatch<T = string> = BasePatch<T> & {
	op: "remove";
};

export type ReplacePatch<T = string, U = unknown> = BasePatch<T> & {
	op: "replace";
	value: U;
};

export type ChangePatch<T = string, U = string> = BasePatch<T> & {
	op: "change";
	value: U;
};

export type CopyPatch<T = string, U = string> = BasePatch<T> & {
	op: "copy";
	from: U;
};

export type MovePatch<T = string, U = string> = BasePatch<T> & {
	op: "move";
	from: U;
};

export type TestPatch<T = string, U = unknown> = BasePatch<T> & {
	op: "test";
	value: U;
};

export type Patch =
	| AddPatch
	| RemovePatch
	| ReplacePatch
	| ChangePatch
	| CopyPatch
	| MovePatch
	| TestPatch;

// RPC

export type RpcRequest<
	Method extends string = string,
	Params extends unknown[] | undefined = unknown[],
> = {
	method: Method;
	params?: Params;
};

export type RpcResponse<Result = unknown> =
	| RpcResponseOk<Result>
	| RpcResponseErr;

export type RpcResponseOk<Result = unknown> = {
	result: Result;
	error?: never;
};

export type RpcResponseErr = {
	result?: never;
	error: {
		code: number;
		message: string;
	};
};

// Live

export const liveActions = ["CREATE", "UPDATE", "DELETE"] as const;
export type LiveAction = (typeof liveActions)[number];
export type LiveResult = {
	id: Uuid;
	action: LiveAction;
	result: Record<string, unknown>;
};

export type LiveHandlerArguments<
	Result extends Record<string, unknown> | Patch = Record<string, unknown>,
> =
	| [action: LiveAction, result: Result]
	| [action: "CLOSE", result: "killed" | "disconnected"];

export type LiveHandler<
	Result extends Record<string, unknown> | Patch = Record<string, unknown>,
> = (...[action, result]: LiveHandlerArguments<Result>) => unknown;

export function isLiveResult(v: unknown): v is LiveResult {
	if (typeof v !== "object") return false;
	if (v === null) return false;
	if (!("id" in v && "action" in v && "result" in v)) return false;

	if (!(v.id instanceof Uuid)) return false;
	if (!liveActions.includes(v.action as LiveAction)) return false;
	if (typeof v.result !== "object") return false;
	if (v.result === null) return false;

	return true;
}

/////////////////////////////////////
/////////   EXPORT TYPES   //////////
/////////////////////////////////////

export type ExportOptions = {
	users: boolean;
	accesses: boolean;
	params: boolean;
	functions: boolean;
	analyzers: boolean;
	versions: boolean;
	tables: boolean | string[];
	records: boolean;
};

/////////////////////////////////////
////////   CONNECT OPTIONS   ////////
/////////////////////////////////////

export const DEFAULT_RECONNECT_OPTIONS: ReconnectOptions = {
	enabled: true,
	attempts: 5,
	retryDelay: 1000,
	retryDelayMax: 60000,
	retryDelayMultiplier: 2,
	retryDelayJitter: 0.1,
};

export type PrepareFn = (auth: AuthController) => unknown;

export interface ConnectOptions {
	/** The namespace to connect to */
	namespace?: string;
	/** The database to connect to */
	database?: string;
	/** Authentication details to use */
	auth?: AnyAuth | Token;
	/** A callback to customise the connection before connection completion */
	prepare?: PrepareFn;
	/** Enable automated SurrealDB version checking */
	versionCheck?: boolean;
	/** The maximum amount of time in milliseconds to wait for version checking */
	versionCheckTimeout?: number;
	/** Configure reconnect behavior */
	reconnect?: boolean | Partial<ReconnectOptions>;
}

export interface ReconnectOptions {
	/** Reconnect after a connection has unexpectedly dropped */
	enabled: boolean;
	/** How many attempts will be made at reconnecting, -1 for unlimited */
	attempts: number;
	/** The minimum amount of time in milliseconds to wait before reconnecting */
	retryDelay: number;
	/** The maximum amount of time in milliseconds to wait before reconnecting */
	retryDelayMax: number;
	/** The amount to multiply the delay by after each failed attempt */
	retryDelayMultiplier: number;
	/** A float percentage to randomly offset each delay by  */
	retryDelayJitter: number;
}
