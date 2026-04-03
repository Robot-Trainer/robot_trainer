import { describe, it, expect } from "vitest";
import { concatUint8 } from "./utils";

describe("concatUint8", () => {
  it("concatenates two non-empty arrays", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    expect(concatUint8(a, b)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it("handles empty first array", () => {
    const a = new Uint8Array(0);
    const b = new Uint8Array([7, 8]);
    expect(concatUint8(a, b)).toEqual(new Uint8Array([7, 8]));
  });

  it("handles empty second array", () => {
    const a = new Uint8Array([1]);
    const b = new Uint8Array(0);
    expect(concatUint8(a, b)).toEqual(new Uint8Array([1]));
  });

  it("handles both arrays empty", () => {
    expect(concatUint8(new Uint8Array(0), new Uint8Array(0))).toEqual(
      new Uint8Array(0),
    );
  });
});
