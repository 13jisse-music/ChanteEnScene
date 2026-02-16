import Link from "next/link";
import Image from "next/image";
import FloatingNotes from "@/components/FloatingNotes";
import MiniCountdown from "@/components/MiniCountdown";
import { createClient } from "@/lib/supabase/server";
import { statusToTimelineStep } from "@/lib/phases";

export const revalidate = 60;

const SESSION_SLUG = "aubagne-2026";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatPeriod(start?: string, end?: string): string | null {
  if (!start && !end) return null;
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  if (start) return `À partir du ${formatDate(start)}`;
  return `Jusqu'au ${formatDate(end!)}`;
}

function FeatureIcon({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-20 h-20 sm:w-28 sm:h-28 mb-3 sm:mb-4">
        <div
          className="absolute inset-0 rounded-full animate-glow-ring"
          style={{
            background:
              "conic-gradient(from 0deg, #f5a623, #e8732a, #d4380d, #f5a623)",
            padding: "3px",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
          }}
        />
        <div
          className="absolute inset-[-8px] rounded-full opacity-40 blur-xl"
          style={{
            background:
              "conic-gradient(from 0deg, #f5a623, #e8732a, #d4380d, #f5a623)",
          }}
        />
        <div className="absolute inset-[4px] rounded-full bg-[#1a1232] flex items-center justify-center">
          {children}
        </div>
      </div>
      <h3
        className="font-[family-name:var(--font-montserrat)] font-bold text-sm sm:text-lg text-white mb-1"
        style={{ textShadow: "0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
      >
        {title}
      </h3>
      <p
        className="text-white/80 text-xs sm:text-sm max-w-[220px] hidden sm:block"
        style={{ textShadow: "0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, slug, status, config")
    .order("year", { ascending: false })
    .limit(1)
    .single();

  const sessionSlug = session?.slug || SESSION_SLUG;

  // Fetch published sponsors (gold + silver for homepage)
  let sponsors: { id: string; name: string; logo_url: string | null; website_url: string | null; tier: string }[] = [];
  if (session) {
    const { data } = await supabase
      .from("sponsors")
      .select("id, name, logo_url, website_url, tier")
      .eq("session_id", session.id)
      .eq("published", true)
      .in("tier", ["gold", "silver"])
      .order("position");
    sponsors = data || [];
  }

  let candidates: {
    id: string;
    first_name: string;
    last_name: string;
    stage_name: string | null;
    photo_url: string | null;
    slug: string;
    accent_color: string;
  }[] = [];

  if (session) {
    const { data } = await supabase
      .from("candidates")
      .select(
        "id, first_name, last_name, stage_name, photo_url, slug, accent_color"
      )
      .eq("session_id", session.id)
      .in("status", ["approved", "semifinalist"])
      .order("likes_count", { ascending: false })
      .limit(4);
    candidates = data || [];
  }

  // Check if semifinal/final live_events are completed
  let completedEventTypes: string[] = [];
  let liveEvent: { id: string; event_type: string; status: string; is_voting_open: boolean } | null = null;
  if (session) {
    const { data: completedEvents } = await supabase
      .from("live_events")
      .select("event_type")
      .eq("session_id", session.id)
      .eq("status", "completed");
    completedEventTypes = (completedEvents || []).map((e: { event_type: string }) => e.event_type);

    // Check for a currently live event (finale or semifinal)
    const { data: activeEvent } = await supabase
      .from("live_events")
      .select("id, event_type, status, is_voting_open")
      .eq("session_id", session.id)
      .in("status", ["live", "paused", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    liveEvent = activeEvent;
  }

  const sessionConfig = (session?.config || {}) as Record<string, string>;
  const currentStep = session ? statusToTimelineStep(session.status) : 0;

  const steps = [
    {
      step: "01",
      title: "Inscriptions",
      period:
        formatPeriod(sessionConfig.registration_start, sessionConfig.registration_end) ||
        "Mars — Mai 2026",
      desc: "Inscrivez-vous en ligne avec votre vidéo de candidature",
    },
    {
      step: "02",
      title: "Sélections",
      period: sessionConfig.registration_end
        ? `À partir de ${formatDate(sessionConfig.registration_end)}`
        : "Mai 2026",
      desc: "Le jury sélectionne les candidats pour la demi-finale",
    },
    {
      step: "03",
      title: "Demi-finale",
      period: sessionConfig.semifinal_date
        ? formatDate(sessionConfig.semifinal_date)
        : "17 juin 2026",
      desc: "Prestation live devant le public et le jury",
    },
    {
      step: "04",
      title: "Grande finale",
      period: sessionConfig.final_date
        ? formatDate(sessionConfig.final_date)
        : "16 juillet 2026",
      desc: "Les finalistes s'affrontent sur la grande scène",
    },
  ];

  return (
    <>
      <FloatingNotes />

      {/* ━━━ LIVE BANNER ━━━ */}
      {liveEvent && (
        <Link
          href={`/${sessionSlug}/live`}
          className="relative z-20 flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-[#e91e8c] to-[#c4157a] text-white text-sm font-bold hover:brightness-110 transition-all"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span>
            {liveEvent.event_type === 'final'
              ? "La Grande Finale est en direct !"
              : "La demi-finale est en direct !"}
          </span>
          <span className="text-white/70 font-normal hidden sm:inline">— Cliquez pour voter</span>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ━━━ HERO ━━━ */}
      <section
        className="relative z-10 min-h-[92vh] flex items-end lg:items-center overflow-hidden lg:-mt-20"
        style={{
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      >
        <Image
          src="/images/hero.png"
          alt="Chanteuse sur scène"
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0618]/90 via-[#0a0618]/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 w-full pb-20 lg:pb-0">
          <div className="max-w-2xl animate-fade-up">
            <h1
              className="font-[family-name:var(--font-montserrat)] font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.1] mb-6 text-white"
              style={{ textShadow: "0 0 20px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.8)" }}
            >
              Lib&egrave;re ta voix.
              <br />
              <span className="text-gradient-gold" style={{ textShadow: "none" }}>
                Monte sur sc&egrave;ne.
              </span>
            </h1>
            <p
              className="text-white text-lg sm:text-xl leading-relaxed max-w-lg mb-8"
              style={{ textShadow: "0 0 15px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)" }}
            >
              Participe au premier concours de chant live &agrave; Aubagne.
              Sur sc&egrave;ne, avec des musiciens et un vrai public.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              {liveEvent ? (
                <Link
                  href={`/${sessionSlug}/live`}
                  className="group relative inline-flex items-center gap-3 px-6 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-sm sm:text-lg text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#e91e8c]/40 transition-all uppercase tracking-wider"
                >
                  <span className="absolute inset-0 rounded-full bg-[#e91e8c]/30 animate-ping opacity-40" />
                  <span className="relative flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>
                    {liveEvent.event_type === 'final' ? "C'est la Grande Finale !" : "En direct !"}
                    <span className="text-white/80 font-normal normal-case tracking-normal text-xs sm:text-sm">Votez maintenant</span>
                  </span>
                </Link>
              ) : !session?.status || session.status === 'draft' || session.status === 'registration_open' ? (
                <>
                  <Link
                    href={`/${sessionSlug}/inscription`}
                    className="inline-block px-5 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-base text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all uppercase tracking-wider"
                  >
                    S&apos;inscrire au concours
                  </Link>
                  <Link
                    href={`/${sessionSlug}/candidats`}
                    className="inline-block px-5 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-base text-white border-2 border-white/50 hover:border-white hover:bg-white/5 hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                  >
                    Voir les candidats
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={`/${sessionSlug}/candidats`}
                    className="inline-block px-5 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-base text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all uppercase tracking-wider"
                  >
                    D&eacute;couvrir les candidats
                  </Link>
                  <Link
                    href={`/${sessionSlug}/candidats`}
                    className="inline-block px-5 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-xs sm:text-base text-white border-2 border-white/50 hover:border-white hover:bg-white/5 hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                  >
                    Voir les candidats
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section className="relative z-10 py-16 px-4" id="concours">
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl md:text-4xl mb-4 text-white animate-fade-up"
            style={{ textShadow: "0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
          >
            Un concours de chant,{" "}
            <br className="hidden sm:block" />
            <span className="text-gradient-gold" style={{ textShadow: "none" }}>
              unique &agrave; vivre sur sc&egrave;ne
            </span>
          </h2>
          <p
            className="text-white text-base mb-16 max-w-2xl mx-auto animate-fade-up"
            style={{
              animationDelay: "0.2s",
              textShadow: "0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)",
            }}
          >
            Pas de playback, pas d&apos;&eacute;cran : ici, tout se passe en
            live.
          </p>

          <div
            className="grid grid-cols-3 gap-4 sm:gap-12 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <FeatureIcon
              title="Un concours live"
              subtitle="Sur scène, devant un vrai public avec des musiciens"
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#f5a623]">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </FeatureIcon>
            <FeatureIcon
              title="Un public, un jury"
              subtitle="Votes du public et notation par un jury professionnel"
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#e8732a]">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </FeatureIcon>
            <FeatureIcon
              title="Une vraie scène"
              subtitle="Espace Liberté et Cours Foch à Aubagne"
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#f5a623]">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </FeatureIcon>
          </div>
        </div>
      </section>

      {/* ━━━ TIMELINE + CANDIDATES ━━━ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className="font-[family-name:var(--font-montserrat)] font-black text-2xl sm:text-3xl md:text-4xl text-center text-white mb-10 sm:mb-16 animate-fade-up"
            style={{ textShadow: "0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
          >
            Les &eacute;tapes du{" "}
            <span className="text-gradient-gold" style={{ textShadow: "none" }}>concours</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Timeline with auto-tracking */}
            <div className="space-y-0 animate-fade-up">
              {steps.map((item, idx) => {
                const stepNum = idx + 1;
                // Map step number to live_event type for completion check
                const stepEventType: Record<number, string> = { 3: "semifinal", 4: "final" };
                const eventDone = stepEventType[stepNum] ? completedEventTypes.includes(stepEventType[stepNum]) : false;
                // A step is completed if we're past it OR it's the current step but its event is done
                const isCompleted = (currentStep > 0 && stepNum < currentStep) || (stepNum === currentStep && eventDone);
                // "active" = current step (not yet done) OR the next upcoming step (when currentStep is 0)
                const isActive =
                  (stepNum === currentStep && !eventDone) ||
                  (currentStep === 0 && stepNum === 1);
                const isFuture =
                  currentStep === 0
                    ? stepNum > 1
                    : stepNum > currentStep;

                return (
                  <div key={idx} className="flex gap-3 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        {/* Glow pulse behind active step */}
                        {isActive && (
                          <div className="absolute inset-[-6px] sm:inset-[-8px] rounded-full bg-[#f5a623]/40 animate-pulse blur-sm" />
                        )}
                        <div
                          className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                            isCompleted
                              ? "bg-gradient-to-br from-[#f5a623] to-[#e8732a] text-white shadow-lg shadow-[#f5a623]/30"
                              : isActive
                                ? "bg-gradient-to-br from-[#f5a623] to-[#e8732a] text-white shadow-lg shadow-[#f5a623]/50 ring-4 ring-[#f5a623]/30"
                                : "bg-[#1a1232]/80 border-2 border-white/20 text-white/30"
                          }`}
                        >
                          {isCompleted ? (
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            item.step
                          )}
                        </div>
                      </div>
                      {idx < 3 && (
                        <div
                          className={`w-0.5 h-10 sm:h-14 ${
                            isCompleted
                              ? "bg-gradient-to-b from-[#f5a623] to-[#f5a623]/40"
                              : "bg-white/10"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4 sm:pb-6 pt-0.5 sm:pt-1">
                      <h3
                        className={`font-[family-name:var(--font-montserrat)] font-bold text-base sm:text-lg ${
                          isFuture ? "text-white/50" : "text-white"
                        }`}
                        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
                      >
                        {item.title}
                      </h3>
                      {isActive && (
                        <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f5a623] text-[#1a1232] rounded-full shadow-lg shadow-[#f5a623]/40">
                          {currentStep === 0 ? "Prochainement" : "En cours"}
                        </span>
                      )}
                      {isCompleted && stepNum === currentStep && (
                        <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-500 text-white rounded-full shadow-lg shadow-green-500/40">
                          Terminé
                        </span>
                      )}
                      <p
                        className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1 mt-1 ${
                          isActive
                            ? "text-[#f5a623]"
                            : isFuture
                              ? "text-white/30"
                              : "text-[#f5a623]/70"
                        }`}
                        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
                      >
                        {item.period}
                      </p>
                      <p
                        className={`text-xs sm:text-sm ${isFuture ? "text-white/30" : "text-white/70"}`}
                        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
                      >
                        {item.desc}
                      </p>
                      {isActive && stepNum === 1 && sessionConfig.registration_start && (
                        <MiniCountdown targetDate={sessionConfig.registration_start} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Candidate portraits */}
            <div
              className="grid grid-cols-2 gap-6 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              {candidates.length > 0
                ? candidates.map((c) => {
                    const name =
                      c.stage_name || `${c.first_name} ${c.last_name}`;
                    return (
                      <div
                        key={c.id}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-3">
                          <div
                            className="absolute inset-0 rounded-full animate-glow-ring"
                            style={{
                              background: `conic-gradient(from 0deg, ${c.accent_color || "#f5a623"}, #e8732a, ${c.accent_color || "#f5a623"})`,
                              padding: "3px",
                              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
                              WebkitMask:
                                "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
                            }}
                          />
                          <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#1a1232]">
                            {c.photo_url ? (
                              <img
                                src={c.photo_url}
                                alt={name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl text-white/20">
                                🎤
                              </div>
                            )}
                          </div>
                        </div>
                        <p
                          className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white truncate w-full"
                          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
                        >
                          {name}
                        </p>
                        <Link
                          href={`/${sessionSlug}/candidats/${c.slug}`}
                          className="mt-2 text-xs font-semibold text-[#f5a623] hover:text-[#e8732a] transition-colors"
                          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
                        >
                          Voir / Encourager
                        </Link>
                      </div>
                    );
                  })
                : [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-3">
                        <div
                          className="absolute inset-0 rounded-full animate-glow-ring"
                          style={{
                            background:
                              "conic-gradient(from 0deg, #f5a623, #e8732a, #f5a623)",
                            padding: "3px",
                            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
                            WebkitMask:
                              "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
                          }}
                        />
                        <div className="absolute inset-[4px] rounded-full overflow-hidden bg-[#1a1232]">
                          <img
                            src={`/images/placeholder-singer-${i}.png`}
                            alt=""
                            className="w-full h-full object-cover opacity-70"
                          />
                        </div>
                      </div>
                      <p
                        className="font-[family-name:var(--font-montserrat)] font-bold text-sm text-white/50"
                        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
                      >
                        Bient&ocirc;t...
                      </p>
                    </div>
                  ))}
            </div>
          </div>

          <div className="text-center mt-12 animate-fade-up">
            <Link
              href={`/${sessionSlug}/candidats`}
              className="inline-block px-8 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all uppercase tracking-wider"
            >
              Voir tous les candidats
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="relative z-10 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto animate-fade-up">
          {liveEvent ? (
            <>
              <h2
                className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-6"
                style={{ textShadow: "0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
              >
                C&apos;est le{" "}
                <span className="text-gradient-gold" style={{ textShadow: "none" }}>grand moment</span>&nbsp;!
              </h2>
              <p
                className="text-white text-base mb-8 max-w-md mx-auto"
                style={{ textShadow: "0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)" }}
              >
                {liveEvent.event_type === 'final'
                  ? "La Grande Finale est en cours ! Suivez les performances et votez pour vos artistes pr\u00e9f\u00e9r\u00e9s en direct."
                  : "La demi-finale est en cours ! Suivez les performances et votez en direct."}
              </p>
              <Link
                href={`/${sessionSlug}/live`}
                className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold text-base text-white bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#e91e8c]/40 transition-all uppercase tracking-wider"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
                Voter en direct
              </Link>
            </>
          ) : !session?.status || session.status === 'draft' || session.status === 'registration_open' ? (
            <>
              <h2
                className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-6"
                style={{ textShadow: "0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
              >
                Pr&ecirc;t(e) &agrave; tenter{" "}
                <span className="text-gradient-gold" style={{ textShadow: "none" }}>l&apos;aventure</span> ?
              </h2>
              <p
                className="text-white text-base mb-8 max-w-md mx-auto"
                style={{ textShadow: "0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)" }}
              >
                Enfant, ado ou adulte : il y a une cat&eacute;gorie pour toi.
                Inscris-toi et montre ton talent sur sc&egrave;ne&nbsp;!
              </p>
              <Link
                href={`/${sessionSlug}/inscription`}
                className="inline-block px-10 py-4 rounded-full font-bold text-base text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all uppercase tracking-wider"
              >
                S&apos;inscrire au concours
              </Link>
            </>
          ) : (
            <>
              <h2
                className="font-[family-name:var(--font-montserrat)] font-black text-3xl md:text-4xl text-white mb-6"
                style={{ textShadow: "0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
              >
                Le concours est{" "}
                <span className="text-gradient-gold" style={{ textShadow: "none" }}>lanc&eacute;</span>&nbsp;!
              </h2>
              <p
                className="text-white text-base mb-8 max-w-md mx-auto"
                style={{ textShadow: "0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)" }}
              >
                Les inscriptions sont cl&ocirc;tur&eacute;es. D&eacute;couvrez les candidats
                et suivez l&apos;aventure&nbsp;!
              </p>
              <Link
                href={`/${sessionSlug}/candidats`}
                className="inline-block px-10 py-4 rounded-full font-bold text-base text-white bg-gradient-to-r from-[#d4380d] to-[#e8541e] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e8541e]/30 transition-all uppercase tracking-wider"
              >
                D&eacute;couvrir les candidats
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ━━━ AFFICHE ━━━ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="font-[family-name:var(--font-montserrat)] font-bold text-2xl md:text-3xl text-white mb-2"
            style={{ textShadow: "0 0 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.7)" }}
          >
            L&apos;affiche de la{" "}
            <span className="text-gradient-gold" style={{ textShadow: "none" }}>Grande Finale</span>
          </h2>
          <p
            className="text-white text-sm mb-8"
            style={{ textShadow: "0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)" }}
          >
            16 juillet 2026 — Cours Foch, Aubagne
          </p>
          <img
            src="/images/affiche.png"
            alt="Affiche ChanteEnScene — Grande Finale 2026"
            className="mx-auto rounded-2xl shadow-2xl shadow-black/30 max-w-md w-full"
          />
        </div>
      </section>

      {/* ━━━ SPONSORS ━━━ */}
      {sponsors.length > 0 && (
        <section className="relative z-10 py-12 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <p
              className="font-[family-name:var(--font-montserrat)] font-bold text-xs uppercase tracking-[0.2em] text-white/30 mb-8"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              Ils soutiennent ChanteEnScène
            </p>
            <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
              {sponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.website_url || undefined}
                  target={s.website_url ? "_blank" : undefined}
                  rel={s.website_url ? "noopener noreferrer" : undefined}
                  className={`block transition-all hover:scale-105 ${s.website_url ? 'cursor-pointer' : 'cursor-default'}`}
                  title={s.name}
                >
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className={`object-contain ${
                        s.tier === "gold"
                          ? "h-16 sm:h-20"
                          : "h-10 sm:h-14"
                      }`}
                      style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}
                    />
                  ) : (
                    <span
                      className={`font-[family-name:var(--font-montserrat)] font-bold text-white/60 ${
                        s.tier === "gold" ? "text-lg" : "text-sm"
                      }`}
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
                    >
                      {s.name}
                    </span>
                  )}
                </a>
              ))}
            </div>
            <Link
              href={`/${sessionSlug}/partenaires`}
              className="inline-block mt-6 text-xs text-white/20 hover:text-white/40 transition-colors"
            >
              Voir tous nos partenaires →
            </Link>
          </div>
        </section>
      )}

      {/* ━━━ FOOTER ━━━ */}
      <footer
        className="relative z-10 py-12 px-4 border-t border-white/10"
        id="infos"
      >
        <div className="max-w-5xl mx-auto text-center">
          <p
            className="font-[family-name:var(--font-montserrat)] font-bold text-sm mb-2"
            style={{ textShadow: "0 0 10px rgba(0,0,0,0.7)" }}
          >
            <span className="text-white">Chant</span>
            <span className="text-[#7ec850]">En</span>
            <span className="text-[#e91e8c]">Sc&egrave;ne</span>
          </p>
          <p
            className="text-white/50 text-xs mb-4"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            Concours de chant — Aubagne 2026
          </p>
          <div className="flex items-center justify-center gap-4 text-white/30 text-xs">
            <Link href="/mentions-legales" className="hover:text-white/60 transition-colors">
              Mentions l&eacute;gales
            </Link>
            <span>|</span>
            <Link href="/reglement" className="hover:text-white/60 transition-colors">
              R&egrave;glement
            </Link>
            <span>|</span>
            <Link href="/confidentialite" className="hover:text-white/60 transition-colors">
              Confidentialit&eacute;
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
