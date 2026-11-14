import { test, expect } from "@playwright/test";
import {
  batchTotal,
  collectChatEntry,
} from "../src/features/expenses/chat-batch";

const at = "2026-11-14T10:39:00Z";
test("Dua pesan merupakan dua transaksi terpisah dengan total 45k", () => {
  const first = collectChatEntry([], "makan naspad 25k", "a", at);
  const second = collectChatEntry(first.entries, "kopi 20k", "b", at);
  expect(second.entries.map((entry) => entry.id)).toEqual(["a", "b"]);
  expect(second.entries.map((entry) => entry.draft?.items[0].priceIdr)).toEqual(
    ["25000", "20000"],
  );
  expect(batchTotal(second.entries)).toBe(BigInt(45000));
  expect(second.reply).toContain("Ada 2 pengeluaran, total Rp45.000");
});
test("Nominal melengkapi entry yang menunggu tanpa menggandakan atau mengubah waktu asal", () => {
  const pending = collectChatEntry([], "kopi", "a", at);
  const completed = collectChatEntry(
    pending.entries,
    "12k",
    "b",
    "2026-11-14T11:00:00Z",
  );
  expect(completed.entries).toHaveLength(1);
  expect(completed.entries[0]).toMatchObject({
    id: "a",
    createdAt: at,
    text: "kopi 12k",
    issue: null,
  });
  expect(batchTotal(completed.entries)).toBe(BigInt(12000));
});
test("Pembelian lengkap baru tidak mengisi atau menghapus catatan yang belum lengkap", () => {
  const pending = collectChatEntry([], "nasi padang", "a", at);
  const next = collectChatEntry(pending.entries, "kopi 20k", "b", at);
  expect(next.entries).toHaveLength(2);
  expect(next.entries[0].draft).toBeNull();
  expect(next.entries[1].draft?.items[0].name).toBe("kopi");
  expect(next.reply).toContain("1 catatan masih perlu dilengkapi");
});
test("Merchant, metode pembayaran dan tanggal antar pesan tidak digabung", () => {
  const first = collectChatEntry(
    [],
    "kopi 12k di Kopi Sudut pakai QRIS",
    "a",
    at,
  );
  const second = collectChatEntry(
    first.entries,
    "roti 8k di Toko Roti kemarin pakai tunai",
    "b",
    at,
  );
  expect(second.entries[0].draft).toMatchObject({
    merchant: "Kopi Sudut",
    paymentMethod: "QRIS",
  });
  expect(second.entries[1].draft).toMatchObject({
    merchant: "Toko Roti",
    paymentMethod: "Tunai",
  });
  expect(second.entries[1].draft?.occurredDate).not.toBe(
    second.entries[0].draft?.occurredDate,
  );
});
test("Beberapa item dalam satu pesan tetap satu transaksi", () => {
  const batch = collectChatEntry([], "kopi 15k dan roti 8k", "a", at);
  expect(batch.entries).toHaveLength(1);
  expect(batch.entries[0].draft?.items).toHaveLength(2);
  expect(batchTotal(batch.entries)).toBe(BigInt(23000));
});
test("Draft nominal invalid tidak merusak balasan pesan baru", () => {
  const batch = collectChatEntry([], "kopi 12k", "a", at);
  batch.entries[0].draft!.discountIdr = "20000";
  const next = collectChatEntry(batch.entries, "roti 8k", "b", at);
  expect(batchTotal(next.entries)).toBe(BigInt(8000));
  expect(next.reply).toContain("Rp8.000");
});
