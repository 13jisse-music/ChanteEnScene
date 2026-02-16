'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ─── Section data ─── */
const SECTIONS = [
  { id: 'parcours', label: 'Parcours', icon: '🗺️', color: '#e91e8c', group: 'Général' },
  { id: 'preparation', label: 'Préparation', icon: '⚙️', color: '#8b5cf6', group: 'Général' },
  { id: 'inscriptions', label: 'Inscriptions', icon: '🎤', color: '#e91e8c', group: 'Général' },
  { id: 'phase-en-ligne', label: 'Phase En Ligne', icon: '📱', color: '#3b82f6', group: 'Général' },
  { id: 'selection', label: 'Sélection & MP3', icon: '🎵', color: '#7ec850', group: 'Général' },
  { id: 'demi-finale', label: 'Demi-finale', icon: '🎬', color: '#f5a623', group: 'Général' },
  { id: 'finale', label: 'Grande Finale', icon: '🏟️', color: '#e91e8c', group: 'Général' },
  { id: 'post-competition', label: 'Post-compétition', icon: '🏆', color: '#f5a623', group: 'Général' },
  { id: 'pages-publiques', label: 'Pages publiques', icon: '👥', color: '#7ec850', group: 'Général' },
  { id: 'stats-en-ligne', label: 'Stats En Ligne', icon: '📉', color: '#e91e8c', group: 'Statistiques' },
  { id: 'stats-marketing', label: 'Stats Marketing', icon: '📈', color: '#3b82f6', group: 'Statistiques' },
  { id: 'stats-jury', label: 'Fiabilité Jury', icon: '🔍', color: '#8b5cf6', group: 'Statistiques' },
  { id: 'stats-finale', label: 'Récap Finale', icon: '🏅', color: '#f5a623', group: 'Statistiques' },
  { id: 'astuces', label: 'Astuces', icon: '💡', color: '#7ec850', group: 'Aide' },
]

/* ─── Helpers ─── */
function Dot({ color }: { color: string }) {
  return <span className="inline-block w-3 h-3 rounded-full mr-2 shrink-0" style={{ background: color }} />
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <span className="w-8 h-8 rounded-full bg-[#e91e8c]/15 text-[#e91e8c] flex items-center justify-center text-sm font-bold shrink-0">
        {n}
      </span>
      <div className="text-white/60 text-sm leading-relaxed pt-1">{children}</div>
    </div>
  )
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <p className="text-white/80 text-sm font-semibold mb-1.5">
        <span className="mr-2">{icon}</span>{title}
      </p>
      <div className="text-white/50 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function IncidentBtn({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-3 items-start">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-white/80 text-sm font-semibold">{title}</p>
        <p className="text-white/40 text-sm">{desc}</p>
      </div>
    </div>
  )
}

function LegendRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Dot color={color} />
      <div>
        <span className="text-white/70 text-sm font-medium">{label}</span>
        <span className="text-white/40 text-sm"> — {desc}</span>
      </div>
    </div>
  )
}

function StatCard({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-white/80 text-sm font-medium">{label}</p>
        <p className="text-white/40 text-xs">{desc}</p>
      </div>
    </div>
  )
}

/* ─── Section content components ─── */
function SectionParcours() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">Le concours se déroule en 7 phases. Chaque phase débloque de nouvelles fonctionnalités dans l&apos;admin.</p>
      <div className="flex flex-wrap gap-2">
        {[
          { icon: '⚙️', label: 'Préparation', color: '#8b5cf6' },
          { icon: '🎤', label: 'Inscriptions', color: '#e91e8c' },
          { icon: '📱', label: 'Phase En Ligne', color: '#3b82f6' },
          { icon: '🎵', label: 'Sélection', color: '#7ec850' },
          { icon: '🎬', label: 'Demi-finale', color: '#f5a623' },
          { icon: '🏟️', label: 'Finale', color: '#e91e8c' },
          { icon: '🏆', label: 'Palmarès', color: '#f5a623' },
        ].map((p, i) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: `${p.color}15`, color: p.color }}>
              {p.icon} {p.label}
            </span>
            {i < 6 && <span className="text-white/20 text-lg">→</span>}
          </span>
        ))}
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-white/50 space-y-2">
        <p>La session passe par les statuts suivants :</p>
        <p><strong className="text-[#8b5cf6]">draft</strong> → <strong className="text-[#e91e8c]">registration_open</strong> → <strong className="text-[#e91e8c]">registration_closed</strong> → <strong className="text-[#f5a623]">semifinal</strong> → <strong className="text-[#e91e8c]">final</strong> → <strong className="text-white/30">archived</strong></p>
        <p className="text-white/30">Changez le statut depuis le Dashboard ou la page Sessions.</p>
      </div>
    </div>
  )
}

