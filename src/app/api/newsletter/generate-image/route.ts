import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * POST /api/newsletter/generate-image
 * Génère une image via Gemini Imagen (gratuit) ou DALL-E (fallback payant)
 *
 * Body: { prompt: string, provider?: "gemini" | "dalle" }
 * Returns: { imageUrl: string, provider: string }
 */
export async function POST(req: NextRequest) {
  const { prompt, provider = "gemini" } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
  }

  // Try Gemini Imagen first (free)
  if (provider === "gemini" && GEMINI_API_KEY) {
    const result = await tryGeminiImagen(prompt);
    if (result) {
      return NextResponse.json({ imageUrl: result, provider: "gemini" });
    }
    // Gemini Imagen failed, try Gemini text-to-image as fallback
    const textResult = await tryGeminiTextImage(prompt);
    if (textResult) {
      return NextResponse.json({ imageUrl: textResult, provider: "gemini" });
    }
  }

  // DALL-E fallback (payant ~0.04$/image)
  if (provider === "dalle" || !GEMINI_API_KEY) {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Aucune clé API image configurée" },
        { status: 500 }
      );
    }
    const result = await tryDalle(prompt);
    if (result) {
      return NextResponse.json({ imageUrl: result, provider: "dalle" });
    }
  }

  return NextResponse.json(
    { error: "Impossible de générer l'image" },
    { status: 502 }
  );
}

async function tryGeminiImagen(prompt: string): Promise<string | null> {
  try {
    // Gemini 2.0 Flash with image generation
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Generate an image: ${prompt}. Style: professional newsletter banner, vibrant colors, 16:9 ratio, no text overlay.` }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!res.ok) {
      console.error("Gemini Imagen error:", res.status);
      return null;
    }

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (data as any)?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        // Return as data URL
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err) {
    console.error("Gemini Imagen fetch error:", err);
    return null;
  }
}

async function tryGeminiTextImage(prompt: string): Promise<string | null> {
  try {
    // Imagen 3 model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: `${prompt}. Professional newsletter banner, vibrant colors, 16:9 aspect ratio, no text.` }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const predictions = (data as any)?.predictions;
    if (predictions?.[0]?.bytesBase64Encoded) {
      return `data:image/png;base64,${predictions[0].bytesBase64Encoded}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function tryDalle(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `${prompt}. Professional email newsletter banner image, vibrant colors, 16:9 ratio, no text overlay.`,
        n: 1,
        size: "1792x1024",
        quality: "standard",
      }),
    });

    if (!res.ok) {
      console.error("DALL-E error:", res.status);
      return null;
    }

    const data = await res.json();
    return data?.data?.[0]?.url || null;
  } catch (err) {
    console.error("DALL-E fetch error:", err);
    return null;
  }
}
