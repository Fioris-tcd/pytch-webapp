// Assessment of a string as a possible name for a class.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let Sk: any;

export type NameValidity =
  | { status: "valid" }
  | { status: "invalid"; reason: string };

const invalidBecause = (reason: string): NameValidity => ({
  status: "invalid",
  reason,
});