function SectionPreparation() {
  return (
    <div className="grid gap-3">
      <Card icon="📊" title="Dashboard">
        Vue d&apos;ensemble : nombre de candidats, votes, phase en cours. Un stepper visuel montre la progression entre les phases.
      </Card>
      <Card icon="⚙️" title="Configuration">
        Paramétrez tout le concours : catégories d&apos;âge, dates, lieu, critères de notation du jury (par phase), poids du scoring (jury/public/social), durées de performance et de vote.
      </Card>
      <Card icon="📁" title="Sessions">
        Gérez les sessions multi-tenant (ex: &quot;Aubagne 2026&quot;, &quot;Marseille 2027&quot;). Chaque session a ses propres candidats, jury et événements.
      </Card>
      <Card icon="⭐" title="Jury">
        Créez les jurés (nom, email, rôle : en ligne / demi-finale / finale). Chaque juré reçoit un QR code et un lien unique pour accéder à son interface de notation sur téléphone.
      </Card>
      <Card icon="🤝" title="Sponsors">
        Ajoutez logos et infos des sponsors. Ils s&apos;affichent sur les pages publiques.
      </Card>
      <Card icon="💬" title="Chatbot FAQ">
        Remplissez les questions/réponses fréquentes. Le chatbot widget y répond automatiquement.
      </Card>
    </div>
  )
}

function SectionInscriptions() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Les candidats s&apos;inscrivent via le formulaire public en 4 étapes (identité → chanson → média → consentement).
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Card icon="✅" title="Approuver / Refuser">Les inscriptions en attente de validation</Card>
        <Card icon="🔍" title="Filtrer">Par catégorie, statut, recherche par nom</Card>
        <Card icon="✏️" title="Modifier">Édition en ligne dans le tableau</Card>
        <Card icon="⬆️" title="Promouvoir">En demi-finaliste ou finaliste</Card>
      </div>
      <div className="bg-[#7ec850]/10 border border-[#7ec850]/20 rounded-xl p-4 text-sm text-[#7ec850]">
        💡 Passez la session en &quot;Inscriptions ouvertes&quot; depuis le Dashboard pour que le formulaire public soit accessible.
      </div>
    </div>
  )
}

function SectionPhaseEnLigne({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div className="grid gap-3">
      <Card icon="📱" title="Régie En Ligne">
        Suivez la notation du jury en ligne. Les jurés notent les candidats depuis leur téléphone (interface swipe TikTok-style, notation par étoiles). Visualisez la progression, les scores moyens et le classement par catégorie. Sélectionnez les demi-finalistes quand c&apos;est fini.
      </Card>
      <Card icon="📉" title="Stats En Ligne">
        Analytiques détaillées : verdicts jury, likes, partages, timeline, divergences jury/public.
        <br />
        <button onClick={() => onNavigate('stats-en-ligne')} className="text-[#e91e8c] underline mt-1">→ Voir les légendes détaillées</button>
      </Card>
      <Card icon="🔍" title="Fiabilité Jury">
        Vérifiez que les jurés votent sérieusement : temps de visionnage, votes suspects.
        <br />
        <button onClick={() => onNavigate('stats-jury')} className="text-[#8b5cf6] underline mt-1">→ Voir les légendes détaillées</button>
      </Card>
    </div>
  )
}

