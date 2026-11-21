import { extractionResponseSchema } from "@/features/expenses/extract-chat";
import { requestExtraction } from "@/lib/extraction-request";

export async function extractReceipt(photo: Blob, caption: string, signal: AbortSignal) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Foto tidak bisa dibaca. Pilih foto lain."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(photo);
  });
  signal.throwIfAborted();
  return requestExtraction("receipts/extract", {
    image: { mime_type: photo.type, data }, caption,
  }, signal, response => {
    const result = extractionResponseSchema.safeParse(response);
    return result.success && result.data.data.entries.length <= 1 ? result.data.data : undefined;
  });
}
