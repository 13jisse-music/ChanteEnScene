'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'

/* ═══════════════════════════════════════════════════ */
/* PARTIE 1 — CÔTÉ PUBLIC                              */
/* ═══════════════════════════════════════════════════ */

const PUBLIC_SLIDES: Slide[] = [
  /* 1. INTRO + QR */
  {
    title: 'ChanteEnScène',
    icon: '🎤',
    accent: '#e91e8c',
    subtitle: 'La plateforme digitale du concours de chant',
    content: (
      <div className="space-y-3 md:space-y-6 text-center max-w-2xl mx-auto">
        <p className="text-white/70 text-sm md:text-lg leading-relaxed">
          Une solution complète pour organiser un concours de chant,
          des inscriptions en ligne jusqu&apos;à la grande finale sur scène.
        </p>
        <div className="grid grid-cols-3 gap-3 md:gap-6 mt-3 md:mt-6">
          <Stat value="100%" label="En ligne" />
          <Stat value="Temps réel" label="Votes & scoring" />
          <Stat value="Mobile" label="App PWA" />
        </div>
        <div className="mt-3 md:mt-6">
          <DynamicQR url="https://chante-en-scene.vercel.app/presentation" />
          <p className="text-white/30 text-xs mt-2">Scannez pour suivre la présentation sur votre téléphone</p>
        </div>
        <p className="text-white/30 text-xs md:text-sm mt-2 md:mt-4">
          Aubagne — Édition 2026
        </p>
      </div>
    ),
  },

  /* 2. INSTALLATION & NOTIFICATIONS */
  {
    title: 'Installez l\'application',
    icon: '📲',
    accent: '#7ec850',
    subtitle: 'Accédez au concours comme une vraie app mobile',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 gap-2 md:gap-8 items-start">
          <div className="space-y-2 md:space-y-3">
            <Screenshot src="/images/presentation/install1.png" alt="Installation de l'application" />
            <div className="bg-[#7ec850]/10 border border-[#7ec850]/20 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
              <p className="text-[#7ec850] font-bold text-xs md:text-sm">Installer l&apos;app</p>
              <p className="text-white/40 text-[10px] md:text-xs mt-0.5">Sur l&apos;écran d&apos;accueil, sans store</p>
            </div>
          </div>
          <div className="space-y-2 md:space-y-3">
            <Screenshot src="/images/presentation/install2.png" alt="Activer les notifications" />
            <div className="bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
              <p className="text-[#f5a623] font-bold text-xs md:text-sm">Notifications</p>
              <p className="text-white/40 text-[10px] md:text-xs mt-0.5">Votes, résultats, événements en direct</p>
            </div>
          </div>
        </div>
        <div className="mt-2 md:mt-4 bg-white/5 rounded-lg md:rounded-xl p-2 md:p-3 border border-white/10">
          <p className="text-white/50 text-[10px] md:text-xs text-center">
            Aucun téléchargement depuis un store — tout fonctionne depuis le navigateur.
            L&apos;app se lance en plein écran avec son icône et son splash screen.
          </p>
        </div>
      </div>
    ),
  },

  /* 3. PARCOURS DU CONCOURS */
  {
    title: 'Le parcours du concours',
    icon: '🗺️',
    accent: '#f5a623',
    subtitle: '7 phases, de la préparation au palmarès',
    content: (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '📝', label: 'Inscriptions', desc: 'Formulaire 4 étapes', color: '#f5a623' },
            { icon: '📱', label: 'Votes en ligne', desc: 'Jury + public', color: '#3b82f6' },
            { icon: '🎵', label: 'Sélection MP3', desc: 'Playbacks & relances', color: '#7ec850' },
            { icon: '🎬', label: 'Demi-finale', desc: 'Live + vote direct', color: '#8b5cf6' },
            { icon: '🏟️', label: 'Grande finale', desc: 'Scoring pondéré', color: '#e91e8c' },
            { icon: '📸', label: 'Photos', desc: 'Galerie & souvenirs', color: '#8b5cf6' },
            { icon: '🏆', label: 'Palmarès', desc: 'Résultats & export', color: '#f5a623' },
            { icon: '📊', label: 'Analytics', desc: 'Stats temps réel', color: '#7ec850' },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-white text-xs font-bold mt-1">{s.label}</p>
              <p className="text-white/40 text-[10px]">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 md:mt-6 hidden md:flex items-center justify-center gap-2 flex-wrap">
          {['⚙️ Préparation', '📝 Inscriptions', '📱 En ligne', '🎵 Sélection', '🎬 Demi-finale', '🏟️ Finale', '🏆 Palmarès'].map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/70">{p}</span>
              {i < 6 && <span className="text-white/20">→</span>}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  /* 3. INSCRIPTIONS */
  {
    title: 'Inscriptions en ligne',
    icon: '📝',
    accent: '#f5a623',
    subtitle: 'Un parcours simple en 4 étapes',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 items-start">
          <div>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <StepCard step="1" title="Identité" desc="Nom, prénom, date de naissance, catégorie auto" />
              <StepCard step="2" title="Chanson" desc="Titre, artiste, style, accompagnement" />
              <StepCard step="3" title="Vidéo" desc="Upload vidéo candidature + photo profil" />
              <StepCard step="4" title="Validation" desc="Consentement, email de confirmation" />
            </div>
            <div className="mt-2 md:mt-4 bg-white/5 rounded-lg md:rounded-xl p-2 md:p-3 border border-white/10">
              <p className="text-white/50 text-[10px] md:text-xs text-center">
                Profil personnalisable : bio, photo, couleur, réseaux sociaux
              </p>
            </div>
          </div>
          <Screenshot src="/images/presentation/inscription.png" alt="Formulaire d'inscription" />
        </div>
      </div>
    ),
  },

  /* 4. GALERIE CANDIDATS */
  {
    title: 'Galerie candidats',
    icon: '🎭',
    accent: '#e91e8c',
    subtitle: 'Une expérience moderne et engageante',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 items-start">
          <div className="md:col-span-2">
            <Screenshot src="/images/presentation/candidats-desktop.png" alt="Galerie candidats desktop" />
            <p className="text-white/40 text-[10px] md:text-xs text-center mt-1 md:mt-2">Desktop — Feed Instagram</p>
          </div>
          <div>
            <Screenshot src="/images/presentation/candidats-mobile.png" alt="Galerie candidats mobile" />
            <p className="text-white/40 text-[10px] md:text-xs text-center mt-1 md:mt-2">Mobile — Swipe TikTok</p>
          </div>
        </div>
        <div className="mt-2 md:mt-4 bg-white/5 rounded-lg md:rounded-xl p-2 md:p-3 border border-white/10">
          <p className="text-white/50 text-[10px] md:text-xs text-center">
            Chaque candidat a sa propre page avec URL unique pour le partage sur les réseaux sociaux.
            Vote par fingerprint — 1 vote par appareil, sans création de compte.
          </p>
        </div>
      </div>
    ),
  },

  /* 5. SYSTÈME DE VOTES */
  {
    title: 'Système de votes',
    icon: '❤️',
    accent: '#e91e8c',
    subtitle: 'Votes sécurisés sans création de compte',
    content: (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-5">
          <FeatureBox
            title="🔒 Anti-triche"
            items={[
              'Fingerprint SHA-256 par appareil',
              '1 vote par appareil par candidat',
              'Pas de compte requis',
              'Détection multi-appareils',
            ]}
          />
          <FeatureBox
            title="⚡ Temps réel"
            items={[
              'Compteur de votes en direct',
              'Mise à jour instantanée',
              'Votes live pendant les événements',
              'Résultats visibles immédiatement',
            ]}
          />
          <FeatureBox
            title="📊 Analytics"
            items={[
              'Nombre de visiteurs par page',
              'Durée de visite, taux de rebond',
              'Source du trafic (referrer)',
              'Suivi par fingerprint anonyme',
            ]}
          />
        </div>
      </div>
    ),
  },

  /* 6. EXPÉRIENCE LIVE */
  {
    title: "L'expérience live",
    icon: '🔴',
    accent: '#ef4444',
    subtitle: 'Ce que vit le public sur son téléphone pendant le spectacle',
    content: (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-5">
          <FeatureBox
            title="❤️ Vote en direct"
            items={[
              'Le candidat sur scène apparaît sur le téléphone',
              'Bouton "Je soutiens" pour voter',
              '1 vote par appareil, sans compte',
              'Compteur de votes en temps réel',
            ]}
          />
          <FeatureBox
            title="📸 Mode Reporter"
            items={[
              'Le public prend des photos pendant le spectacle',
              "Jusqu'à 5 photos par spectateur",
              'Photos envoyées en modération admin',
              'Les meilleures publiées dans la galerie officielle',
            ]}
          />
          <FeatureBox
            title="🎉 Révélation du vainqueur"
            items={[
              'Countdown dramatique sur tous les écrans',
              'Animation de pièce 3D tournante',
              'Explosion de confettis synchronisée',
              'Photo et nom du gagnant en plein écran',
            ]}
          />
          <FeatureBox
            title="📡 Notifications & partage"
            items={[
              'Notifications push : "Candidat sur scène", "Vote ouvert"',
              'Partage sur WhatsApp, Facebook, X, Instagram',
              'Inscription newsletter pour être informé',
              'Tout fonctionne en temps réel (WebSocket)',
            ]}
          />
        </div>
        <div className="mt-2 md:mt-5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-white/70 text-[10px] md:text-sm">
            Les spectateurs n&apos;ont qu&apos;à scanner un QR code ou taper l&apos;URL pour participer.
          </p>
          <p className="text-white/40 text-xs mt-1">
            Aucun téléchargement, aucun compte — tout se passe dans le navigateur.
          </p>
        </div>
      </div>
    ),
  },

  /* 7. GALERIE PHOTOS */
  {
    title: 'Galerie photos',
    icon: '📸',
    accent: '#8b5cf6',
    subtitle: 'Souvenirs et partage après le concours',
    content: (
      <div className="max-w-5xl mx-auto">
        <Screenshot src="/images/presentation/galerie-photos.png" alt="Galerie photos publique" />
        <div className="mt-2 md:mt-4 grid grid-cols-2 gap-2 md:gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4">
            <h4 className="font-bold text-xs md:text-sm text-white mb-1 md:mb-2">📸 Vue publique</h4>
            <ul className="space-y-0.5 md:space-y-1">
              <li className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"><span className="text-[#8b5cf6] mt-0.5 text-[8px] md:text-[10px]">●</span>Filtres candidat/événement</li>
              <li className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"><span className="text-[#8b5cf6] mt-0.5 text-[8px] md:text-[10px]">●</span>Partage réseaux sociaux</li>
              <li className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"><span className="text-[#8b5cf6] mt-0.5 text-[8px] md:text-[10px]">●</span>Lightbox plein écran</li>
            </ul>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4">
            <h4 className="font-bold text-xs md:text-sm text-white mb-1 md:mb-2">⚙️ Vue admin</h4>
            <ul className="space-y-0.5 md:space-y-1">
              <li className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"><span className="text-[#8b5cf6] mt-0.5 text-[8px] md:text-[10px]">●</span>Upload drag-and-drop</li>
              <li className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"><span className="text-[#8b5cf6] mt-0.5 text-[8px] md:text-[10px]">●</span>Tags candidat/événement</li>
              <li className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"><span className="text-[#8b5cf6] mt-0.5 text-[8px] md:text-[10px]">●</span>Publier / modérer</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },

  /* 8. CHATBOT FAQ */
  {
    title: 'Chatbot FAQ',
    icon: '💬',
    accent: '#e91e8c',
    subtitle: 'Un assistant automatique pour répondre aux questions',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 items-start">
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="🤖 Réponses intelligentes"
              items={[
                '20 questions/réponses pré-configurées',
                'Reconnaissance synonymes (24 groupes sémantiques)',
                'Détection des salutations automatique',
                'Réponse de secours avec email de contact',
              ]}
            />
            <div className="bg-[#e91e8c]/10 border border-[#e91e8c]/20 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
              <p className="text-[#e91e8c] font-bold text-xs md:text-sm">Widget flottant</p>
              <p className="text-white/40 text-xs mt-1">Visible sur toutes les pages publiques</p>
            </div>
          </div>
          <Screenshot src="/images/presentation/chatbot.png" alt="Chatbot FAQ en action" />
        </div>
      </div>
    ),
  },

  /* 9. APPLICATION MOBILE PWA */
  {
    title: 'Application mobile',
    icon: '📱',
    accent: '#7ec850',
    subtitle: 'Progressive Web App — Fonctionne comme une vraie app',
    content: (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-5">
          <FeatureBox
            title="📲 Installation"
            items={[
              "Installable sur l'écran d'accueil",
              'Icône et splash screen personnalisés',
              'Fonctionne comme une app native',
              'Aucun store requis',
            ]}
          />
          <FeatureBox
            title="📡 Temps réel"
            items={[
              'Votes en direct pendant les événements',
              'Notifications push',
              'Mise à jour instantanée des scores',
              'Streaming et interaction live',
            ]}
          />
          <FeatureBox
            title="🌐 Accessibilité"
            items={[
              'Fonctionne sur tous les smartphones',
              'Page hors-ligne de secours',
              'Chargement rapide (Service Worker)',
              'Responsive : mobile, tablette, desktop',
            ]}
          />
        </div>
      </div>
    ),
  },
]

/* ═══════════════════════════════════════════════════ */
/* SÉPARATEUR                                          */
/* ═══════════════════════════════════════════════════ */

const SEPARATOR_SLIDE: Slide = {
  title: 'Côté organisateur',
  icon: '⚙️',
  accent: '#f5a623',
  subtitle: "Tout ce qui se passe dans les coulisses",
  content: (
    <div className="text-center max-w-xl mx-auto space-y-3 md:space-y-6">
      <p className="text-white/50 text-sm md:text-lg">
        Découvrez les outils de gestion et de pilotage réservés aux organisateurs du concours.
      </p>
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Stat value="16+" label="Modules admin" />
        <Stat value="Temps réel" label="Pilotage live" />
        <Stat value="100%" label="Automatisé" />
      </div>
    </div>
  ),
}

/* ═══════════════════════════════════════════════════ */
/* PARTIE 2 — CÔTÉ ADMIN                               */
/* ═══════════════════════════════════════════════════ */

const ADMIN_SLIDES: Slide[] = [
  /* ADMIN : VUE D'ENSEMBLE */
  {
    title: 'Administration',
    icon: '⚙️',
    accent: '#e91e8c',
    subtitle: "Un tableau de bord complet pour tout gérer",
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 items-start">
          <Screenshot src="/images/presentation/admin-dashboard.png" alt="Dashboard admin" />
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="📊 Dashboard"
              items={[
                "Vue d'ensemble : candidats, votes, phase en cours",
                'Stepper visuel de progression des phases',
                'Accès rapide à toutes les sections',
              ]}
            />
            <FeatureBox
              title="🏗️ 16+ modules"
              items={[
                'Configuration, Sessions, Candidats, Jury',
                'Régie en ligne, Régie demi-finale, Régie finale',
                'Stats, Export MP3, Photos, Chatbot, Résultats',
              ]}
            />
          </div>
        </div>
        <div className="mt-2 md:mt-4 grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
          <ScreenshotCard src="/images/presentation/admin-candidats.png" label="Candidats" />
          <ScreenshotCard src="/images/presentation/admin-config.png" label="Configuration" />
          <ScreenshotCard src="/images/presentation/admin-jury.png" label="Jury" />
          <ScreenshotCard src="/images/presentation/stats-enligne.png" label="Stats en ligne" />
          <ScreenshotCard src="/images/presentation/fiabilite-jury.png" label="Fiabilité jury" />
        </div>
      </div>
    ),
  },

  /* ADMIN : WORKFLOW COMPLET */
  {
    title: 'Le workflow complet',
    icon: '🔄',
    accent: '#e91e8c',
    subtitle: "De la configuration au palmarès, tout se pilote depuis l'admin",
    content: (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-1.5 md:space-y-3">
          {[
            { n: '1', icon: '⚙️', title: 'Configurer', desc: "Session, catégories d'âge, critères jury, poids scoring, dates, lieu", color: '#8b5cf6' },
            { n: '2', icon: '⭐', title: 'Créer les jurés', desc: "Ajouter les jurés, générer les QR codes, envoyer les liens d'accès", color: '#f5a623' },
            { n: '3', icon: '📝', title: 'Ouvrir les inscriptions', desc: "Les candidats s'inscrivent, l'admin approuve ou refuse", color: '#e91e8c' },
            { n: '4', icon: '📱', title: 'Lancer le vote en ligne', desc: 'Le jury note les vidéos, le public vote par like, suivre les stats', color: '#3b82f6' },
            { n: '5', icon: '🎵', title: 'Sélectionner & préparer', desc: 'Choisir les demi-finalistes, suivre les uploads MP3, relancer', color: '#7ec850' },
            { n: '6', icon: '🎬', title: 'Piloter la demi-finale', desc: 'Check-in, lineup, live, votes, sélection finalistes', color: '#f5a623' },
            { n: '7', icon: '🏟️', title: 'Piloter la finale', desc: 'Feuille de route, scoring pondéré, révélation vainqueur + confetti', color: '#e91e8c' },
            { n: '8', icon: '🏆', title: 'Post-compétition', desc: 'Résultats, galerie photos, export MP3, archivage', color: '#f5a623' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-2 md:gap-4 bg-white/[0.03] border border-white/[0.06] rounded-lg md:rounded-xl p-2 md:p-3">
              <span
                className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
                style={{ background: `${s.color}20`, color: s.color }}
              >
                {s.n}
              </span>
              <span className="text-base md:text-xl shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-white text-xs md:text-sm font-semibold">{s.title}</p>
                <p className="text-white/40 text-[10px] md:text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  /* JURY EN LIGNE */
  {
    title: 'Jury en ligne',
    icon: '⭐',
    accent: '#f5a623',
    subtitle: 'Notation professionnelle des vidéos de candidature',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 items-start">
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="🎯 Notation par critères"
              items={[
                'Critères configurables (justesse, interprétation, présence, originalité)',
                'Échelle de 1 à 5 étoiles par critère',
                'Commentaire libre par candidat',
                'Score total calculé automatiquement',
              ]}
            />
            <FeatureBox
              title="👨‍⚖️ Gestion des jurés"
              items={[
                'Ajout de jurés par email',
                'Connexion sécurisée par QR code unique',
                'Interface TikTok-style (swipe entre candidats)',
                'Suivi en temps réel des notations',
              ]}
            />
          </div>
          <div className="space-y-2 md:space-y-4">
            <Screenshot src="/images/presentation/interface-jury.png" alt="Interface jury mobile" />
            <Screenshot src="/images/presentation/jury-enligne.png" alt="Régie jury en ligne" />
          </div>
        </div>
      </div>
    ),
  },

  /* STATS & ANALYTICS */
  {
    title: 'Statistiques & Analytics',
    icon: '📊',
    accent: '#7ec850',
    subtitle: 'Suivez tout en temps réel',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 items-start">
          <Screenshot src="/images/presentation/stats-enligne.png" alt="Statistiques en ligne" />
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="📈 Stats en ligne"
              items={[
                'Verdicts jury par catégorie (camembert)',
                'Répartition des votes publics & partages',
                "Timeline d'activité par jour",
                'Top 5 jury vs public vs partages',
              ]}
            />
            <FeatureBox
              title="🔍 Fiabilité jury"
              items={[
                'Temps de visionnage avant vote',
                'Détection des votes suspects (< 5s)',
                'Pastille de fiabilité par juré',
                'Détail vote par vote extensible',
              ]}
            />
          </div>
        </div>
        <div className="mt-2 md:mt-4">
          <Screenshot src="/images/presentation/fiabilite-jury.png" alt="Fiabilité jury" />
        </div>
      </div>
    ),
  },

  /* EMAILS AUTOMATIQUES */
  {
    title: 'Emails automatiques',
    icon: '📧',
    accent: '#3b82f6',
    subtitle: 'Communication automatisée à chaque étape',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 items-start">
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="📬 Emails envoyés automatiquement"
              items={[
                "Confirmation d'inscription",
                'Sélection en demi-finale',
                'Relance pour upload MP3',
                'Récapitulatif jury (newsletter auto)',
              ]}
            />
            <FeatureBox
              title="✨ Personnalisés"
              items={[
                'Template HTML aux couleurs du concours',
                'Nom du candidat, lien direct vers son profil',
                'Envoi via Resend (deliverabilité pro)',
                'Envoi individuel ou groupé',
              ]}
            />
          </div>
          <Screenshot src="/images/presentation/mails-auto.png" alt="Emails automatiques" />
        </div>
      </div>
    ),
  },

  /* SÉLECTION & MP3 */
  {
    title: 'Sélection & Suivi MP3',
    icon: '🎵',
    accent: '#7ec850',
    subtitle: 'Préparation technique pour le jour J',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 items-start">
          <Screenshot src="/images/presentation/suivis_palyback.png" alt="Suivi MP3 playback" />
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="🎵 Suivi des playbacks"
              items={[
                'Chaque demi-finaliste uploade son MP3',
                'Suivi en temps réel (uploadé / manquant)',
                'Relance email automatique aux retardataires',
                'Lecteur audio intégré pour vérification',
              ]}
            />
            <FeatureBox
              title="💾 Export ZIP"
              items={[
                'Export par catégorie (Enfant, Ado, Adulte)',
                'Export par ordre de passage',
                'Fichiers nommés automatiquement',
                'Prêt pour le technicien son',
              ]}
            />
          </div>
        </div>
      </div>
    ),
  },

  /* CHECK-IN */
  {
    title: 'Check-in candidats',
    icon: '📋',
    accent: '#8b5cf6',
    subtitle: 'Pointage des candidats le jour J',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-8 items-start">
          <div>
            <Screenshot src="/images/presentation/admin-checkin.png" alt="Check-in vue admin" />
            <p className="text-white/40 text-xs text-center mt-2">Vue admin — Tableau de pointage</p>
          </div>
          <div>
            <Screenshot src="/images/presentation/client-checkin.png" alt="Check-in vue candidat" />
            <p className="text-white/40 text-xs text-center mt-2">Vue candidat — Self check-in sur téléphone</p>
          </div>
        </div>
        <div className="mt-2 md:mt-4 grid grid-cols-3 gap-2 md:gap-3">
          <div className="bg-[#7ec850]/10 border border-[#7ec850]/20 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
            <p className="text-[#7ec850] font-bold text-xs md:text-sm">Présent</p>
            <p className="text-white/40 text-[10px] md:text-xs mt-0.5 md:mt-1">Pointé à l&apos;arrivée</p>
          </div>
          <div className="bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
            <p className="text-[#f5a623] font-bold text-xs md:text-sm">En attente</p>
            <p className="text-white/40 text-[10px] md:text-xs mt-0.5 md:mt-1">Pas encore arrivé</p>
          </div>
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
            <p className="text-[#ef4444] font-bold text-xs md:text-sm">Absent</p>
            <p className="text-white/40 text-[10px] md:text-xs mt-0.5 md:mt-1">Marqué absent</p>
          </div>
        </div>
      </div>
    ),
  },

  /* RÉGIE DEMI-FINALE */
  {
    title: 'Régie demi-finale',
    icon: '🎬',
    accent: '#7ec850',
    subtitle: "Pilotage complet de l'événement en direct",
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 items-start">
          <Screenshot src="/images/presentation/regie-demifinale.png" alt="Régie demi-finale" />
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="📋 Avant l'événement"
              items={[
                'Lineup drag-and-drop',
                'Attribution des timings',
                'Gestion des absences',
              ]}
            />
            <FeatureBox
              title="🔴 Pendant le live"
              items={[
                'Appeler sur scène en 1 clic',
                'Ouvrir / fermer les votes',
                'Compteur de votes en direct',
                "Boutons d'incident (pause, absent, rejouer)",
              ]}
            />
            <FeatureBox
              title="✅ Après le live"
              items={[
                'Sélection des finalistes par catégorie',
                'Envoi des emails de sélection',
              ]}
            />
          </div>
        </div>
      </div>
    ),
  },

  /* GRANDE FINALE */
  {
    title: 'Grande finale',
    icon: '🏟️',
    accent: '#f5a623',
    subtitle: 'Le point culminant du concours',
    content: (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-5">
          <FeatureBox
            title="🎤 Performances"
            items={[
              'Lineup séquentiel sur scène',
              'Progression par catégorie',
              'Feuille de route avec estimation durée',
              'Gestion technique (MP3, timings)',
            ]}
          />
          <FeatureBox
            title="⚖️ Scoring hybride"
            items={[
              'Notes jury professionnel (60%)',
              'Votes du public en direct (30%)',
              'Réseaux sociaux / likes (10%)',
              'Pondération configurable en direct',
            ]}
          />
          <FeatureBox
            title="🏆 Révélation gagnant"
            items={[
              'Classement pondéré temps réel',
              'Sélection du vainqueur par catégorie',
              'Explosion de confettis sur tous les écrans',
              'Gestion des remplaçants en cours de route',
            ]}
          />
        </div>
      </div>
    ),
  },

  /* COMMUNICATION & RÉSEAUX SOCIAUX */
  {
    title: 'Communication automatisée',
    icon: '📣',
    accent: '#3b82f6',
    subtitle: 'Publication automatique sur Facebook et Instagram',
    content: (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 items-start">
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="🤖 Publications automatiques"
              items={[
                'Bienvenue aux nouveaux candidats dès leur inscription',
                'Countdown demi-finale et finale (J-7 à J-1)',
                'Rappels de vote chaque jeudi',
                'Promo hebdo chaque lundi',
              ]}
            />
            <FeatureBox
              title="📱 Multi-plateforme"
              items={[
                'Publication simultanée Facebook + Instagram',
                'Texte + image + lien vers le site',
                'Hashtags et emojis automatiques',
                'Calendrier des publications dans l\'admin',
              ]}
            />
          </div>
          <Screenshot src="/images/presentation/admin-social1.png" alt="Calendrier des publications automatiques" />
        </div>
        <div className="mt-2 md:mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 items-start">
          <Screenshot src="/images/presentation/admin-social2.png" alt="Publication Facebook / Instagram" />
          <div className="space-y-2 md:space-y-4">
            <FeatureBox
              title="🔔 Notifications push"
              items={[
                'Envoi ciblé : public, jury, ou tous',
                '"Candidat sur scène", "Vote ouvert"...',
                'Redirection vers la page concernée',
                'Depuis l\'interface admin en 1 clic',
              ]}
            />
            <FeatureBox
              title="✍️ Publication manuelle"
              items={[
                'Personnaliser le message avant publication',
                'Prévisualisation des prochains posts',
                'Prompts image pour ChatGPT/DALL-E',
                'Historique des publications (logs)',
              ]}
            />
          </div>
        </div>
      </div>
    ),
  },

  /* STACK TECHNIQUE */
  {
    title: 'Stack technique',
    icon: '🛠️',
    accent: '#94a3b8',
    subtitle: 'Technologies modernes et fiables',
    content: (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
          <FeatureBox
            title="⚡ Frontend"
            items={[
              'Next.js 16 (React 19) — Framework web leader',
              'TypeScript — Code sûr et maintenable',
              'Tailwind CSS 4 — Design moderne et responsive',
              'PWA — Fonctionne comme une application mobile',
            ]}
          />
          <FeatureBox
            title="🗄️ Backend & Infrastructure"
            items={[
              'Supabase (PostgreSQL) — Base de données temps réel',
              'Auth sécurisée — Cookies, RLS, rôles admin',
              'Storage — Hébergement photos, vidéos, MP3',
              'Realtime — WebSocket pour les votes live',
            ]}
          />
        </div>
        <div className="mt-3 md:mt-6 bg-white/5 rounded-lg md:rounded-xl p-2 md:p-4 border border-white/10">
          <p className="text-white/50 text-[10px] md:text-sm text-center">
            Plateforme hébergée dans le cloud, scalable, sécurisée. Aucune infrastructure physique à gérer.
            Réutilisable chaque année sans développement supplémentaire.
          </p>
        </div>
      </div>
    ),
  },

  /* MERCI */
  {
    title: 'Merci',
    icon: '🎶',
    accent: '#e91e8c',
    subtitle: 'Des questions ?',
    content: (
      <div className="text-center max-w-xl mx-auto space-y-4 md:space-y-8">
        <p className="text-2xl md:text-4xl font-bold">
          <span className="text-white">Chant</span>
          <span className="text-[#7ec850]">En</span>
          <span className="text-[#e91e8c]">Scène</span>
        </p>
        <p className="text-white/50 text-sm md:text-lg">
          Le concours de chant d&apos;Aubagne — Édition 2026
        </p>
        <DynamicQR url="https://chante-en-scene.vercel.app" />
        <div className="space-y-2">
          <p className="text-white/40 text-sm">contact@chantenscene.fr</p>
          <p className="text-white/40 text-sm">chante-en-scene.vercel.app</p>
        </div>
      </div>
    ),
  },
]

/* ═══════════════════════════════════════════════════ */
/* ASSEMBLAGE FINAL                                     */
/* ═══════════════════════════════════════════════════ */

const SLIDES: Slide[] = [...PUBLIC_SLIDES, SEPARATOR_SLIDE, ...ADMIN_SLIDES]

const PART_1_END = PUBLIC_SLIDES.length // index du séparateur

/* ═══════════════════════════════════════════════════ */
/* PAGE COMPONENT                                       */
/* ═══════════════════════════════════════════════════ */

export default function PresentationPage() {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)

  // ── Sync temps réel ──────────────────────────────────
  const [isPresenter, setIsPresenter] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const currentRef = useRef(current)
  const isFollowingRef = useRef(isFollowing)
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => { isFollowingRef.current = isFollowing }, [isFollowing])

  // Broadcast slide change (called by presenter)
  const broadcastSlide = useCallback((index: number) => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'slide-change', payload: { index } })
    }
  }, [])

  // Navigation helpers
  const goToSlide = useCallback((i: number) => {
    if (isFollowingRef.current) setIsFollowing(false)
    setCurrent(i)
  }, [])

  const next = useCallback(() => {
    if (isFollowingRef.current) setIsFollowing(false)
    setCurrent((c) => {
      const n = Math.min(c + 1, SLIDES.length - 1)
      if (isPresenter) broadcastSlide(n)
      return n
    })
  }, [isPresenter, broadcastSlide])

  const prev = useCallback(() => {
    if (isFollowingRef.current) setIsFollowing(false)
    setCurrent((c) => {
      const n = Math.max(c - 1, 0)
      if (isPresenter) broadcastSlide(n)
      return n
    })
  }, [isPresenter, broadcastSlide])

  // Presenter: also broadcast when clicking dots
  const goToSlidePresenter = useCallback((i: number) => {
    setCurrent(i)
    if (isPresenter) broadcastSlide(i)
  }, [isPresenter, broadcastSlide])

  // ── Channel Supabase Realtime Broadcast ──────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('presentation-live')
    channelRef.current = channel

    if (isPresenter) {
      // Presenter: subscribe, then broadcast start + heartbeat
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'presenter-start', payload: { index: currentRef.current } })
        }
      })
      const heartbeat = setInterval(() => {
        channel.send({ type: 'broadcast', event: 'heartbeat', payload: { index: currentRef.current } })
      }, 5000)
      return () => {
        clearInterval(heartbeat)
        channel.send({ type: 'broadcast', event: 'presenter-stop', payload: {} })
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    } else {
      // Audience: listen for broadcasts
      channel
        .on('broadcast', { event: 'slide-change' }, ({ payload }) => {
          if (isFollowingRef.current) setCurrent(payload.index)
        })
        .on('broadcast', { event: 'presenter-start' }, ({ payload }) => {
          setIsLive(true)
          setIsFollowing(true)
          setCurrent(payload.index)
        })
        .on('broadcast', { event: 'presenter-stop' }, () => {
          setIsLive(false)
          setIsFollowing(false)
        })
        .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
          setIsLive(true)
          if (isFollowingRef.current) setCurrent(payload.index)
          if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current)
          heartbeatTimeoutRef.current = setTimeout(() => {
            setIsLive(false)
            setIsFollowing(false)
          }, 12000)
        })
        .subscribe()
      return () => {
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current)
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    }
  }, [isPresenter])

  // Clavier
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      if (e.key === 'Escape') window.close()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev])

  // Swipe tactile
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0) next()
      else prev()
    }
  }

  const slide = SLIDES[current]
  const isPartAdmin = current > PART_1_END
  const partLabel = current === PART_1_END ? '' : isPartAdmin ? 'Admin' : 'Public'

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0a0618] flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      <div className="h-1 bg-white/5 shrink-0">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${((current + 1) / SLIDES.length) * 100}%`,
            background: `linear-gradient(90deg, ${slide.accent}, ${slide.accent}80)`,
          }}
        />
      </div>

      {/* Live banner (audience only) */}
      {isLive && !isPresenter && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-1 md:py-1.5 bg-[#e91e8c]/10 border-b border-[#e91e8c]/20">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#e91e8c] animate-pulse" />
          <span className="text-[#e91e8c] text-[10px] md:text-xs font-medium">
            {isFollowing ? 'En direct' : 'En cours'}
          </span>
          {isFollowing ? (
            <button
              onClick={() => setIsFollowing(false)}
              className="text-white/40 text-[10px] md:text-xs underline hover:text-white/60 ml-1"
            >
              Reprendre le contrôle
            </button>
          ) : (
            <button
              onClick={() => setIsFollowing(true)}
              className="text-[#e91e8c] text-[10px] md:text-xs underline hover:text-[#e91e8c]/80 ml-1"
            >
              Suivre
            </button>
          )}
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 md:px-8 py-2 md:py-8 overflow-y-auto">
        <div className="w-full max-w-5xl animate-fade-up" key={current}>
          {/* Part label */}
          {partLabel && (
            <p className="text-center text-[10px] uppercase tracking-widest text-white/20 mb-1 md:mb-2">
              {partLabel}
            </p>
          )}

          {/* Icon */}
          <div className="text-center mb-1 md:mb-2">
            <span className="text-2xl md:text-4xl">{slide.icon}</span>
          </div>

          {/* Title */}
          <h1
            className="font-[family-name:var(--font-montserrat)] font-black text-lg md:text-4xl text-center text-white mb-0.5 md:mb-1"
            style={{ textShadow: '0 0 30px rgba(0,0,0,0.5)' }}
          >
            {slide.title}
          </h1>

          {/* Subtitle */}
          {slide.subtitle && (
            <p className="text-center text-xs md:text-base mb-3 md:mb-8" style={{ color: slide.accent }}>
              {slide.subtitle}
            </p>
          )}

          {/* Content */}
          {slide.content}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-3 md:px-8 py-2 md:py-3 flex items-center justify-between border-t border-white/5">
        {/* Left: presenter toggle + slide number */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={() => setIsPresenter((p) => !p)}
            className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] transition-all ${
              isPresenter
                ? 'bg-[#e91e8c]/20 text-[#e91e8c] border border-[#e91e8c]/40'
                : 'bg-white/5 text-white/15 border border-white/5 hover:text-white/30'
            }`}
            title={isPresenter ? 'Mode présentateur actif' : 'Activer le mode présentateur'}
          >
            📡
          </button>
          <p className="text-white/20 text-xs md:text-sm font-mono">
            {current + 1}/{SLIDES.length}
          </p>
        </div>

        {/* Center: dots */}
        <div className="hidden md:flex items-center gap-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlidePresenter(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === current
                  ? slide.accent
                  : i === PART_1_END
                    ? 'rgba(245,166,35,0.3)'
                    : 'rgba(255,255,255,0.1)',
                transform: i === current ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Right: navigation */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={prev}
            disabled={current === 0}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-sm md:text-base"
          >
            ←
          </button>
          <button
            onClick={next}
            disabled={current === SLIDES.length - 1}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed text-sm md:text-base"
            style={{ background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}99)` }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════ */
/* SUB-COMPONENTS                                       */
/* ═══════════════════════════════════════════════════ */

interface Slide {
  title: string
  subtitle?: string
  icon: string
  content: React.ReactNode
  accent: string
}

function DynamicQR({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState(180)
  useEffect(() => {
    setSize(window.innerWidth < 768 ? 120 : 180)
  }, [])
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#1a1533', light: '#ffffff' },
      })
    }
  }, [url, size])
  return (
    <div className="inline-block bg-white rounded-xl md:rounded-2xl p-2 md:p-3 shadow-lg shadow-black/30">
      <canvas ref={canvasRef} />
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-montserrat)] font-bold text-base md:text-2xl text-[#f5a623]">{value}</p>
      <p className="text-white/40 text-[10px] md:text-xs mt-0.5 md:mt-1">{label}</p>
    </div>
  )
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 text-center">
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8732a] flex items-center justify-center mx-auto mb-1 md:mb-1.5 text-[10px] md:text-xs font-bold text-white">
        {step}
      </div>
      <h4 className="font-bold text-[10px] md:text-xs text-white mb-0.5">{title}</h4>
      <p className="text-white/40 text-[9px] md:text-[10px] leading-relaxed">{desc}</p>
    </div>
  )
}

function FeatureBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4">
      <h4 className="font-bold text-xs md:text-sm text-white mb-1 md:mb-2">{title}</h4>
      <ul className="space-y-0.5 md:space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-white/50 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2">
            <span className="text-[#f5a623] mt-0.5 text-[8px] md:text-[10px]">●</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-lg md:rounded-xl overflow-hidden border border-white/10 bg-white/5 shadow-lg shadow-black/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-auto object-contain max-h-[30vh] md:max-h-[50vh]"
        loading="lazy"
      />
    </div>
  )
}

function ScreenshotCard({ src, label }: { src: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-lg overflow-hidden border border-white/10 bg-white/5 shadow-md shadow-black/20 aspect-[16/10]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      </div>
      <p className="text-white/50 text-[10px] text-center font-medium">{label}</p>
    </div>
  )
}