function SectionSelection() {
  return (
    <div className="grid gap-3">
      <Card icon="🎵" title="Suivi MP3">
        Suivez qui a uploadé son MP3 (playback pour la scène). Envoyez des relances par email individuelles ou groupées aux retardataires.
      </Card>
      <Card icon="💾" title="Export MP3">
        Exportez les MP3 en ZIP organisé par catégorie ou par ordre de passage. Utile pour le technicien son le jour J.
      </Card>
    </div>
  )
}

function SectionDemiFinale() {
  return (
    <div className="space-y-4">
      <Card icon="📋" title="Check-in">
        Pointez les demi-finalistes à leur arrivée. Ceux qui ne se présentent pas pourront être marqués absents.
      </Card>

      <p className="text-white/70 text-sm font-semibold mt-2">🎬 Workflow de la Régie :</p>
      <div className="space-y-3 mt-2">
        <Step n={1}><strong>Créer l&apos;événement</strong> — Définit le lineup (ordre de passage, drag-and-drop)</Step>
        <Step n={2}><strong>Lancer le direct</strong> — Passe en mode &quot;live&quot;</Step>
        <Step n={3}><strong>Appeler sur scène</strong> — Le candidat est annoncé, le public voit son profil</Step>
        <Step n={4}><strong>Fin chant → Ouvrir les votes</strong> — Le jury note + le public vote</Step>
        <Step n={5}><strong>Fermer les votes → Suivant</strong> — Passe au candidat suivant</Step>
        <Step n={6}><strong>Terminer la demi-finale</strong> — Verrouillez les scores</Step>
        <Step n={7}><strong>Sélectionner les finalistes</strong> — Choisissez par catégorie</Step>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Boutons d&apos;incident :</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <IncidentBtn icon="⏸" title="Pause" desc="Met l'événement en pause (visible par tous)" />
        <IncidentBtn icon="🚫" title="Absent" desc="Marque le candidat absent, passe au suivant" />
        <IncidentBtn icon="🔄" title="Rejouer" desc="Remet en performing (problème technique)" />
        <IncidentBtn icon="🗑" title="Reset notes" desc="Efface les notes jury (le jury peut revoter)" />
      </div>
    </div>
  )
}

function SectionFinale() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">Même principe que la demi-finale, avec des spécificités :</p>

      <div className="grid gap-3">
        <Card icon="📋" title="Feuille de route">
          Avant de créer l&apos;événement, organisez l&apos;ordre de passage par catégorie avec drag-and-drop. Estimation automatique de la durée totale.
        </Card>
        <Card icon="📂" title="Progression par catégorie">
          Enfant → Ado → Adulte. Chaque catégorie se déroule complètement avant de passer à la suivante.
        </Card>
        <Card icon="⚖️" title="Scoring pondéré">
          Ajustez en direct les poids : jury / votes public / réseaux sociaux (ex: 60% jury, 30% public, 10% social). Le classement se recalcule en temps réel.
        </Card>
        <Card icon="📊" title="Classement en direct">
          Le panneau latéral affiche le classement pondéré de la catégorie en cours.
        </Card>
        <Card icon="🎉" title="Révéler le vainqueur">
          À la fin de chaque catégorie, cliquez &quot;Révéler le vainqueur&quot;, sélectionnez le gagnant, confirmez. Animation confetti sur tous les écrans !
        </Card>
        <Card icon="➕" title="Remplaçant">
          Ajoutez un candidat remplaçant en cours de route si besoin.
        </Card>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Workflow d&apos;une catégorie :</p>
      <div className="space-y-3">
        <Step n={1}>Sélectionnez l&apos;onglet de la catégorie</Step>
        <Step n={2}>Appelez le 1er candidat sur scène</Step>
        <Step n={3}>Il chante → &quot;Fin chant / Ouvrir les votes&quot;</Step>
        <Step n={4}>Le jury note + le public vote sur son téléphone</Step>
        <Step n={5}>&quot;Fermer votes / Suivant&quot; → candidat suivant</Step>
        <Step n={6}>Répétez pour tous les candidats</Step>
        <Step n={7}>&quot;Révéler le vainqueur&quot; → confetti 🎉</Step>
        <Step n={8}>Passez à la catégorie suivante</Step>
      </div>
    </div>
  )
}

