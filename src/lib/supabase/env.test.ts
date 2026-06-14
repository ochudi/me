import { afterEach, describe, expect, it } from "vitest";
import { adminEmails, isAdminEmail } from "./env";

const original = process.env.ADMIN_EMAILS;
afterEach(() => {
  process.env.ADMIN_EMAILS = original;
});

describe("adminEmails", () => {
  it("parses, trims, and lowercases a comma list", () => {
    process.env.ADMIN_EMAILS = " A@B.com ,  c@d.COM ";
    expect(adminEmails()).toEqual(["a@b.com", "c@d.com"]);
  });
  it("is empty when unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(adminEmails()).toEqual([]);
  });
});

describe("isAdminEmail", () => {
  it("matches case-insensitively", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isAdminEmail("OWNER@example.com")).toBe(true);
    expect(isAdminEmail("someone@else.com")).toBe(false);
  });
  it("rejects null/undefined/empty", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});
