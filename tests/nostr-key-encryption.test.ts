import { describe, expect, it } from "bun:test";
import {
  decryptNsecWithPassphrase,
  encryptNsecWithPassphrase,
  isNostrKeyEncryptionEnvelope,
} from "../src/lib/nostr/key-encryption";

const SAMPLE_NSEC = "nsec1h44wlg4akllmn2zmk4tgg2z86xqm9vg9hq3w3xyu8l96mpwwj7wq8v2l6x";

describe("nostr key encryption", () => {
  it("encrypts and decrypts nsec with passphrase", async () => {
    const envelope = await encryptNsecWithPassphrase(SAMPLE_NSEC, "correct horse battery staple");

    expect(isNostrKeyEncryptionEnvelope(envelope)).toBe(true);
    await expect(decryptNsecWithPassphrase(envelope, "correct horse battery staple")).resolves.toBe(SAMPLE_NSEC);
  });

  it("returns null on wrong passphrase", async () => {
    const envelope = await encryptNsecWithPassphrase(SAMPLE_NSEC, "right-passphrase");

    await expect(decryptNsecWithPassphrase(envelope, "wrong-passphrase")).resolves.toBeNull();
  });

  it("rejects empty passphrase for encryption", async () => {
    await expect(encryptNsecWithPassphrase(SAMPLE_NSEC, "")).rejects.toThrow(
      "Passphrase is required for encrypted local key storage.",
    );
  });
});