function SectionPostCompetition() {
  return (
    <div className="grid gap-3">
      <Card icon="🏆" title="Résultats">
        Synthèse complète par phase (en ligne, demi-finale, finale) avec détail des scores, votes et classements.
      </Card>
      <Card icon="📸" title="Photos">
        Gérez la galerie : uploadez, taguez par candidat ou événement, publiez/dépubliez. Les photos soumises par le public apparaissent séparément pour modération.
      </Card>
      <Card icon="💾" title="Export MP3">
        Ré-exportez les MP3 si besoin (archivage, souvenir).
      </Card>
    </div>
  )
}

function SectionPagesPubliques() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm mb-3">Ce que voient les visiteurs et les jurés :</p>
      <div className="grid gap-3">
        {[
          { path: '/slug/', icon: '🏠', title: 'Accueil', desc: "Page d'accueil de la session avec présentation, sponsors et liens" },
          { path: '/slug/candidats', icon: '🎤', title: 'Candidats', desc: 'Galerie des candidats (swipe TikTok sur mobile, feed social sur desktop). Vote public par "like".' },
          { path: '/slug/inscription', icon: '📝', title: 'Inscription', desc: "Formulaire d'inscription en 4 étapes" },
          { path: '/slug/live', icon: '🔴', title: 'Live', desc: 'Candidat en cours, bouton voter, annonce du vainqueur avec confetti' },
          { path: '/slug/galerie', icon: '📸', title: 'Galerie', desc: 'Galerie photos publique avec filtres' },
          { path: '/jury/[token]', icon: '⭐', title: 'Interface Jury', desc: 'Notation par critères (étoiles), feed TikTok-style. Le jury voit le candidat en cours et peut noter pendant la fenêtre de vote.' },
        ].map((p) => (
          <div key={p.path} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-4 items-start">
            <span className="text-2xl">{p.icon}</span>
            <div>
              <p className="text-white/80 text-sm font-semibold">{p.title}</p>
              <code className="text-[#7ec850] text-xs">{p.path}</code>
              <p className="text-white/50 text-sm mt-1">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionStatsEnLigne() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Analytiques de la phase de vote en ligne (jury + public + partages).
        <span className="text-white/30"> Page : </span>
        <Link href="/admin/stats-en-ligne" className="text-[#e91e8c] underline">/admin/stats-en-ligne</Link>
      </p>

      <p className="text-white/70 text-sm font-semibold mb-2">Cartes résumé :</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon="🎤" label="Candidats" desc="Nombre total de candidats" />
        <StatCard icon="🗳️" label="Votes jury" desc="Total des votes émis par les jurés" />
        <StatCard icon="👨‍⚖️" label="Jurés actifs" desc="Jurés ayant voté au moins une fois" />
        <StatCard icon="❤️" label="Likes" desc="Total des votes publics" />
        <StatCard icon="🔗" label="Partages" desc="Partages WhatsApp, Facebook, X, lien" />
        <StatCard icon="⭐" label="Demi-finalistes" desc="Candidats sélectionnés" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Verdicts jury par catégorie (camembert) :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <LegendRow color="#7ec850" label="Vert" desc="Oui (le juré valide le candidat)" />
        <LegendRow color="#f59e0b" label="Orange" desc="Peut-être (hésitation)" />
        <LegendRow color="#ef4444" label="Rouge" desc="Non (le juré refuse)" />
        <p className="text-white/40 text-sm pt-1">Le centre du camembert affiche le nombre total de votes.</p>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Activité des jurés (tableau) :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
        <p className="text-white/50"><strong className="text-white/70">Répartition</strong> — Barre colorée oui / peut-être / non</p>
        <p className="text-white/50"><strong className="text-white/70">Tendance</strong> — Compare le juré à la moyenne :</p>
        <div className="pl-4 space-y-1">
          <p><span className="text-[#7ec850] font-medium">Généreux +X%</span> — Note plus haut que la moyenne</p>
          <p><span className="text-[#ef4444] font-medium">Sévère -X%</span> — Note plus bas</p>
          <p><span className="text-white/30">Neutre</span> — Dans la moyenne</p>
        </div>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Controverses &amp; Unanimités :</p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/70 font-medium mb-1">Les plus controversés</p>
          <p className="text-white/40">5 candidats où le jury est le plus divisé. Utile pour identifier les profils qui font débat.</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/70 font-medium mb-1">Les plus unanimes</p>
          <p className="text-white/40">5 candidats où le jury est le plus d&apos;accord (généralement les meilleurs et les moins bons).</p>
        </div>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Timeline d&apos;activité :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <p className="text-white/50 text-sm">Barres horizontales par jour :</p>
        <LegendRow color="#e91e8c" label="Rose" desc="Votes jury" />
        <LegendRow color="#f5a623" label="Orange" desc="Likes publics" />
        <LegendRow color="#8b5cf6" label="Violet" desc="Partages" />
        <p className="text-white/30 text-sm pt-1">Permet de repérer les pics d&apos;activité et l&apos;impact de vos communications.</p>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Jury vs Public vs Partages :</p>
      <p className="text-white/50 text-sm">3 colonnes Top 5 côte à côte : qui le jury préfère, qui le public préfère, qui est le plus partagé. En bas : badges de divergences (candidats où les classements diffèrent fortement).</p>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Partages par plateforme :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <LegendRow color="#25D366" label="WhatsApp" desc="Partage par message" />
        <LegendRow color="#1877F2" label="Facebook" desc="Partage sur le fil" />
        <LegendRow color="#a3a3a3" label="X (Twitter)" desc="Tweet" />
        <LegendRow color="#8b5cf6" label="Lien copié" desc="URL copiée dans le presse-papier" />
        <LegendRow color="#e91e8c" label="Natif" desc="Partage mobile (menu système)" />
      </div>
    </div>
  )
}

function SectionStatsMarketing() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Analytiques de fréquentation : pages vues, engagement, trafic.
        <span className="text-white/30"> Page : </span>
        <Link href="/admin/stats-demi-finale" className="text-[#3b82f6] underline">/admin/stats-demi-finale</Link>
      </p>

      <p className="text-white/70 text-sm font-semibold mb-2">Cartes résumé :</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon="👁️" label="Vues totales" desc="Pages consultées sur le site" />
        <StatCard icon="👤" label="Visiteurs uniques" desc="Empreintes navigateur distinctes" />
        <StatCard icon="❤️" label="Likes totaux" desc="Total des votes publics" />
        <StatCard icon="⏱️" label="Durée moy." desc="Temps moyen sur un profil (secondes)" />
        <StatCard icon="⭐" label="Demi-finalistes" desc="Nombre de demi-finalistes" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Profils les plus consultés :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
        <LegendRow color="#3b82f6" label="Vues" desc="Nombre de consultations du profil" />
        <LegendRow color="#f5a623" label="Durée moy." desc="Temps moyen passé (en secondes)" />
        <LegendRow color="#e91e8c" label="Likes" desc="Votes publics reçus" />
        <p className="text-white/50 pt-2"><strong className="text-white/70">Conv. %</strong> — Taux de conversion = likes / visiteurs uniques :</p>
        <div className="pl-4 space-y-1 text-sm">
          <p><span className="text-[#7ec850] font-medium">&gt; 30%</span> — Excellent</p>
          <p><span className="text-[#f59e0b] font-medium">&gt; 10%</span> — Bon</p>
          <p><span className="text-white/30">&lt; 10%</span> — À améliorer</p>
        </div>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Sources de trafic :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <p className="text-white/50 text-sm mb-2">D&apos;où viennent vos visiteurs :</p>
        <LegendRow color="#8b5cf6" label="Direct" desc="Tape l'URL ou favori" />
        <LegendRow color="#3b82f6" label="Google" desc="Recherche" />
        <LegendRow color="#1877f2" label="Facebook" desc="Lien depuis Facebook" />
        <LegendRow color="#e91e8c" label="Instagram" desc="Lien depuis Instagram" />
        <LegendRow color="#333" label="TikTok" desc="Lien depuis TikTok" />
        <LegendRow color="#1da1f2" label="Twitter/X" desc="Lien depuis X" />
        <LegendRow color="#25d366" label="WhatsApp" desc="Lien partagé par message" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Appareils :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <LegendRow color="#e91e8c" label="📱 Mobile" desc="Téléphones" />
        <LegendRow color="#f5a623" label="📋 Tablette" desc="iPad, tablettes Android" />
        <LegendRow color="#3b82f6" label="💻 Desktop" desc="Ordinateurs" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Heures de pointe (heatmap) :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-white/50">
        <p>Grille 7 jours × 24 heures. Plus c&apos;est foncé (violet), plus il y a eu de visites à ce moment.</p>
        <p className="text-white/30 mt-1">Utile pour planifier vos publications aux heures de pointe.</p>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Engagement par catégorie :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <p className="text-white/50 text-sm">Compare les 3 catégories sur 3 métriques :</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center"><Dot color="#3b82f6" /> Vues</span>
          <span className="flex items-center"><Dot color="#e91e8c" /> Likes</span>
          <span className="flex items-center"><Dot color="#f5a623" /> Durée moy.</span>
        </div>
      </div>
    </div>
  )
}

