import { describe, expect, it } from "vitest";
import {
  parseJsonArray,
  parseJsonObject,
  parseJsonStringArray,
} from "../utils/json.js";

describe("tolerant JSON readers", () => {
  it("reads an object and degrades anything else to an empty one", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonObject("[1,2]")).toEqual({});
    expect(parseJsonObject("null")).toEqual({});
    expect(parseJsonObject("not-json")).toEqual({});
  });

  it("reads an array and degrades anything else to an empty one", () => {
    expect(parseJsonArray<number>("[1,2]")).toEqual([1, 2]);
    expect(parseJsonArray('{"a":1}')).toEqual([]);
    expect(parseJsonArray("")).toEqual([]);
  });

  it("keeps only the string items of a tag list", () => {
    expect(parseJsonStringArray('["ai",3,null,"agents"]')).toEqual([
      "ai",
      "agents",
    ]);
    expect(parseJsonStringArray("not-json")).toEqual([]);
  });
});
