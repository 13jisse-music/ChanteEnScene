import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Cascade: Gemini 2.5 Flash (gratuit) → Gemini 2.0 Flash (gratuit) → OpenAI (payant, avec confirmation)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

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
 * mode=compose_openai : génère via OpenAI (après confirmation utilisateur)
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Aucune clé API configurée (Gemini ni OpenAI)" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { mode, action, themes, tone, subject, context, customThemes, siteInfo, useOpenAI } = body;

  // Quick text suggestions (intro paragraph, footer tagline)
  if (action === 'suggest-intro' || action === 'suggest-tagline') {
    return handleQuickSuggest(action, subject, tone);
  }

  if (mode === "suggest") {
    return handleSuggestThemes(context, siteInfo, useOpenAI);
  }

  if (mode === "compose") {
    return handleCompose(themes, tone, context, customThemes, siteInfo, useOpenAI);
  }

  return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
}

async function handleQuickSuggest(action: string, subject: string, tone: string) {
  const toneLabel = TONE_PROMPTS[tone] || TONE_PROMPTS.decale;

  const isIntro = action === 'suggest-intro';
  const prompt = isIntro
    ? `Tu es un r\u00e9dacteur de newsletters pour "ChanteEnSc\u00e8ne", un concours de chant amateur.
Style : ${toneLabel}
Sujet de la newsletter : "${subject}"

\u00c9cris un court paragraphe d'introduction (2-3 phrases max) pour cette newsletter. Il doit \u00eatre accrocheur, donner envie de lire la suite.
R\u00e9ponds UNIQUEMENT avec le texte du paragraphe, sans guillemets, sans pr\u00e9fixe.`
    : `Tu es un r\u00e9dacteur de newsletters pour "ChanteEnSc\u00e8ne", un concours de chant amateur.
Style : ${toneLabel}
Sujet de la newsletter : "${subject}"

\u00c9cris une phrase virale pour le bas de la newsletter (style "Transf\u00e9rez-la \u00e0 quelqu'un qui chante sous la douche").
Elle doit inciter au partage, \u00eatre dr\u00f4le ou touchante selon le ton, et finir par un emoji.
1 seule phrase. R\u00e9ponds UNIQUEMENT avec la phrase, sans guillemets.`;

  const result = await callWithCascade(prompt);

  if (!result.data) {
    return NextResponse.json({ error: result.error || 'Erreur IA' }, { status: 502 });
  }

  const text = extractText(result.data).trim().replace(/^["']|["']$/g, '');

  if (isIntro) {
    return NextResponse.json({ introText: text });
  }
  return NextResponse.json({ tagline: text });
}

async function handleSuggestThemes(
  context: string | undefined,
  siteInfo: Record<string, string> | undefined,
  useOpenAI?: boolean
) {
  const prompt = `Tu es un expert en email marketing pour un concours de chant amateur appelé "ChanteEnScène" à Aubagne.

Contexte actuel du concours : ${context || "Session en cours"}
Infos supplémentaires : ${siteInfo ? JSON.stringify(siteInfo) : "aucune"}

Suggère 6 thèmes de newsletter pertinents et accrocheurs. Chaque thème doit avoir :
- un titre court (3-5 mots)
- une description d'une ligne

Réponds UNIQUEMENT en JSON valide, format :
[{"title": "...", "description": "..."}, ...]`;

  const result = await callWithCascade(prompt, useOpenAI);

  if (result.needsOpenAI) {
    return NextResponse.json(
      { error: "quota_exhausted", message: "Quota Gemini épuisé", retryIn: result.retryIn },
      { status: 429 }
    );
  }

  if (!result.data) {
    return NextResponse.json(
      { error: result.error || "Erreur génération" },
      { status: 502 }
    );
  }

  try {
    const text = extractText(result.data);
    const json = extractJSON(text);
    return NextResponse.json({ themes: json, provider: result.provider });
  } catch {
    return NextResponse.json(
      { error: "Réponse IA invalide" },
      { status: 502 }
    );
  }
}

async function handleCompose(
  themes: string[],
  tone: string,
  context: string | undefined,
  customThemes: string | undefined,
  siteInfo: Record<string, string> | undefined,
  useOpenAI?: boolean
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
- Si pertinent, ajoute un CTA (bouton) avec texte et URL. IMPORTANT : utilise UNIQUEMENT ces URLs réelles :
  * https://chantenscene.fr (accueil)
  * https://chantenscene.fr/inscription (inscription candidat)
  * https://chantenscene.fr/reglement (règlement)
  * https://chantenscene.fr/palmares (palmarès éditions passées)
  * https://chantenscene.fr/editions (les éditions)
  * https://chantenscene.fr/proposer-un-lieu (proposer un lieu)
  * https://chantenscene.fr/soutenir (devenir sponsor)
  * https://chantenscene.fr/presse (espace presse)
  Si aucune URL ne correspond au thème, mets ctaUrl à null
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

  const result = await callWithCascade(prompt, useOpenAI);

  if (result.needsOpenAI) {
    return NextResponse.json(
      { error: "quota_exhausted", message: "Quota Gemini épuisé", retryIn: result.retryIn },
      { status: 429 }
    );
  }

  if (!result.data) {
    return NextResponse.json(
      { error: result.error || "Erreur génération" },
      { status: 502 }
    );
  }

  try {
    const text = extractText(result.data);
    const json = extractJSON(text) as {
      subject: string;
      sections: Section[];
    };

    return NextResponse.json({
      subject: json.subject,
      sections: json.sections.map((s: Section) => ({
        ...s,
        imageUrl: null,
      })),
      provider: result.provider,
    });
  } catch {
    return NextResponse.json(
      { error: "Réponse IA invalide" },
      { status: 502 }
    );
  }
}

interface CascadeResult {
  data: Record<string, unknown> | null;
  provider?: string;
  needsOpenAI?: boolean;
  retryIn?: number;
  error?: string;
}

async function callWithCascade(prompt: string, useOpenAI?: boolean): Promise<CascadeResult> {
  // If user explicitly chose OpenAI
  if (useOpenAI && OPENAI_API_KEY) {
    const data = await callOpenAI(prompt);
    if (data) return { data, provider: "openai" };
    return { data: null, error: "Erreur OpenAI" };
  }

  // Try Gemini models in cascade
  if (GEMINI_API_KEY) {
    let lastRetryIn = 60;
    for (const model of GEMINI_MODELS) {
      const result = await callGemini(prompt, model);
      if (result.data) {
        return { data: result.data, provider: model };
      }
      if (result.quotaExhausted) {
        if (result.retryIn) lastRetryIn = result.retryIn;
        continue; // Try next model
      }
      // Other error, try next
    }

    // All Gemini models exhausted
    return { data: null, needsOpenAI: !!OPENAI_API_KEY, retryIn: lastRetryIn };
  }

  // No Gemini key, try OpenAI directly
  if (OPENAI_API_KEY) {
    const data = await callOpenAI(prompt);
    if (data) return { data, provider: "openai" };
  }

  return { data: null, error: "Aucun service IA disponible" };
}

async function callGemini(prompt: string, model: string): Promise<{ data: Record<string, unknown> | null; quotaExhausted?: boolean; retryIn?: number }> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
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

    if (res.status === 429) {
      const errorBody = await res.text();
      // Extract retry time from error message
      const retryMatch = errorBody.match(/retry in ([\d.]+)s/i);
      const retryIn = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
      console.error(`Gemini ${model} quota exhausted, retry in ${retryIn}s`);
      return { data: null, quotaExhausted: true, retryIn };
    }

    if (!res.ok) {
      console.error(`Gemini ${model} error:`, res.status);
      return { data: null };
    }

    return { data: await res.json() };
  } catch (err) {
    console.error(`Gemini ${model} fetch error:`, err);
    return { data: null };
  }
}

async function callOpenAI(prompt: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI error:", res.status);
      return null;
    }

    const data = await res.json();
    // Convert OpenAI response format to match Gemini format
    const text = data?.choices?.[0]?.message?.content || "";
    return {
      candidates: [{ content: { parts: [{ text }] } }],
    };
  } catch (err) {
    console.error("OpenAI fetch error:", err);
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