function SectionStatsJury() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Vérifiez que les jurés votent sérieusement en analysant le temps de visionnage.
        <span className="text-white/30"> Page : </span>
        <Link href="/admin/stats-jury" className="text-[#8b5cf6] underline">/admin/stats-jury</Link>
      </p>

      <p className="text-white/70 text-sm font-semibold mb-2">Cartes résumé :</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <StatCard icon="👨‍⚖️" label="Jurés actifs" desc="Jurés ayant commencé à voter" />
        <StatCard icon="✅" label="Taux complétion" desc="% de candidats notés / total" />
        <StatCard icon="⏱️" label="Temps moyen" desc="Durée moyenne de visionnage avant vote" />
        <StatCard icon="⚠️" label="Votes suspects" desc="Votes émis en moins de 5 secondes" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Qualité des votes (camembert) :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <LegendRow color="#7ec850" label="Visionnage complet" desc="> 10 secondes de vidéo regardée" />
        <LegendRow color="#f59e0b" label="Visionnage rapide" desc="5 à 10 secondes" />
        <LegendRow color="#ef4444" label="Suspect" desc="< 5s, le juré n'a probablement pas regardé" />
        <LegendRow color="rgba(255,255,255,0.08)" label="Non voté" desc="Candidat pas encore noté" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Distribution temps de visionnage :</p>
      <p className="text-white/50 text-sm">5 barres verticales : 0-5s, 5-15s, 15-30s, 30-60s, 60s+. Un bon juré a la majorité de ses votes dans les tranches 15s+.</p>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Détail par juré (tableau extensible) :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3 text-sm">
        <p className="text-white/50">Cliquez sur ▼ pour voir le détail vote par vote d&apos;un juré.</p>
        <p className="text-white/70 font-medium">Pastille de fiabilité :</p>
        <LegendRow color="#7ec850" label="Vert" desc="Fiable (peu ou pas de votes suspects)" />
        <LegendRow color="#f59e0b" label="Orange" desc="À surveiller (quelques votes rapides)" />
        <LegendRow color="#ef4444" label="Rouge" desc="Suspect (beaucoup de votes trop rapides)" />
        <p className="text-white/40 pt-2">Le sous-tableau montre : candidat, décision (👍/🤔/👎), temps de visionnage, date/heure, alerte ⚠️ si suspect.</p>
      </div>
    </div>
  )
}

