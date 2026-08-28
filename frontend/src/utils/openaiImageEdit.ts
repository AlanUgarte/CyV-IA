import { aiApi } from '../api/ai';

// Image generation runs on the BACKEND now. The OpenAI key lives server-side
// on Railway (OPENAI_API_KEY) — never in the browser bundle. These helpers keep
// their old signatures so callers (Creatives, NewCampaign) don't change.

type Fmt = '9:16' | '4:5' | '1:1';

async function blobUrlToBase64(blobUrl: string): Promise<{ base64: string; mimeType: string }> {
  const res  = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const dataUrl  = reader.result as string;
      resolve({ base64: dataUrl.split(',')[1], mimeType: blob.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Text-only generation: backend builds the prompt and calls OpenAI.
export async function generateProductImage(
  product: string,
  style: string,
  format: Fmt,
  hook?: string,
  description?: string,
): Promise<string> {
  const res = await aiApi.generateOpenAIImage({ product, style, format, hook, description });
  return res.data.data.imageBase64;
}

// Uploaded-photo path: Claude analyzes the photo → optimized prompt, then the
// backend generates from that prompt (photo influences the result via the prompt).
export async function editProductImage(
  photoUrl: string,
  product: string,
  style: string,
  format: Fmt,
  hook?: string,
  description?: string,
): Promise<string> {
  let prompt: string | undefined;
  try {
    const { base64, mimeType } = await blobUrlToBase64(photoUrl);
    const p = await aiApi.buildImagePrompt({ product, style, format, hook, description, imageBase64: base64, mimeType });
    prompt = (p.data as any)?.data?.prompt;
  } catch { /* backend builds a prompt from product/style if this fails */ }

  const res = await aiApi.generateOpenAIImage({ product, style, format, hook, description, prompt });
  return res.data.data.imageBase64;
}
