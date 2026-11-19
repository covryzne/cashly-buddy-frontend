// Deterministic loopback API fixture. Enabled only by the test runner.
import { randomUUID } from "node:crypto";

let saved = [], commits = 0, failExtraction = false, slow = false, failRefresh = false;
let extractions = 0, saveFailOnce = false;
let voiceUnclear = false, invalidVoice = false, transcriptions = 0;
let gameReads = 0, expenseReads = 0, summaryReads = 0;
const keys = new Map();
export async function chatTestApi(req, url, send) {
  if (url.pathname === "/__test/chat") {
    saved = []; commits = 0; keys.clear();
    extractions = 0; transcriptions = 0;
    voiceUnclear = url.searchParams.get("unclear") === "true";
    invalidVoice = url.searchParams.get("invalid") === "true";
    gameReads = 0; expenseReads = 0; summaryReads = 0;
    saveFailOnce = url.searchParams.get("saveFailOnce") === "true";
    failExtraction = url.searchParams.get("fail") === "true";
    slow = url.searchParams.get("slow") === "true";
    failRefresh = url.searchParams.get("refreshFail") === "true";
    send(200, {}); return true;
  }
  if (url.pathname === "/__test/chat-state") {
    send(200, { commits, saved, extractions, transcriptions, gameReads, expenseReads, summaryReads }); return true;
  }
  if (url.pathname === "/api/v1/voice/transcribe") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const input = JSON.parse(raw);
    const audio = Buffer.from(input.audio.data, "base64");
    if (audio.toString("ascii", 0, 4) === "RIFF" && audio.length >= 44 && audio.readUInt32LE(40) / audio.readUInt32LE(28) > 60.5) {
      send(422, { error: { message: "Durasi audio maksimal 60 detik." } }); return true;
    }
    transcriptions++;
    if (slow) await new Promise(resolve => setTimeout(resolve, 1500));
    if (failExtraction) { failExtraction = false; send(504, { error: { message: "AI belum merespons. Rekaman tetap tersedia." } }); return true; }
    if (invalidVoice) { invalidVoice = false; send(200, { data: { unexpected: true } }); return true; }
    send(200, { data: { status: voiceUnclear ? "unclear" : "clear", transcript: voiceUnclear ? "" : "Hari ini beli nasi padang dua belas ribu bayar qris",
      issue: voiceUnclear ? "Suara belum jelas. Lengkapi transkrip atau rekam ulang." : null, duration_seconds: 1 } }); return true;
  }
  if (url.pathname === "/api/v1/voice/extract") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); extractions++;
    if (slow) await new Promise(resolve => setTimeout(resolve, 1500));
    if (failExtraction) { failExtraction = false; send(504, { error: { message: "AI belum merespons. Transkrip tetap tersedia." } }); return true; }
    if (invalidVoice) { invalidVoice = false; send(200, { data: { unexpected: true } }); return true; }
    send(200, { data: { entries: [{ id: randomUUID(), text: body.message, createdAt: new Date().toISOString(),
      draft: { merchant: "Nasi Padang", categoryCode: "food_drink", paymentMethod: "QRIS", occurredDate: "2026-11-17", occurredTime: "12:00",
        items: [{ id: "voice-1", name: "Nasi Padang", quantity: "1", priceIdr: body.message.includes("15") ? "15000" : "12000" }], discountIdr: "0", taxIdr: "0" },
      issue: null, reason: null }], reply: "Periksa draft dari transkrip sebelum menyimpan." } }); return true;
  }
  if (url.pathname === "/api/v1/receipts/extract") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    extractions++;
    if (slow) await new Promise(resolve => setTimeout(resolve, 1200));
    if (failExtraction) {
      failExtraction = false;
      send(503, { error: { message: "AI belum tersedia. Foto tetap bisa dicoba lagi." } }); return true;
    }
    const incomplete = body.caption === "buram";
    const draft = incomplete ? null : {
      merchant: "Nasi Padang", categoryCode: "food_drink", paymentMethod: "QRIS",
      occurredDate: "2026-11-17", occurredTime: "12:00", discountIdr: "0", taxIdr: "0",
      items: [{ id: "receipt-1", name: "Nasi Padang", quantity: "1", priceIdr: "12000" }],
    };
    send(200, { data: { entries: [{ id: randomUUID(), text: body.caption || "Foto", createdAt: new Date().toISOString(),
      draft, issue: incomplete ? "Berapa total yang tertulis?" : null, reason: incomplete ? "amount" : null }],
      reply: incomplete ? "Berapa total yang tertulis?" : "Periksa hasil foto sebelum menyimpan." } });
    return true;
  }
  if (url.pathname === "/api/v1/chat/extract") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (slow) await new Promise(resolve => setTimeout(resolve, 1200));
    extractions++;
    if (failExtraction) {
      failExtraction = false;
      send(429, { error: { message: "Kuota AI sedang penuh. Coba lagi nanti." } }); return true;
    }
    let entries = structuredClone(body.entries);
    let reply = "Aku bisa membantu mencatat pengeluaran. Contohnya: makan siang 25rb.";
    const message = body.message;
    if (!/python|resep/i.test(message)) {
      const target = body.edit_entry_id ?? (/^18rb$|tadi/.test(message) ? entries[0]?.id : null);
      const existing = entries.find(entry => entry.id === target);
      const name = message.includes("bensin") ? "Bensin" : "Kopi";
      const incomplete = message === "beli kopi";
      const draft = incomplete ? null : {
        merchant: "", categoryCode: name === "Bensin" ? "transport" : "food_drink",
        paymentMethod: "", occurredDate: "2026-11-17", occurredTime: "12:00",
        items: [{ id: "1", name, quantity: "1", priceIdr: message.includes("20") ? "20000" : name === "Bensin" ? "30000" : "18000" }],
        discountIdr: "0", taxIdr: "0",
      };
      const entry = {
        id: existing?.id ?? randomUUID(), createdAt: existing?.createdAt ?? new Date().toISOString(),
        text: existing && !body.edit_entry_id ? `${existing.text}\n${message}` : message,
        draft, issue: incomplete ? "Kopinya berapa?" : null, reason: incomplete ? "amount" : null,
      };
      entries = existing ? entries.map(old => old.id === existing.id ? entry : old) : [...entries, entry];
      reply = incomplete ? "Kopinya berapa?" : "Siap, catatan masuk daftar untuk ditinjau.";
    }
    send(200, { data: { entries, reply } }); return true;
  }
  if (url.pathname === "/api/v1/expenses/chat-batch") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw), key = req.headers["idempotency-key"];
    if (!keys.has(key)) {
      commits++;
      const result = { data: body.records.map(record => ({
        ...record.expense, id: randomUUID(), source: record.source === "receipt" ? "receipt" : record.source === "voice" ? "voice" : "text", version: 1,
        items: record.expense.items.map((item, index) => ({ ...item, item_index: index,
          amount_idr: String(item.quantity * Number(item.unit_price_idr)) })),
      })) };
      saved.push(...result.data); keys.set(key, result);
    }
    if (saveFailOnce) {
      saveFailOnce = false;
      send(503, { error: { message: "Respons simpan terputus. Coba lagi." } }); return true;
    }
    send(201, keys.get(key)); return true;
  }
  if (url.pathname === "/api/v1/expenses") {
    expenseReads++;
    send(failRefresh && commits ? 503 : 200, failRefresh && commits ? { error: { message: "Refresh gagal" } } :
      { data: saved, has_more: false, next_cursor: null }); return true;
  }
  if (url.pathname === "/api/v1/gamification/overview") gameReads++;
  if (url.pathname === "/api/v1/reports/summary") {
    summaryReads++;
    send(200, { data: { amount_idr: String(saved.reduce((sum, row) => sum + Number(row.amount_idr), 0)), count: saved.length } });
    return true;
  }
  return false;
}
