'use client'

import { useState, Fragment } from 'react'
import { updateSessionConfig, updateSessionStatus, advanceSessionPhase } from '@/app/admin/config/actions'
import { SESSION_STATUSES, STATUS_CONFIG, getStatusIndex, getNextStatus, type SessionStatus } from '@/lib/phases'

interface SessionConfig {
  age_categories?: { name: string; min_age: number; max_age: number }[]
  registration_start?: string
  registration_end?: string
  semifinal_date?: string
  final_date?: string
  semifinal_location?: string
  final_location?: string
  max_video_duration_sec?: number
  max_video_size_mb?: number
  max_mp3_size_mb?: number
  max_photo_size_mb?: number
  max_votes_per_device?: number
  registration_fee?: number
  semifinalists_per_category?: number
  finalists_per_category?: number
  jury_weight_percent?: number
  public_weight_percent?: number
  jury_criteria?: { name: string; max_score: number }[]
  promo_video_url?: string
  performance_recommended_sec?: number
  vote_duration_sec?: number
  jury_online_voting_closed?: boolean
}

interface Props {
  session: { id: string; name: string; status: string; config: SessionConfig }
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#161228] border border-[#2a2545] rounded-2xl p-6">
      <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm mb-4 text-white/70 uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/40 text-xs block mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-[#1a1533] border border-[#2a2545] text-sm text-white placeholder-white/20 focus:border-[#e91e8c]/50 focus:outline-none'

export default function AdminConfig({ session }: Props) {
  const [config, setConfig] = useState<SessionConfig>(session.config || {})
  const [status, setStatus] = useState(session.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function updateField(key: keyof SessionConfig, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const result = await updateSessionConfig(session.id, config as Record<string, unknown>)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Configuration sauvegardée.' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    const result = await updateSessionStatus(session.id, newStatus)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setStatus(session.status)
    }
  }

  async function handleAdvancePhase() {
    const next = getNextStatus(status)
    if (!next) return
    if (!confirm(`Passer la session en phase « ${STATUS_CONFIG[next].label} » ?`)) return

    const result = await advanceSessionPhase(session.id)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result.newStatus) {
      setStatus(result.newStatus)
      setMessage({ type: 'success', text: `Phase avancée : ${STATUS_CONFIG[result.newStatus as SessionStatus].label}` })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  function updateCategory(idx: number, field: string, value: string | number) {
    const cats = [...(config.age_categories || [])]
    cats[idx] = { ...cats[idx], [field]: value }
    updateField('age_categories', cats)
  }

  function addCategory() {
    const cats = [...(config.age_categories || []), { name: '', min_age: 0, max_age: 99 }]
    updateField('age_categories', cats)
  }

  function removeCategory(idx: number) {
    const cats = (config.age_categories || []).filter((_, i) => i !== idx)
    updateField('age_categories', cats)
  }

  function updateCriterion(idx: number, field: string, value: string | number) {
    const criteria = [...(config.jury_criteria || [])]
    criteria[idx] = { ...criteria[idx], [field]: value }
    updateField('jury_criteria', criteria)
  }

  function addCriterion() {
    const criteria = [...(config.jury_criteria || []), { name: '', max_score: 10 }]
    updateField('jury_criteria', criteria)
  }

  function removeCriterion(idx: number) {
    const criteria = (config.jury_criteria || []).filter((_, i) => i !== idx)
    updateField('jury_criteria', criteria)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl">
            Configuration
          </h1>
          <p className="text-white/40 text-sm">{session.name}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {message && (
        <div className={`rounded-xl p-4 text-sm ${
          message.type === 'success'
            ? 'bg-[#7ec850]/10 border border-[#7ec850]/30 text-[#7ec850]'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Status stepper */}
      <Section title="Phase du concours">
        <div className="space-y-5">
          {/* Horizontal stepper */}
          <div className="flex items-center">
            {SESSION_STATUSES.map((statusValue, idx) => {
              const cfg = STATUS_CONFIG[statusValue]
              const currentIdx = getStatusIndex(status)
              const isCompleted = idx < currentIdx
              const isCurrent = idx === currentIdx
              const isFuture = idx > currentIdx

              return (
                <Fragment key={statusValue}>
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    <button
                      onClick={() => handleStatusChange(statusValue)}
                      title={cfg.description}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0 transition-all ${
                        isCompleted
                          ? 'bg-[#7ec850] text-white'
                          : isCurrent
                            ? 'ring-4 ring-offset-1 ring-offset-[#161228] text-white'
                            : 'bg-white/5 border border-white/10 text-white/20 hover:border-white/25'
                      }`}
                      style={isCurrent ? { background: cfg.color, '--tw-ring-color': `${cfg.color}40` } as React.CSSProperties : undefined}
                    >
                      {isCompleted ? '✓' : cfg.icon}
                    </button>
                    <span className={`text-[10px] text-center leading-tight max-w-[72px] ${
                      isCurrent ? 'text-white font-bold' : isFuture ? 'text-white/20' : 'text-white/50'
                    }`}>
                      {cfg.label}
                    </span>
                  </div>
                  {idx < SESSION_STATUSES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full shrink-0 ${
                      idx < currentIdx ? 'bg-[#7ec850]' : 'bg-white/10'
                    }`} />
                  )}
                </Fragment>
              )
            })}
          </div>

          {/* Current phase info + advance button */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CONFIG[status as SessionStatus]?.color }} />
                {STATUS_CONFIG[status as SessionStatus]?.label || status}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {STATUS_CONFIG[status as SessionStatus]?.description}
              </p>
            </div>
            {getNextStatus(status) && (
              <button
                onClick={handleAdvancePhase}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all whitespace-nowrap"
              >
                {STATUS_CONFIG[status as SessionStatus]?.nextLabel}
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Jury en ligne toggle */}
      <Section title="Jury en ligne">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">
              {config.jury_online_voting_closed
                ? 'Le vote du jury en ligne est fermé.'
                : 'Le vote du jury en ligne est ouvert.'}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              {config.jury_online_voting_closed
                ? 'Les jurés ne peuvent plus voter. Rouvrez pour permettre de nouvelles évaluations.'
                : 'Les jurés peuvent évaluer les candidats approuvés dès leur connexion.'}
            </p>
          </div>
          <button
            onClick={async () => {
              const newValue = !config.jury_online_voting_closed
              const newConfig = { ...config, jury_online_voting_closed: newValue }
              setConfig(newConfig)
              const result = await updateSessionConfig(session.id, newConfig as Record<string, unknown>)
              if (result.error) {
                setMessage({ type: 'error', text: result.error })
                setConfig(config)
              } else {
                setMessage({
                  type: 'success',
                  text: newValue ? 'Vote jury en ligne fermé.' : 'Vote jury en ligne rouvert.',
                })
                setTimeout(() => setMessage(null), 3000)
              }
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              config.jury_online_voting_closed
                ? 'bg-[#7ec850]/15 border border-[#7ec850]/30 text-[#7ec850] hover:bg-[#7ec850]/25'
                : 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
            }`}
          >
            {config.jury_online_voting_closed ? 'Rouvrir le vote' : 'Fermer le vote jury'}
          </button>
        </div>
      </Section>

      {/* Dates & Lieux */}
      <Section title="Dates et lieux">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Début inscriptions">
            <input
              type="date"
              value={config.registration_start || ''}
              onChange={(e) => updateField('registration_start', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Fin inscriptions">
            <input
              type="date"
              value={config.registration_end || ''}
              onChange={(e) => updateField('registration_end', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Date demi-finale">
            <input
              type="date"
              value={config.semifinal_date || ''}
              onChange={(e) => updateField('semifinal_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Date finale">
            <input
              type="date"
              value={config.final_date || ''}
              onChange={(e) => updateField('final_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Lieu demi-finale">
            <input
              type="text"
              value={config.semifinal_location || ''}
              onChange={(e) => updateField('semifinal_location', e.target.value)}
              placeholder="Espace Liberté, Aubagne"
              className={inputClass}
            />
          </Field>
          <Field label="Lieu finale">
            <input
              type="text"
              value={config.final_location || ''}
              onChange={(e) => updateField('final_location', e.target.value)}
              placeholder="Cours Foch, Aubagne"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Catégories d'âge */}
      <Section title="Catégories d'âge">
        <div className="space-y-3">
          {(config.age_categories || []).map((cat, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                value={cat.name}
                onChange={(e) => updateCategory(idx, 'name', e.target.value)}
                placeholder="Nom"
                className={`${inputClass} flex-1`}
              />
              <input
                type="number"
                value={cat.min_age}
                onChange={(e) => updateCategory(idx, 'min_age', parseInt(e.target.value) || 0)}
                className={`${inputClass} w-24`}
                placeholder="Min"
              />
              <span className="text-white/30 text-sm">—</span>
              <input
                type="number"
                value={cat.max_age}
                onChange={(e) => updateCategory(idx, 'max_age', parseInt(e.target.value) || 0)}
                className={`${inputClass} w-24`}
                placeholder="Max"
              />
              <button
                onClick={() => removeCategory(idx)}
                className="text-red-400/50 hover:text-red-400 text-sm px-2"
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={addCategory}
            className="text-[#e91e8c] text-xs hover:underline"
          >
            + Ajouter une catégorie
          </button>
        </div>
      </Section>

      {/* Limites */}
      <Section title="Limites et quotas">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Durée max vidéo (sec)">
            <input
              type="number"
              value={config.max_video_duration_sec || 180}
              onChange={(e) => updateField('max_video_duration_sec', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Taille max vidéo (MB)">
            <input
              type="number"
              value={config.max_video_size_mb || 100}
              onChange={(e) => updateField('max_video_size_mb', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Taille max MP3 (MB)">
            <input
              type="number"
              value={config.max_mp3_size_mb || 20}
              onChange={(e) => updateField('max_mp3_size_mb', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Taille max photo (MB)">
            <input
              type="number"
              value={config.max_photo_size_mb || 5}
              onChange={(e) => updateField('max_photo_size_mb', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Votes max par appareil">
            <input
              type="number"
              value={config.max_votes_per_device || 50}
              onChange={(e) => updateField('max_votes_per_device', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Frais inscription (EUR)">
            <input
              type="number"
              value={config.registration_fee || 0}
              onChange={(e) => updateField('registration_fee', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Sélection */}
      <Section title="Sélection des candidats">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Demi-finalistes par catégorie">
            <input
              type="number"
              value={config.semifinalists_per_category || 10}
              onChange={(e) => updateField('semifinalists_per_category', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Finalistes par catégorie">
            <input
              type="number"
              value={config.finalists_per_category || 5}
              onChange={(e) => updateField('finalists_per_category', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Poids jury (%)">
            <input
              type="number"
              value={config.jury_weight_percent || 60}
              onChange={(e) => updateField('jury_weight_percent', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              className={inputClass}
            />
          </Field>
          <Field label="Poids public (%)">
            <input
              type="number"
              value={config.public_weight_percent || 40}
              onChange={(e) => updateField('public_weight_percent', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Critères jury */}
      <Section title="Critères de notation du jury">
        <div className="space-y-3">
          {(config.jury_criteria || []).map((crit, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                value={crit.name}
                onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                placeholder="Nom du critère"
                className={`${inputClass} flex-1`}
              />
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs">/ </span>
                <input
                  type="number"
                  value={crit.max_score}
                  onChange={(e) => updateCriterion(idx, 'max_score', parseInt(e.target.value) || 0)}
                  className={`${inputClass} w-20`}
                  min={1}
                />
              </div>
              <button
                onClick={() => removeCriterion(idx)}
                className="text-red-400/50 hover:text-red-400 text-sm px-2"
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={addCriterion}
            className="text-[#e91e8c] text-xs hover:underline"
          >
            + Ajouter un critère
          </button>
        </div>
      </Section>

      {/* Timing */}
      <Section title="Timing des prestations">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Durée prestation conseillée (sec)">
            <input
              type="number"
              value={config.performance_recommended_sec || 180}
              onChange={(e) => updateField('performance_recommended_sec', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
          <Field label="Durée vote après prestation (sec)">
            <input
              type="number"
              value={config.vote_duration_sec || 60}
              onChange={(e) => updateField('vote_duration_sec', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-white/30 text-xs mt-2">
          Le chrono passe en orange a 80% du temps conseille puis en rouge quand depasse. Le timer de vote est un compte a rebours.
        </p>
      </Section>

      {/* Video promo */}
      <Section title="Video promotionnelle">
        <Field label="URL de la video (YouTube, Vimeo, ou MP4 direct)">
          <input
            type="url"
            value={config.promo_video_url || ''}
            onChange={(e) => updateField('promo_video_url', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... ou https://exemple.com/video.mp4"
            className={inputClass}
          />
        </Field>
        <p className="text-white/30 text-xs mt-2">
          Cette video sera affichee sur la page Live quand aucun evenement n&apos;est en cours.
        </p>
      </Section>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#e91e8c] to-[#c4157a] hover:shadow-lg hover:shadow-[#e91e8c]/30 transition-all disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </button>
      </div>
    </div>
  )
}
