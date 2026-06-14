import { describe, expect, it } from "vitest";
import {
  COLLECTION_FIELDS,
  COLLECTION_KEYS,
  isCollectionKey,
  splitList,
} from "./fields";

describe("isCollectionKey", () => {
  it("accepts the three collections", () => {
    expect(isCollectionKey("work")).toBe(true);
    expect(isCollectionKey("writing")).toBe(true);
    expect(isCollectionKey("teaching")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isCollectionKey("now")).toBe(false);
    expect(isCollectionKey("login")).toBe(false);
    expect(isCollectionKey("")).toBe(false);
  });
});

describe("splitList", () => {
  it("splits on commas and newlines and trims", () => {
    expect(splitList("a, b\nc")).toEqual(["a", "b", "c"]);
  });
  it("drops empties and whitespace-only entries", () => {
    expect(splitList("a,,  ,\n\nb ")).toEqual(["a", "b"]);
  });
  it("returns an empty array for empty input", () => {
    expect(splitList("")).toEqual([]);
  });
});

describe("collection field configs", () => {
  it("every collection has a slug and a body field", () => {
    for (const key of COLLECTION_KEYS) {
      const names = COLLECTION_FIELDS[key].map((f) => f.name);
      expect(names).toContain("slug");
      expect(names).toContain("body");
    }
  });
});
