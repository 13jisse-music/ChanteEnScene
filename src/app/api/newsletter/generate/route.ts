import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const TONE_PROMPTS: Record<string, string> = {
  decale:
    'Ton décalé et humoristique. Utilise des jeux de mots, des références pop culture, des titres de section accrocheurs et percutants (ex: "Pendant que vous dormiez", "Alerte Rouge"). Le lecteur doit sourire en lisant.',
  pro:
    "Ton professionnel et sobre. Langage clair, phrases courtes, pas de familiarité. Style communiqué de presse.",
  chaleureux:
    "Ton chaleureux et convivial. Tutoiement accepté, émojis modérés, ambiance communauté bienveillante.",
  urgence:
    "Ton urgence/événementiel. Phrases courtes et percutantes, compte à rebours, majuscules pour les dates, sentiment FOMO (fear of missing out).",
  inspirant:
    "Ton inspirant et poétique. Belles formulations, métaphores musicales, citations inspirantes. Le lecteur doit se sentir galvanisé.",
};

type Section = {
  label: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imagePrompt: string;
  color: string;
  ctaText: string | null;
  ctaUrl: string | null;
};

/**
 * POST /api/newsletter/generate
 *
 * mode=suggest : suggère des thèmes basés sur le contexte
 * mode=compose : génère les sections de la newsletter
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Clé API Gemini non configurée" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { mode, themes, tone, context, customThemes, siteInfo } = body;

  if (mode === "suggest") {
    return handleSuggestThemes(context, siteInfo);
  }

  if (mode === "compose") {
    return handleCompose(themes, tone, context, customThemes, siteInfo);
  }

  return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
}

async function handleSuggestThemes(
  context: string | undefined,
  siteInfo: Record<string, string> | undefined
) {
  const prompt = `Tu es un expert en email marketing pour un concours de chant amateur appelé "ChanteEnScène" à Aubagne.

Contexte actuel du concours : ${context || "Session en cours"}
Infos supplémentaires : ${siteInfo ? JSON.stringify(siteInfo) : "aucune"}

Suggère 6 thèmes de newsletter pertinents et accrocheurs. Chaque thème doit avoir :
- un titre court (3-5 mots)
- une description d'une ligne

Réponds UNIQUEMENT en JSON valide, format :
[{"title": "...", "description": "..."}, ...]`;

  const data = await callGemini(prompt);
  if (!data) {
    return NextResponse.json(
      { error: "Erreur Gemini" },
      { status: 502 }
    );
  }

  try {
    const text = extractText(data);
    const json = extractJSON(text);
    return NextResponse.json({ themes: json });
  } catch {
    return NextResponse.json(
      { error: "Réponse Gemini invalide" },
      { status: 502 }
    );
  }
}

async function handleCompose(
  themes: string[],
  tone: string,
  context: string | undefined,
  customThemes: string | undefined,
  siteInfo: Record<string, string> | undefined
) {
  const toneInstruction =
    TONE_PROMPTS[tone] || TONE_PROMPTS.decale;

  const allThemes = [
    ...(themes || []),
    ...(customThemes ? [customThemes] : []),
  ];

  const prompt = `Tu es un rédacteur de newsletters expert pour "ChanteEnScène", un concours de chant amateur à Aubagne.

STYLE ÉDITORIAL : ${toneInstruction}

CONTEXTE : ${context || "Session en cours"}
INFOS : ${siteInfo ? JSON.stringify(siteInfo) : "aucune"}

THÈMES À TRAITER :
${allThemes.map((t, i) => `${i + 1}. ${t}`).join("\n")}

CONSIGNES :
- Crée une newsletter avec ${allThemes.length} sections (une par thème, max 5)
- Chaque section a : un LABEL (titre de catégorie en majuscules, 2-4 mots), un TITRE (accrocheur, 5-10 mots), un BODY (2-4 paragraphes courts, séparés par \\n\\n)
- Pour chaque section, propose un imagePrompt (description d'image à générer, en anglais, style réaliste/photo, 1 phrase)
- Propose une couleur hex par section (variée, dans la palette : #e91e8c rose, #7ec850 vert, #FFB800 doré, #6366f1 violet, #06b6d4 cyan, #f43f5e rouge)
- Si pertinent, ajoute un CTA (bouton) avec texte et URL vers chantenscene.fr
- Le sujet de l'email doit être accrocheur et résumer le contenu

Réponds UNIQUEMENT en JSON valide :
{
  "subject": "Sujet de l'email",
  "sections": [
    {
      "label": "LABEL SECTION",
      "title": "Titre accrocheur",
      "body": "Paragraphe 1\\n\\nParagraphe 2",
      "imagePrompt": "A vibrant concert scene with...",
      "color": "#e91e8c",
      "ctaText": "Texte bouton" ou null,
      "ctaUrl": "https://chantenscene.fr/..." ou null
    }
  ]
}`;

  const data = await callGemini(prompt);
  if (!data) {
    return NextResponse.json(
      { error: "Erreur Gemini" },
      { status: 502 }
    );
  }

  try {
    const text = extractText(data);
    const json = extractJSON(text) as {
      subject: string;
      sections: Section[];
    };

    return NextResponse.json({
      subject: json.subject,
      sections: json.sections.map((s: Section) => ({
        ...s,
        imageUrl: null, // Will be filled by image generation
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Réponse Gemini invalide" },
      { status: 502 }
    );
  }
}

async function callGemini(prompt: string) {
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!res.ok) {
      console.error("Gemini API error:", await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return null;
  }
}

function extractText(data: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function extractJSON(text: string) {
  // Remove markdown code fences
  const cleaned = text
    .replace(/^```json?\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
  return JSON.parse(cleaned);
}
