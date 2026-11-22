import { test, expect } from "@playwright/test";
import { whatsappNumber } from "../src/lib/format/whatsapp";

test("WhatsApp menerima nomor internasional dan format lokal Indonesia", () => {
  for (const value of [
    "628000000001",
    "+62 800-0000-001",
    "0800 0000 001",
    "00628000000001",
  ]) {
    expect(whatsappNumber(value)).toBe("628000000001");
  }
  expect(whatsappNumber("+1 (202) 555-0100")).toBe("12025550100");
});

test("Tujuan kosong, URL, alfabet, delimiter query dan nomor terlalu panjang ditolak", () => {
  for (const value of [
    undefined,
    "",
    " ",
    "123",
    "https://wa.me/628000000001",
    "628abc123",
    "628000000001?text=hi",
    "+",
    "0",
    "1".repeat(16),
  ]) {
    expect(whatsappNumber(value)).toBeNull();
  }
});
