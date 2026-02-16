'use client'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  stage_name: string | null
  category: string
  song_title: string
  song_artist: string
  mp3_url: string | null
  position: number
}

interface Props {
  sessionName: string
  eventType: string
  eventDate?: string
  eventLocation?: string
  candidates: Candidate[]
}

export default function RouteSheet({ sessionName, eventType, eventDate, eventLocation, candidates }: Props) {
  return (
    <div className="route-sheet bg-white text-black p-8 min-h-screen print:p-4">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .route-sheet { padding: 1cm !important; }
          .route-sheet table { font-size: 11px; }
          .route-sheet h1 { font-size: 18px; }
          .route-sheet h2 { font-size: 14px; }
        }
        .route-sheet table {
          width: 100%;
          border-collapse: collapse;
        }
        .route-sheet th, .route-sheet td {
          border: 1px solid #ccc;
          padding: 8px 10px;
          text-align: left;
        }
        .route-sheet th {
          background: #f0f0f0;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
        }
        .route-sheet tr:nth-child(even) {
          background: #fafafa;
        }
        .route-sheet .category-row {
          background: #e8e8e8 !important;
          font-weight: bold;
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">ChanteEnScene — Feuille de Régie</h1>
        <h2 className="text-lg text-gray-600">{eventType}</h2>
        <p className="text-sm text-gray-500">{sessionName}</p>
        {eventDate && <p className="text-sm text-gray-500">Date : {eventDate}</p>}
        {eventLocation && <p className="text-sm text-gray-500">Lieu : {eventLocation}</p>}
        <p className="text-sm text-gray-400 mt-1">{candidates.length} candidat{candidates.length > 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>#</th>
            <th>Nom de scène</th>
            <th>Prénom Nom</th>
            <th>Chanson</th>
            <th>Artiste</th>
            <th>Catégorie</th>
            <th style={{ width: '50px' }}>MP3</th>
            <th style={{ width: '120px' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, idx) => {
            const prevCategory = idx > 0 ? candidates[idx - 1].category : null
            const showCategoryHeader = c.category !== prevCategory

            return (
              <tr key={c.id}>
                {showCategoryHeader && idx > 0 ? null : null}
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ fontWeight: 'bold' }}>{c.stage_name || '—'}</td>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.song_title}</td>
                <td>{c.song_artist}</td>
                <td>{c.category}</td>
                <td style={{ textAlign: 'center' }}>{c.mp3_url ? '✓' : '✗'}</td>
                <td></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-400">
        <p>ChanteEnScene — {sessionName} — {eventType}</p>
        <p>Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  )
}
