import { extractionResponseSchema } from "@/features/expenses/extract-chat";
import { apiRequest } from "@/lib/finance";

export async function extractReceipt(photo: Blob, caption: string, signal: AbortSignal) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Foto tidak bisa dibaca. Pilih foto lain."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(photo);
  });
  signal.throwIfAborted();
  const response = await apiRequest("receipts/extract", "POST", {
    image: { mime_type: photo.type, data }, caption,
  }, undefined, signal);
  const result = extractionResponseSchema.safeParse(response);
  if (!result.success || result.data.data.entries.length > 1)
    throw new Error("Hasil foto belum bisa dibaca. Coba ulang atau lengkapi manual.");
  return result.data.data;
}
