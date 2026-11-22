export function rupiahInput(value: string) {
  return /^\d{1,12}$/.test(value) ? Number(value) : null;
}

// Allocate whole rupiah and give leftover units to the largest fractional shares.
export function allocateRupiah(total: number, weights: number[]) {
  const sum = weights.reduce((result, weight) => result + BigInt(weight), BigInt(0));
  if (sum === BigInt(0)) return weights.map(() => 0);

  const shares = weights.map((weight, index) => {
    const numerator = BigInt(total) * BigInt(weight);
    return { index, amount: Number(numerator / sum), remainder: numerator % sum };
  });
  const leftover = total - shares.reduce((result, share) => result + share.amount, 0);
  const ranked = [...shares].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  ranked.slice(0, leftover).forEach((share) => { share.amount += 1; });
  return shares.map((share) => share.amount);
}

export function discountAmount(price: number, rate: string, cap: number | null) {
  const [whole, decimals = ""] = rate.replace(",", ".").split(".");
  const basisPoints = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  const amount = Number((BigInt(price) * BigInt(basisPoints) + BigInt(5000)) / BigInt(10000));
  return cap === null ? amount : Math.min(amount, cap);
}
