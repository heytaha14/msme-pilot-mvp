import { recognize } from 'tesseract.js';

const supportedOcrMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function isOcrSupportedFile(file) {
  return Boolean(file && supportedOcrMimeTypes.includes(file.type));
}

export function normalizeOcrText(text = '') {
  return String(text)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getOcrFriendlyError(error) {
  const message = String(error?.message || error || '').toLowerCase();

  if (message.includes('worker') || message.includes('initialize')) {
    return 'OCR engine failed to initialize.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'OCR engine could not load required files. Check your connection and try again.';
  }

  if (message.includes('image') || message.includes('read')) {
    return 'OCR could not read this image clearly.';
  }

  return 'OCR could not read this invoice clearly. You can review it manually or upload a clearer image.';
}

export function createOcrProgressMapper(onProgress) {
  return (message = {}) => {
    const status = message.status || 'processing';
    const progress = Math.round((Number(message.progress || 0) || 0) * 100);
    const normalizedStatus = status.toLowerCase();

    let step = 'Preparing OCR engine';
    if (normalizedStatus.includes('load')) step = 'Loading OCR engine';
    if (normalizedStatus.includes('initial')) step = 'Initializing OCR engine';
    if (normalizedStatus.includes('recogniz')) step = 'Recognizing invoice text';

    onProgress?.({
      status,
      step,
      progress: Math.max(5, Math.min(95, progress)),
    });
  };
}

async function runRecognition(image, options = {}) {
  const startedAt = performance.now();
  const result = await recognize(image, 'eng', {
    logger: createOcrProgressMapper(options.onProgress),
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const rawText = result?.data?.text || '';
  const normalizedText = normalizeOcrText(rawText);

  return {
    rawText,
    normalizedText,
    confidence: Number.isFinite(Number(result?.data?.confidence))
      ? Number(result.data.confidence)
      : null,
    words: result?.data?.words || [],
    lines: result?.data?.lines || [],
    durationMs,
  };
}

export async function extractTextFromImage(file, options = {}) {
  if (!isOcrSupportedFile(file)) {
    throw new Error('This file type cannot be processed with OCR yet.');
  }

  try {
    return await runRecognition(file, options);
  } catch (error) {
    throw new Error(getOcrFriendlyError(error));
  }
}

export async function extractTextFromImageUrl(imageUrl, options = {}) {
  if (!imageUrl) {
    throw new Error('Image URL is required for OCR.');
  }

  try {
    return await runRecognition(imageUrl, options);
  } catch (error) {
    throw new Error(getOcrFriendlyError(error));
  }
}
