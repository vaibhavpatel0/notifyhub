import { describe, expect, it } from "vitest";
import { isValidSlugShape, resolveHost } from "@/lib/tenant";

describe("resolveHost", () => {
  const root = "notifyhub.in";
  it.each([
    ["notifyhub.in", { kind: "platform" }],
    ["www.notifyhub.in", { kind: "platform" }],
    ["vits.notifyhub.in", { kind: "tenant", slug: "vits" }],
    ["VITS.NotifyHub.in", { kind: "tenant", slug: "vits" }],
    ["vits-college.notifyhub.in:443", { kind: "tenant", slug: "vits-college" }],
    ["a.b.notifyhub.in", { kind: "platform" }],
    ["evil-notifyhub.in", { kind: "platform" }],
    ["vits.notifyhub.in.evil.com", { kind: "platform" }],
    ["notifyhub-git-main.vercel.app", { kind: "platform" }],
    ["-bad.notifyhub.in", { kind: "platform" }],
  ])("%s", (host, expected) => {
    expect(resolveHost(host, root)).toEqual(expected);
  });

  it("supports localhost development roots", () => {
    expect(resolveHost("cbit.localhost:3000", "localhost:3000")).toEqual({ kind: "tenant", slug: "cbit" });
    expect(resolveHost("localhost:3000", "localhost:3000")).toEqual({ kind: "platform" });
  });

  it("validates slug shapes", () => {
    expect(isValidSlugShape("vits")).toBe(true);
    expect(isValidSlugShape("vits-college")).toBe(true);
    expect(isValidSlugShape("v")).toBe(false);
    expect(isValidSlugShape("vits--x")).toBe(false);
    expect(isValidSlugShape("Vits")).toBe(false);
    expect(isValidSlugShape("vits-")).toBe(false);
  });
});
