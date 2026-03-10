/**
 * Calcul de distance approximative entre une ville et Aubagne
 * Dictionnaire GPS des principales villes françaises + Haversine
 */

const AUBAGNE: [number, number] = [43.2927, 5.5674]

// [lat, lon] — principales villes françaises
const CITIES: Record<string, [number, number]> = {
  // PACA
  'aubagne': [43.2927, 5.5674],
  'marseille': [43.2965, 5.3698],
  'aix-en-provence': [43.5297, 5.4474],
  'aix en provence': [43.5297, 5.4474],
  'toulon': [43.1242, 5.928],
  'nice': [43.7102, 7.262],
  'avignon': [43.9493, 4.8055],
  'arles': [43.6768, 4.6278],
  'salon-de-provence': [43.6409, 5.0983],
  'salon de provence': [43.6409, 5.0983],
  'martigues': [43.4055, 5.0536],
  'la ciotat': [43.1748, 5.6046],
  'cassis': [43.2146, 5.5377],
  'plan de cuques': [43.3464, 5.4591],
  'gemenos': [43.2969, 5.6283],
  'roquevaire': [43.3498, 5.6042],
  'la penne-sur-huveaune': [43.2807, 5.5149],
  'la penne sur huveaune': [43.2807, 5.5149],
  'cuges-les-pins': [43.2742, 5.6883],
  'gardanne': [43.4547, 5.4693],
  'allauch': [43.3359, 5.4847],
  'gap': [44.5594, 6.0790],
  'draguignan': [43.5369, 6.4645],
  'frejus': [43.4332, 6.7370],
  'cannes': [43.5528, 7.0174],
  'antibes': [43.5808, 7.1239],
  'grasse': [43.6586, 6.9235],
  'hyeres': [43.1204, 6.1286],
  'la seyne-sur-mer': [43.1014, 5.8836],
  'orange': [44.1386, 4.8097],
  'carpentras': [44.0563, 5.0489],
  'cavaillon': [43.8379, 5.0384],
  'apt': [43.8781, 5.3961],
  'manosque': [43.8281, 5.7865],
  'digne-les-bains': [44.0925, 6.2357],
  'sisteron': [44.1980, 5.9426],
  'briancon': [44.8983, 6.6356],

  // Occitanie
  'montpellier': [43.6108, 3.8767],
  'nimes': [43.8367, 4.3601],
  'perpignan': [42.6887, 2.8948],
  'toulouse': [43.6047, 1.4442],
  'beziers': [43.3442, 3.2150],
  'narbonne': [43.1836, 3.0034],
  'carcassonne': [43.2128, 2.3514],
  'ales': [44.1244, 4.0830],
  'sete': [43.4073, 3.6958],

  // Auvergne-Rhône-Alpes
  'lyon': [45.764, 4.8357],
  'grenoble': [45.1885, 5.7245],
  'saint-etienne': [45.4397, 4.3872],
  'clermont-ferrand': [45.7772, 3.0870],
  'valence': [44.9334, 4.8924],
  'annecy': [45.8992, 6.1294],
  'chambery': [45.5641, 5.9178],
  'marat': [45.5233, 3.5344],

  // Île-de-France
  'paris': [48.8566, 2.3522],
  'versailles': [48.8014, 2.1301],
  'boulogne-billancourt': [48.8352, 2.2410],
  'saint-denis': [48.9362, 2.3574],
  'montreuil': [48.8635, 2.4485],
  'creteil': [48.7904, 2.4550],
  'nanterre': [48.8925, 2.2070],

  // Autres grandes villes
  'bordeaux': [44.8378, -0.5792],
  'nantes': [47.2184, -1.5536],
  'strasbourg': [48.5734, 7.7521],
  'lille': [50.6292, 3.0573],
  'rennes': [48.1173, -1.6778],
  'reims': [49.2583, 3.5170],
  'le havre': [49.4944, 0.1079],
  'dijon': [47.3220, 5.0415],
  'tours': [47.3941, 0.6848],
  'orleans': [47.9029, 1.9093],
  'metz': [49.1193, 6.1757],
  'rouen': [49.4432, 1.0999],
  'limoges': [45.8336, 1.2611],
  'poitiers': [46.5802, 0.3404],
  'pau': [43.2951, -0.3708],
  'bayonne': [43.4929, -1.4748],
  'la rochelle': [46.1603, -1.1511],
  'brest': [48.3904, -4.4861],
  'amiens': [49.8941, 2.2958],
  'besancon': [47.2378, 6.0241],
  'mulhouse': [47.7508, 7.3359],
  'ajaccio': [41.9193, 8.7387],
  'bastia': [42.6977, 9.4529],
}

/** Distance Haversine en km */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface CityDistance {
  km: number | null
  badge: 'green' | 'orange' | 'red' | 'unknown'
  label: string
}

/** Calcule la distance entre une ville et Aubagne */
export function getDistanceToAubagne(cityName: string | null): CityDistance {
  if (!cityName) return { km: null, badge: 'unknown', label: 'Ville non renseignée' }

  const normalized = cityName.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents

  // Cherche correspondance exacte ou partielle
  let coords: [number, number] | null = null

  if (CITIES[normalized]) {
    coords = CITIES[normalized]
  } else {
    // Recherche partielle
    for (const [key, val] of Object.entries(CITIES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        coords = val
        break
      }
    }
  }

  if (!coords) return { km: null, badge: 'unknown', label: cityName }

  const km = Math.round(haversine(coords[0], coords[1], AUBAGNE[0], AUBAGNE[1]))

  if (km <= 50) return { km, badge: 'green', label: `${km} km` }
  if (km <= 200) return { km, badge: 'orange', label: `${km} km` }
  return { km, badge: 'red', label: `${km} km` }
}

/** Couleurs CSS par badge */
export const DISTANCE_COLORS = {
  green: { bg: '#7ec850', text: '#fff' },
  orange: { bg: '#f59e0b', text: '#fff' },
  red: { bg: '#ef4444', text: '#fff' },
  unknown: { bg: '#6b7280', text: '#fff' },
}
