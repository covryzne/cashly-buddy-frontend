"use client";

import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, Copy, Minus, Percent, Plus, Split, Wallet } from "lucide-react";
import { Tabs } from "@base-ui/react/tabs";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format/money";
import type { ReceiptDraft } from "@/features/scan/receipt-schema";
import { allocateRupiah, discountAmount, rupiahInput } from "./mochi-tool-calculations";
import { SplitBillReceiptImport } from "./split-bill-receipt-import";
import styles from "./mochi-tools.module.css";

const tools = [
  { id: "split", title: "Split Bill Nongkrong", description: "Bagi rata atau per menu", Icon: Split },
  { id: "discount", title: "Kalkulator Diskon", description: "Cek potongan dan cashback", Icon: Percent },
] as const;

const money = (value: number) => formatMoney(String(value));
const groupDigits = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const validPercent = (value: string) => /^\d{1,3}(?:[.,]\d{1,2})?$/.test(value) && Number(value.replace(",", ".")) <= 100;

function MoneyField({ label, value, onChange, required = false }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean;
}) {
  function updateAmount(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    let digits = input.value.replace(/\D/g, "");
    let digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, "").length;
    const inputType = (event.nativeEvent as InputEvent).inputType;

    // If the browser deleted just a separator, also delete the adjacent digit.
    if (digits === value && inputType === "deleteContentBackward" && digitsBeforeCursor > 0) {
      digitsBeforeCursor -= 1;
      digits = digits.slice(0, digitsBeforeCursor) + digits.slice(digitsBeforeCursor + 1);
    } else if (digits === value && inputType === "deleteContentForward") {
      digits = digits.slice(0, digitsBeforeCursor) + digits.slice(digitsBeforeCursor + 1);
    }

    digits = digits.slice(0, 12);
    const formatted = groupDigits(digits);
    let nextCursor = 0;
    for (let remaining = Math.min(digitsBeforeCursor, digits.length); remaining > 0; nextCursor += 1) {
      if (formatted[nextCursor] !== ".") remaining -= 1;
    }
    onChange(digits);
    requestAnimationFrame(() => {
      if (document.activeElement === input && input.value === formatted) {
        input.setSelectionRange(nextCursor, nextCursor);
      }
    });
  }

  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type="text" inputMode="numeric" value={groupDigits(value)} onChange={updateAmount}
        placeholder={required ? "Contoh 50.000" : "0"} />
    </label>
  );
}

type SplitMenuItem = { name: string; amount: string; people: number[]; quantity?: number; unitPrice?: string };

