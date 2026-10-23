import { Capacitor, registerPlugin } from '@capacitor/core';
import api from '../services/api';

/**
 * Universal file exporter for Web and Android Capacitor.
 * Supports Excel (.xlsx) and PDF (.pdf).
 */
export async function downloadExportFile(endpoint, fileName, mimeType) {
  try {
    const token = localStorage.getItem('hygge_token');
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const directDownloadUrl = `${apiBase}${cleanEndpoint}${cleanEndpoint.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || '')}`;

    // Infer mimeType if not provided
    const finalMime = mimeType || (
      fileName.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
    );

    // 1. Android APK Native Handling
    if (Capacitor.isNativePlatform()) {
      // Option A: Try native AppUpdater downloadPdf plugin method
      try {
        const AppUpdater = registerPlugin('AppUpdater');
        if (AppUpdater && typeof AppUpdater.downloadPdf === 'function') {
          await AppUpdater.downloadPdf({
            url: directDownloadUrl,
            fileName: fileName,
          });
          alert(`Download started for "${fileName}"!\n\nPlease check your phone's notification bar and Downloads folder.`);
          return true;
        }
      } catch (nativeErr) {
        console.warn('[Export] Native download method not available in current APK binary:', nativeErr);
      }

      // Option B: Web Share API (allows saving to Downloads/Drive/WhatsApp)
      try {
        const res = await api.get(cleanEndpoint, { responseType: 'blob' });
        const file = new File([res.data], fileName, { type: finalMime });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
          });
          return true;
        }
      } catch (shareErr) {
        console.warn('[Export] Web Share failed or dismissed:', shareErr);
      }

      // Option C: Open in external system browser with token parameter
      window.open(directDownloadUrl, '_system');
      return true;
    }

    // 2. Standard Web Browser Flow (Desktop / Web Mobile)
    const res = await api.get(cleanEndpoint, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: finalMime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 250);
    return true;
  } catch (err) {
    console.error('[Export] Error downloading file:', err);
    const msg = err.response?.data?.message || err.message || 'Failed to download report. Please try again.';
    alert(msg);
    throw err;
  }
}
