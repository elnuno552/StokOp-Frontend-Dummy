import type { AuthContext } from "@/lib/auth/guards";

export const MAX_IMAGES_PER_ITEM = 10;

export type ImageResult = { ok: true } | { ok: false; error: string; status: number };

const UNAVAILABLE: ImageResult = { ok: false, error: "Unggah dan hapus foto tidak tersedia pada versi demo.", status: 501 };

// Demo build: there is no file storage.
export async function addItemImage(_actor: AuthContext, _itemId: string, _file: File, _ipAddress: string | null): Promise<ImageResult> {
  return UNAVAILABLE;
}

export async function deleteItemImage(_actor: AuthContext, _itemId: string, _imageId: string, _ipAddress: string | null): Promise<ImageResult> {
  return UNAVAILABLE;
}
