import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { jsPDF } from 'jspdf';

/**
 * Descargas compatibles con la APK.
 *
 * En Android WebView los blobs no se descargan solos, así que el archivo se
 * escribe en la caché privada y se abre la hoja de compartir/guardar del
 * sistema. En navegador se mantiene la descarga normal.
 */

const CARPETA = 'helpdesk';

export function esNativo(): boolean {
  return Capacitor.isNativePlatform();
}

const limpiarNombre = (nombre: string): string =>
  nombre.replace(/[\\/:*?"<>|]/g, '_').trim() || 'documento';

/** Guarda un archivo base64 y abre el diálogo del sistema para guardarlo/compartirlo. */
export async function guardarArchivoBase64(base64: string, nombre: string): Promise<void> {
  const archivo = limpiarNombre(nombre);
  const { uri } = await Filesystem.writeFile({
    path: `${CARPETA}/${archivo}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({
    title: archivo,
    url: uri,
    dialogTitle: 'Guardar o compartir',
  });
}

/** Descarga un PDF generado con jsPDF. */
export async function descargarPdf(doc: jsPDF, nombre: string): Promise<void> {
  if (!esNativo()) {
    doc.save(nombre);
    return;
  }
  try {
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
    await guardarArchivoBase64(base64, nombre);
  } catch {
    // Si el complemento falla, al menos intenta la descarga del navegador.
    doc.save(nombre);
  }
}
