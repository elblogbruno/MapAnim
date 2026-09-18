/**
 * Web Share API utility for invoking the native mobile sharing sheet (iOS AirDrop/Carrete/WhatsApp & Android QuickShare/Files).
 */

export interface ShareDataPayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export const canNativeShare = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
};

export const canNativeShareFiles = (files: File[]): boolean => {
  if (!canNativeShare()) return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
};

export const nativeShare = async (data: ShareDataPayload): Promise<{ success: boolean; cancelled?: boolean; error?: string }> => {
  if (!canNativeShare()) {
    return { success: false, error: 'Web Share API no disponible en este dispositivo' };
  }

  try {
    // If files are included, verify that canShare approves them
    if (data.files && data.files.length > 0) {
      if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: data.files })) {
        // Fallback without files
        const { files, ...rest } = data;
        await navigator.share(rest);
        return { success: true };
      }
    }

    await navigator.share(data);
    return { success: true };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User dismissed the native share sheet
      return { success: false, cancelled: true };
    }
    return { success: false, error: err.message || 'Error al compartir' };
  }
};