function SectionStatsFinale() {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Bilan complet de la finale : scores, classement, durées, activité jury.
        <span className="text-white/30"> Page : </span>
        <Link href="/admin/finale/stats" className="text-[#f5a623] underline">/admin/finale/stats</Link>
      </p>

      <p className="text-white/70 text-sm font-semibold mb-2">Cartes résumé :</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon="🎤" label="Finalistes" desc="Nombre total dans le lineup" />
        <StatCard icon="📁" label="Catégories" desc="Enfant, Ado, Adulte" />
        <StatCard icon="❤️" label="Votes" desc="Total des votes publics en direct" />
        <StatCard icon="⭐" label="Notes" desc="Total des notes jury en finale" />
        <StatCard icon="👨‍⚖️" label="Jurés" desc="Nombre de jurés de finale" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Barre de poids :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
        <LegendRow color="#e91e8c" label="Rose" desc="% Jury" />
        <LegendRow color="#7ec850" label="Vert" desc="% Public (votes en direct)" />
        <LegendRow color="#3b82f6" label="Bleu" desc="% Réseaux sociaux (likes)" />
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Tableau par catégorie :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3 text-sm">
        <p className="text-white/50"><strong className="text-white/70">#</strong> — Rang (🥇 or, 🥈 argent, 🥉 bronze)</p>
        <p className="text-white/50"><strong className="text-white/70">Jury</strong> — Score normalisé sur 100. En gris : nombre de jurés ayant noté.</p>
        <p className="text-white/50"><strong className="text-white/70">Public</strong> — Nombre de votes en direct + % normalisé</p>
        <p className="text-white/50"><strong className="text-white/70">Réseaux</strong> — Nombre de likes + % normalisé</p>
        <p className="text-white/50"><strong className="text-white/70">Total</strong> — Score pondéré final = (Jury × poids) + (Public × poids) + (Réseaux × poids). C&apos;est la colonne décisive !</p>
        <p className="text-white/50"><strong className="text-white/70">Durée</strong> — Temps de performance en MM:SS</p>

        <p className="text-white/70 font-medium pt-2">Mini barre empilée (Score) :</p>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center"><Dot color="#e91e8c" /> Jury</span>
          <span className="flex items-center"><Dot color="#7ec850" /> Public</span>
          <span className="flex items-center"><Dot color="#3b82f6" /> Réseaux</span>
        </div>

        <p className="text-white/70 font-medium pt-2">Statut :</p>
        <div className="space-y-1 text-white/50">
          <p>🏆 Vainqueur de la catégorie</p>
          <p>⚠️ Vainqueur forcé (choisi manuellement, pas le 1er au classement)</p>
          <p>ABS — Absent</p>
        </div>
      </div>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Camembert du vainqueur :</p>
      <p className="text-white/50 text-sm">Répartition jury / public / social du score gagnant. Si le vainqueur a été forcé, un avertissement orange s&apos;affiche.</p>

      <p className="text-white/70 text-sm font-semibold mt-4 mb-2">Activité jury :</p>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
        <p className="text-white/50"><strong className="text-white/70">Score moyen</strong> — Moyenne des notes attribuées (en doré)</p>
        <p className="text-white/50"><strong className="text-white/70">Tendance</strong> :</p>
        <div className="pl-4 space-y-1">
          <p><span className="text-[#7ec850] font-medium">+X.X Généreux</span> — Au-dessus de la moyenne globale</p>
          <p><span className="text-[#e91e8c] font-medium">-X.X Sévère</span> — En-dessous de la moyenne</p>
          <p><span className="text-white/30">Neutre</span> — Dans la moyenne</p>
        </div>
      </div>
    </div>
  )
}

