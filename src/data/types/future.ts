import { Value } from "../value";
import type { SurqlFuture } from "./querybindingvalues";

/**
 * An uncomputed SurrealQL future value.
 */
export class Future<F extends string> extends Value {
	constructor(readonly inner: F) {
		super();
	}

	equals(other: unknown): boolean {
		if (!(other instanceof Future)) return false;
		return this.inner === other.inner;
	}

	toJSON(): string {
		return this.toString();
	}

	toString(): SurqlFuture<F> {
		return `<future> ${this.inner}`;
	}
}
