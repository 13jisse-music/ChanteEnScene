import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Modèle Gemini pour la génération d'images (free tier, 500 req/jour)
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * POST /api/newsletter/generate-image
 * Génère une image via Gemini (gratuit) ou DALL-E (fallback payant ~0.04$)
 *
 * Body: { prompt: string, provider?: "gemini" | "dalle" }
 * Returns: { imageUrl: string, provider: string }
 * Or: { error: "quota_exhausted", retryIn: number } with 429
 */
export async function POST(req: NextRequest) {
  const { prompt, provider = "gemini" } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
  }

  // Explicit DALL-E request
  if (provider === "dalle") {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Clé OpenAI non configurée" },
        { status: 500 }
      );
    }
    const result = await tryDalle(prompt);
    if (result) {
      return NextResponse.json({ imageUrl: result, provider: "dalle" });
    }
    return NextResponse.json(
      { error: "Erreur DALL-E" },
      { status: 502 }
    );
  }

  // Try Gemini first (free)
  if (GEMINI_API_KEY) {
    const result = await tryGeminiImage(prompt);
    if (result.imageUrl) {
      return NextResponse.json({
        imageUrl: result.imageUrl,
        provider: "gemini",
      });
    }
    if (result.quotaExhausted) {
      // Return quota info so frontend can show cascade UI
      return NextResponse.json(
        {
          error: "quota_exhausted",
          message: "Quota Gemini Image épuisé",
          retryIn: result.retryIn || 60,
          hasDalle: !!OPENAI_API_KEY,
        },
        { status: 429 }
      );
    }
    // Other Gemini error — log and continue to DALL-E
    console.error("Gemini image generation failed:", result.error);
  }

  // DALL-E fallback
  if (OPENAI_API_KEY) {
    const result = await tryDalle(prompt);
    if (result) {
      return NextResponse.json({ imageUrl: result, provider: "dalle" });
    }
  }

  return NextResponse.json(
    { error: "Impossible de générer l'image. Vérifiez les clés API." },
    { status: 502 }
  );
}

async function tryGeminiImage(
  prompt: string
): Promise<{
  imageUrl?: string;
  quotaExhausted?: boolean;
  retryIn?: number;
  error?: string;
}> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate an image: ${prompt}. Style: professional newsletter banner, vibrant colors, 16:9 ratio, no text overlay.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    });

    if (res.status === 429) {
      const errorBody = await res.text();
      const retryMatch = errorBody.match(/retry in ([\d.]+)s/i);
      const retryIn = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
      return { quotaExhausted: true, retryIn };
    }

    if (!res.ok) {
      const errorText = await res.text();
      return { error: `Gemini ${res.status}: ${errorText.substring(0, 200)}` };
    }

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (data as any)?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return {
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        };
      }
    }
    return { error: "Gemini n'a pas retourné d'image" };
  } catch (err) {
    return { error: `Fetch error: ${(err as Error).message}` };
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
      console.error("DALL-E error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data?.data?.[0]?.url || null;
  } catch (err) {
    console.error("DALL-E fetch error:", err);
    return null;
  }
}