function SectionAstuces() {
  return (
    <div className="grid gap-3">
      <Card icon="📱" title="Testez le vote public">
        Ouvrez <code className="bg-white/5 px-1.5 py-0.5 rounded text-[#7ec850]">/aubagne-2026/live</code> sur un téléphone pendant que vous pilotez la régie sur le PC.
      </Card>
      <Card icon="⭐" title="Testez le jury">
        Ouvrez le lien jury sur un autre appareil. Le jury reçoit les candidats en temps réel.
      </Card>
      <Card icon="🔔" title="Notifications push">
        Activez-les dans le navigateur pour recevoir les alertes &quot;vote ouvert&quot;, &quot;candidat sur scène&quot;, etc.
      </Card>
      <Card icon="🔄" title="Synchronisation mobile">
        Toutes les pages se mettent à jour automatiquement (WebSocket + polling toutes les 5s). Si un téléphone semble bloqué, fermez l&apos;onglet complètement et rouvrez-le.
      </Card>
      <Card icon="🧪" title="Données de test">
        Utilisez la page <Link href="/admin/seed" className="text-[#7ec850] underline">Données test</Link> pour injecter des candidats fictifs et tester tout le parcours.
      </Card>
      <Card icon="🔁" title="Reset">
        La page Données test permet un reset complet de la session (efface tout et repart de zéro).
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─── */
/* ═══════════════════════════════════════════ */
export default function AdminGuide() {
  const [activeId, setActiveId] = useState('parcours')

  const active = SECTIONS.find((s) => s.id === activeId) || SECTIONS[0]

  // Group sections for the menu
  const groups = [...new Set(SECTIONS.map((s) => s.group))]

  function renderContent() {
    switch (activeId) {
      case 'parcours': return <SectionParcours />
      case 'preparation': return <SectionPreparation />
      case 'inscriptions': return <SectionInscriptions />
      case 'phase-en-ligne': return <SectionPhaseEnLigne onNavigate={setActiveId} />
      case 'selection': return <SectionSelection />
      case 'demi-finale': return <SectionDemiFinale />
      case 'finale': return <SectionFinale />
      case 'post-competition': return <SectionPostCompetition />
      case 'pages-publiques': return <SectionPagesPubliques />
      case 'stats-en-ligne': return <SectionStatsEnLigne />
      case 'stats-marketing': return <SectionStatsMarketing />
      case 'stats-jury': return <SectionStatsJury />
      case 'stats-finale': return <SectionStatsFinale />
      case 'astuces': return <SectionAstuces />
      default: return null
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] overflow-hidden">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-6 pt-6 pb-4 lg:px-8">
        <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-2xl text-white">
          Mode d&apos;emploi
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Sélectionnez une rubrique pour afficher son contenu.
        </p>
      </div>

      {/* ─── Body: Menu (left) + Content (right) ─── */}
      <div className="flex flex-1 min-h-0 px-6 pb-6 lg:px-8 gap-6">

        {/* ─── MENU SIDEBAR ─── */}
        <nav className="shrink-0 w-56 overflow-y-auto pr-2 hidden lg:block space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold px-2 pb-1.5">
                {group}
              </p>
              <div className="space-y-0.5">
                {SECTIONS.filter((s) => s.group === group).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left"
                    style={{
                      background: activeId === s.id ? `${s.color}15` : 'transparent',
                      color: activeId === s.id ? s.color : 'rgba(255,255,255,0.4)',
                      borderLeft: activeId === s.id ? `3px solid ${s.color}` : '3px solid transparent',
                    }}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ─── MOBILE MENU (horizontal scroll) ─── */}
        <div className="shrink-0 lg:hidden -mx-6 px-6 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: activeId === s.id ? `${s.color}15` : 'rgba(255,255,255,0.03)',
                  color: activeId === s.id ? s.color : 'rgba(255,255,255,0.4)',
                  border: activeId === s.id ? `1px solid ${s.color}40` : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── CONTENT PANEL ─── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Section title bar */}
          <div
            className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-t-2xl border border-b-0"
            style={{
              background: `${active.color}10`,
              borderColor: `${active.color}30`,
            }}
          >
            <span className="text-2xl">{active.icon}</span>
            <h2 className="text-lg font-bold text-white">{active.label}</h2>

            {/* Prev / Next */}
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === activeId)
                  if (idx > 0) setActiveId(SECTIONS[idx - 1].id)
                }}
                disabled={SECTIONS.findIndex((s) => s.id === activeId) === 0}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                ← Préc.
              </button>
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === activeId)
                  if (idx < SECTIONS.length - 1) setActiveId(SECTIONS[idx + 1].id)
                }}
                disabled={SECTIONS.findIndex((s) => s.id === activeId) === SECTIONS.length - 1}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Suiv. →
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto rounded-b-2xl border border-t-0 p-5 space-y-4"
            style={{ borderColor: `${active.color}30`, background: '#161228' }}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