function SplitBill() {
  const [mode, setMode] = useState<"equal" | "items">("equal");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("2");
  const [fees, setFees] = useState({ tax: "", service: "", tip: "", discount: "" });
  const [taxUnit, setTaxUnit] = useState<"rupiah" | "percent">("rupiah");
  const [taxRate, setTaxRate] = useState("");
  const [people, setPeople] = useState(["", ""]);
  const [equalNames, setEqualNames] = useState<Record<number, string>>({});
  const [payers, setPayers] = useState({ equal: "", items: "" });
  const [items, setItems] = useState<SplitMenuItem[]>([{ name: "", amount: "", people: [] }]);
  const [copyStatus, setCopyStatus] = useState("");
  const splitId = useId();
  const members = Number(count);
  const validCount = Number.isInteger(members) && members >= 2 && members <= 30;
  const subtotals = people.map(() => 0);
  const validItems = items.every((item) => rupiahInput(item.amount) !== null && item.people.length > 0);
  if (mode === "items" && validItems) {
    for (const item of items) {
      const amounts = allocateRupiah(Number(item.amount), people.map((_, index) => item.people.includes(index) ? 1 : 0));
      amounts.forEach((value, index) => { subtotals[index] += value; });
    }
  }
  const subtotal = mode === "equal" ? rupiahInput(amount) ?? 0 : subtotals.reduce((sum, value) => sum + value, 0);
  const taxValid = taxUnit === "rupiah" || taxRate === "" || validPercent(taxRate);
  const tax = taxUnit === "rupiah" ? Number(fees.tax) : validPercent(taxRate) ? discountAmount(subtotal, taxRate, null) : 0;
  const extras = tax + Number(fees.service) + Number(fees.tip);
  const discount = Number(fees.discount);
  const total = subtotal + extras - discount;
  const ready = subtotal > 0 && taxValid && discount <= subtotal + extras && (mode === "equal" ? validCount : validItems);
  const weights = mode === "equal" ? Array.from({ length: validCount ? members : 0 }, () => 1) : subtotals;
  const shared = ready && mode === "items" ? allocateRupiah(Math.abs(extras - discount), weights) : [];
  const shares = !ready ? [] : mode === "equal" ? allocateRupiah(total, weights)
    : subtotals.map((value, index) => value + Math.sign(extras - discount) * shared[index]);
  const participantCount = mode === "equal" ? validCount ? members : 0 : people.length;
  const nameOf = (index: number) => (mode === "equal" ? equalNames[index] : people[index])?.trim() || `Orang ${index + 1}`;
  const payer = payers[mode] !== "" && Number(payers[mode]) < participantCount ? Number(payers[mode]) : null;
  const transfers = payer === null ? [] : shares.flatMap((value, index) =>
    index !== payer && value > 0 ? [{ index, value }] : []);

  function updateCount(value: string) {
    setCount(value);
    const next = Number(value);
    if (next >= 2 && next <= 30 && Number(payers.equal) >= next) setPayers({ ...payers, equal: "" });
    setCopyStatus("");
  }

  function selectTaxUnit(unit: typeof taxUnit) {
    setTaxUnit(unit);
    setCopyStatus("");
  }

  function importReceipt(draft: ReceiptDraft) {
    setItems(draft.items.map((item) => ({
      name: item.name,
      amount: String(Number(item.quantity) * Number(item.priceIdr)),
      quantity: Number(item.quantity),
      unitPrice: item.priceIdr,
      people: [],
    })));
    setFees((current) => ({ ...current, tax: draft.taxIdr, discount: draft.discountIdr }));
    setTaxUnit("rupiah");
    setTaxRate("");
    setCopyStatus("");
  }

  function splitMenu(index: number, item: SplitMenuItem) {
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice;
    if (quantity < 2 || unitPrice === undefined || items.length + quantity - 1 > 50) return;
    const portions = Array.from({ length: quantity }, (): SplitMenuItem => ({
      name: item.name,
      amount: unitPrice,
      people: item.people,
    }));
    setItems([...items.slice(0, index), ...portions, ...items.slice(index + 1)]);
    setCopyStatus("");
  }

  function removePerson(index: number) {
    if (payer !== null && payer >= index) {
      setPayers({ ...payers, items: payer === index ? "" : String(payer - 1) });
    }
    setPeople(people.filter((_, position) => position !== index));
    setItems(items.map((item) => ({
      ...item,
      people: item.people.filter((person) => person !== index).map((person) => person > index ? person - 1 : person),
    })));
    setCopyStatus("");
  }

  async function copy() {
    const lines = ["Split Bill Nongkrong · Cashly", `Subtotal ${money(subtotal)}`, `Pajak, layanan & tip ${money(extras)}`,
      `Diskon ${money(discount)}`, `Total ${money(total)}`, "", ...shares.map((value, index) => `${nameOf(index)}: ${money(value)}`)];
    if (payer !== null) {
      lines.push("", `${nameOf(payer)} nalangin ${money(total)}`, `Bagian sendiri ${money(shares[payer])}`,
        `Total uang balik ${money(total - shares[payer])}`,
        ...transfers.map(({ index, value }) => `${nameOf(index)} transfer ${money(value)} ke ${nameOf(payer)}`));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("Rincian disalin.");
    } catch {
      setCopyStatus("Gagal menyalin. Kamu masih bisa menyalin rincian secara manual.");
    }
  }

  return (
    <div className={styles.form} onChange={() => setCopyStatus("")}>
      <Tabs.Root value={mode} onValueChange={(value) => { setMode(value as typeof mode); setCopyStatus(""); }}>
        <Tabs.List className={styles.tabs} aria-label="Cara membagi tagihan">
          <Tabs.Tab value="equal">Bagi rata</Tabs.Tab>
          <Tabs.Tab value="items">Bagi per menu</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="equal" className={styles.form}>
          <MoneyField label="Total struk atau subtotal (Rp)" value={amount} onChange={setAmount} required />
          <div className={styles.stepper}>
            <label className={styles.field}>
              <span>Jumlah orang</span>
              <input type="number" min={2} max={30} step={1} value={count} onChange={(event) => updateCount(event.target.value)} />
            </label>
            <Button variant="outline" type="button" aria-label="Kurangi orang" disabled={!validCount || members <= 2} onClick={() => updateCount(String(members - 1))}>
              <Minus size={17} aria-hidden />
            </Button>
            <Button variant="outline" type="button" aria-label="Tambah orang" disabled={!validCount || members >= 30} onClick={() => updateCount(String(members + 1))}>
              <Plus size={17} aria-hidden />
            </Button>
          </div>
          {!validCount && <p>Masukkan 2 sampai 30 orang.</p>}
          {validCount && (
            <details className={styles.adjustments}>
              <summary>Nama peserta (opsional)<ChevronDown size={16} aria-hidden /></summary>
              <div className={styles.columns}>
                {Array.from({ length: members }, (_, index) => (
                  <label key={index} className={styles.field}>
                    <span>Nama orang {index + 1}</span>
                    <input value={equalNames[index] ?? ""} placeholder={`Orang ${index + 1}`} maxLength={50}
                      onChange={(event) => setEqualNames({ ...equalNames, [index]: event.target.value })} />
                  </label>
                ))}
              </div>
            </details>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="items" className={styles.form}>
          <SplitBillReceiptImport onImport={importReceipt}
            replacesDraft={items.some((item) => item.name !== "" || item.amount !== "" || item.people.length > 0) ||
              Number(fees.tax) > 0 || Number(fees.discount) > 0 || (taxUnit === "percent" && taxRate !== "")} />
          <div className={styles.columns}>
            {people.map((person, index) => (
              <div key={index}>
                <label className={styles.field}>
                  <span>Nama orang {index + 1}</span>
                  <input value={person} placeholder={`Orang ${index + 1}`} maxLength={50}
                    onChange={(event) => setPeople(people.map((name, position) => position === index ? event.target.value : name))} />
                </label>
                {people.length > 2 && <Button variant="ghost" type="button" onClick={() => removePerson(index)}>Hapus orang {index + 1}</Button>}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" disabled={people.length >= 30}
            onClick={() => setPeople([...people, ""])}><Plus size={16} aria-hidden /> Tambah orang</Button>
          {items.map((item, index) => (
            <fieldset className={styles.item} key={index}>
              <legend>Menu {index + 1}</legend>
              <label className={styles.field}>
                <span>Nama menu {index + 1}</span>
                <input value={item.name} maxLength={100} placeholder="Opsional" onChange={(event) => setItems(items.map((row, position) =>
                  position === index ? { ...row, name: event.target.value } : row))} />
              </label>
              <MoneyField label={`Harga menu ${index + 1} (Rp)`} value={item.amount} required onChange={(value) =>
                setItems(items.map((row, position) => position === index ? { ...row, amount: value, quantity: undefined, unitPrice: undefined } : row))} />
              {item.quantity && item.quantity > 1 ? (
                <div className={styles.receiptActions}>
                  <p>{item.quantity} porsi · Harga di atas untuk semua porsi.</p>
                  {items.length + item.quantity - 1 <= 50 ? (
                    <Button type="button" variant="outline" onClick={() => splitMenu(index, item)}>Pisah jadi {item.quantity} porsi</Button>
                  ) : <p>Jumlah baris akan melebihi batas 50 menu.</p>}
                </div>
              ) : null}
              <p>Siapa yang ikut berbagi menu ini?</p>
              <div className={styles.members}>
                {people.map((_, member) => (
                  <label key={member} htmlFor={`${splitId}-${index}-${member}`}>
                    <input id={`${splitId}-${index}-${member}`} type="checkbox" checked={item.people.includes(member)}
                      onChange={(event) => setItems(items.map((row, position) => position === index ? {
                        ...row, people: event.target.checked ? [...row.people, member] : row.people.filter((person) => person !== member),
                      } : row))} />
                    <span>{nameOf(member)}</span>
                  </label>
                ))}
              </div>
              {items.length > 1 && <Button type="button" variant="ghost" onClick={() => {
                setItems(items.filter((_, position) => position !== index)); setCopyStatus("");
              }}>Hapus menu {index + 1}</Button>}
            </fieldset>
          ))}
          <Button type="button" variant="outline" disabled={items.length >= 50}
            onClick={() => { setItems([...items, { name: "", amount: "", people: [] }]); setCopyStatus(""); }}><Plus size={16} aria-hidden /> Tambah menu</Button>
          {!validItems && <p>Isi harga dan pilih minimal satu orang untuk tiap menu.</p>}
        </Tabs.Panel>
      </Tabs.Root>

      <details className={styles.adjustments}>
        <summary>Pajak, biaya layanan, tip, dan diskon<ChevronDown size={16} aria-hidden /></summary>
        <p>Isi yang belum termasuk di nominal struk.</p>
        <div className={styles.tabs} role="group" aria-label="Satuan pajak">
          <button type="button" aria-pressed={taxUnit === "rupiah"} onClick={() => selectTaxUnit("rupiah")}>Pajak (Rp)</button>
          <button type="button" aria-pressed={taxUnit === "percent"} onClick={() => selectTaxUnit("percent")}>Pajak (%)</button>
        </div>
        {taxUnit === "rupiah" ? (
          <MoneyField label="Nominal pajak (Rp)" value={fees.tax} onChange={(value) => setFees({ ...fees, tax: value })} />
        ) : (
          <label className={styles.field}>
            <span>Persentase pajak (%)</span>
            <input inputMode="decimal" value={taxRate} maxLength={6} placeholder="Contoh 10" aria-invalid={!taxValid}
              onChange={(event) => setTaxRate(event.target.value)} />
            <small>Dihitung dari subtotal sebelum biaya lain dan diskon.</small>
          </label>
        )}
        {!taxValid && <p role="alert">Masukkan pajak 0–100%, maksimal dua angka desimal.</p>}
        <div className={styles.columns}>
          {([["service", "Biaya layanan"], ["tip", "Tip"], ["discount", "Diskon"]] as const).map(([field, label]) => (
            <MoneyField key={field} label={`${label} (Rp)`} value={fees[field]} onChange={(value) => setFees({ ...fees, [field]: value })} />
          ))}
        </div>
      </details>
      <label className={styles.payer}>
        <span><Wallet size={17} aria-hidden /> Siapa yang nalangin?</span>
        <span className={styles.select}>
          <select value={payer === null ? "" : String(payer)} disabled={!participantCount}
            onChange={(event) => setPayers({ ...payers, [mode]: event.target.value })}>
            <option value="">Belum dipilih</option>
            {Array.from({ length: participantCount }, (_, index) => <option key={index} value={index}>{nameOf(index)}</option>)}
          </select>
          <ChevronDown size={16} aria-hidden />
        </span>
      </label>
      {discount > subtotal + extras && <p role="alert">Diskon melebihi total tagihan.</p>}
      {ready && (
        <>
          <Result title="Rincian patungan">
            <dl>
              <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
              {tax > 0 && <div><dt>Pajak</dt><dd>{money(tax)}</dd></div>}
              {extras > tax && <div><dt>Layanan &amp; tip</dt><dd>{money(extras - tax)}</dd></div>}
              {discount > 0 && <div><dt>Diskon</dt><dd>−{money(discount)}</dd></div>}
              <div><dt>Total tagihan</dt><dd>{money(total)}</dd></div>
              {shares.map((value, index) => (
                <div key={index}><dt>{nameOf(index)}</dt><dd>{money(value)}</dd></div>
              ))}
            </dl>
          </Result>
          {payer !== null && (
            <Result title={`${nameOf(payer)} nalangin dulu`}>
              <dl>
                <div><dt>Sudah dibayar</dt><dd>{money(total)}</dd></div>
                <div><dt>Bagian sendiri</dt><dd>{money(shares[payer])}</dd></div>
                <div><dt>Total uang balik</dt><dd>{money(total - shares[payer])}</dd></div>
              </dl>
              {transfers.length > 0 ? (
                <ul className={styles.transfers}>
                  {transfers.map(({ index, value }) => (
                    <li key={index}>
                      <ArrowUpRight size={16} aria-hidden />
                      <span>{nameOf(index)} transfer ke {nameOf(payer)}</span>
                      <strong>{money(value)}</strong>
                    </li>
                  ))}
                </ul>
              ) : <p>Nggak ada transfer yang perlu dilakukan.</p>}
            </Result>
          )}
          <Button type="button" onClick={() => void copy()}><Copy size={17} aria-hidden /> Salin rincian</Button>
          {copyStatus && <p role="status">{copyStatus}</p>}
        </>
      )}
    </div>
  );
}

function Result({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.results}><h3>{title}</h3>{children}</section>;
}

function DiscountCalculator() {
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [cap, setCap] = useState("");
  const [kind, setKind] = useState<"discount" | "cashback">("discount");
  const base = rupiahInput(price);
  const validRate = validPercent(rate);
  const savings = base !== null && base > 0 && validRate ? discountAmount(base, rate, rupiahInput(cap)) : null;
  const cashback = kind === "cashback";

  return (
    <div className={styles.form}>
      <div className={styles.tabs} role="group" aria-label="Jenis promo">
        <button type="button" aria-pressed={!cashback} onClick={() => setKind("discount")}>Diskon langsung</button>
        <button type="button" aria-pressed={cashback} onClick={() => setKind("cashback")}>Cashback</button>
      </div>
      <MoneyField label="Harga awal (Rp)" value={price} onChange={setPrice} required />
      <label className={styles.field}>
        <span>{cashback ? "Cashback (%)" : "Diskon (%)"}</span>
        <input inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} maxLength={6}
          placeholder="Contoh 15" aria-invalid={rate !== "" && !validRate} />
      </label>
      {rate !== "" && !validRate && <p role="alert">Masukkan persentase 0–100, maksimal dua angka desimal.</p>}
      <MoneyField label={cashback ? "Maksimal cashback (Rp, opsional)" : "Maksimal potongan (Rp, opsional)"} value={cap} onChange={setCap} />
      {base !== null && savings !== null && (
        <Result title="Hasil promo">
          <dl>
            <div><dt>Bayar sekarang</dt><dd>{money(cashback ? base : base - savings)}</dd></div>
            <div><dt>{cashback ? "Cashback" : "Hemat"}</dt><dd>{money(savings)}</dd></div>
            {cashback && <div><dt>Harga efektif setelah cashback</dt><dd>{money(base - savings)}</dd></div>}
          </dl>
        </Result>
      )}
    </div>
  );
}

export function MochiTools() {
  const [active, setActive] = useState<(typeof tools)[number] | null>(null);
  return (
    <section className={styles.section} aria-labelledby="mochi-tools-title">
      <h2 id="mochi-tools-title">Tools Mochi</h2>
      <p>Hitung cepat &amp; patungan tanpa ribet.</p>
      <div className={styles.cards}>
        {tools.map((tool) => (
          <button key={tool.id} className={styles.card} type="button" onClick={() => setActive(tool)}>
            <span className={styles.icon} data-tool={tool.id}><tool.Icon size={20} aria-hidden /></span>
            <strong>{tool.title}</strong>
            <span>{tool.description}</span>
          </button>
        ))}
      </div>
      {active && (
        <Dialog title={active.title} variant="sheet" onClose={() => setActive(null)}>
          {active.id === "split" ? <SplitBill /> : <DiscountCalculator />}
        </Dialog>
      )}
    </section>
  );
}
