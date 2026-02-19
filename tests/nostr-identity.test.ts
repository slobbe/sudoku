import { describe, expect, it } from "bun:test";
import {
  createLocalIdentity,
  createRandomLocalIdentity,
  parseNsecToSecretKey,
} from "../src/lib/nostr";

describe("nostr identity helpers", () => {
  it("creates a random local identity with a decodable nsec", () => {
    const generated = createRandomLocalIdentity();
    const secretKey = parseNsecToSecretKey(generated.nsec);

    expect(secretKey).not.toBeNull();
    const reconstructed = createLocalIdentity(secretKey!);
    expect(reconstructed.pubkey).toBe(generated.identity.pubkey);
    expect(reconstructed.source).toBe("local");
  });

  it("rejects malformed nsec strings", () => {
    expect(parseNsecToSecretKey("not-a-key")).toBeNull();
  });
});
