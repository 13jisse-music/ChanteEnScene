'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createFaqEntry(sessionId: string, question: string, answer: string) {
  const supabase = createAdminClient()

  const { count } = await supabase
    .from('chatbot_faq')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  const { error } = await supabase.from('chatbot_faq').insert({
    session_id: sessionId,
    question,
    answer,
    sort_order: (count || 0) + 1,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/chatbot')
  return { success: true }
}

export async function updateFaqEntry(id: string, question: string, answer: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('chatbot_faq')
    .update({ question, answer })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/chatbot')
  return { success: true }
}

export async function toggleFaqEntry(id: string, isActive: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('chatbot_faq')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/chatbot')
  return { success: true }
}

export async function deleteFaqEntry(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('chatbot_faq').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/chatbot')
  return { success: true }
}

export async function seedDefaultFaqs(sessionId: string) {
  const supabase = createAdminClient()

  // Delete existing FAQs for this session before re-seeding
  await supabase
    .from('chatbot_faq')
    .delete()
    .eq('session_id', sessionId)

  const defaultFaqs = [
    {
      question: 'Comment s\'inscrire au concours ?',
      answer: 'Pour vous inscrire, rendez-vous sur la page "S\'inscrire" depuis le menu. Remplissez le formulaire avec vos informations personnelles et envoyez une vidéo de candidature (3 minutes max). L\'inscription est gratuite !',
    },
    {
      question: 'Quelles sont les catégories d\'âge ?',
      answer: 'Il y a 3 catégories :\n- Enfant : 6 à 12 ans\n- Ado : 13 à 17 ans\n- Adulte : 18 ans et plus\nVotre catégorie est déterminée automatiquement par votre date de naissance.',
    },
    {
      question: 'Quand ont lieu les événements ?',
      answer: 'Les inscriptions sont ouvertes de mars à mai 2026. La demi-finale aura lieu le 17 juin 2026 à l\'Espace Liberté d\'Aubagne, et la grande finale le 16 juillet 2026 au Cours Foch à Aubagne.',
    },
    {
      question: 'Comment voter pour un candidat ?',
      answer: 'Vous pouvez voter de deux façons :\n1. En ligne : rendez-vous sur la page du candidat et cliquez sur le bouton "J\'encourage"\n2. En live : lors des événements (demi-finale et finale), votez depuis votre smartphone via la page Live/Votes',
    },
    {
      question: 'Est-ce que l\'inscription est payante ?',
      answer: 'Non, l\'inscription au concours ChanteEnScène est entièrement gratuite !',
    },
    {
      question: 'Quel format de vidéo pour la candidature ?',
      answer: 'Le plus simple : filmez-vous directement avec votre téléphone ! Nous acceptons les formats MP4, MOV et WebM, d\'une durée de 3 minutes maximum et d\'un poids de 100 Mo max. Pas besoin de matériel pro, un smartphone suffit largement. Choisissez un endroit calme, avec un bon éclairage, et chantez avec le coeur !',
    },
    {
      question: 'Ma vidéo est trop lourde, comment faire ?',
      answer: 'Si votre vidéo dépasse 100 Mo, voici quelques astuces :\n- Filmez en qualité HD (1080p) plutôt qu\'en 4K, ça divise le poids par 3-4\n- Limitez-vous bien à 3 minutes\n- Sur iPhone : allez dans Réglages > Appareil photo > Formats et choisissez \"Haute efficacité\"\n- Sur Android : dans les paramètres de la caméra, réduisez la résolution à 1080p\n- Vous pouvez aussi compresser la vidéo avec une application gratuite comme \"Video Compress\" sur votre téléphone.',
    },
    {
      question: 'Ma vidéo ne s\'envoie pas ou le transfert échoue',
      answer: 'Pas de panique ! Vérifiez ces points :\n- Votre connexion internet est-elle stable ? Le Wi-Fi est préférable à la 4G pour les gros fichiers\n- La vidéo fait-elle moins de 100 Mo ? (vérifiez dans les propriétés du fichier)\n- Le format est-il bien MP4, MOV ou WebM ?\n- Essayez de fermer les autres applications et de relancer l\'envoi\nSi le problème persiste, n\'hésitez pas à nous écrire à contact@chantenscene.fr, on vous aidera !',
    },
    {
      question: 'Peut-on envoyer un lien YouTube ou une ancienne vidéo ?',
      answer: 'Nous préférons que vous nous envoyiez une vidéo récente, filmée spécialement pour votre candidature. L\'idée, c\'est de vous voir tel(le) que vous êtes aujourd\'hui ! Un simple enregistrement avec votre téléphone, dans votre salon ou votre jardin, c\'est parfait. Pas besoin de montage ou d\'effets spéciaux — on veut entendre votre voix, tout simplement.',
    },
    {
      question: 'Quels conseils pour bien filmer ma vidéo de candidature ?',
      answer: 'Voici nos petits conseils pour une super vidéo :\n- Filmez en format portrait ou paysage, les deux marchent\n- Placez-vous face à la lumière (près d\'une fenêtre par exemple), jamais à contre-jour\n- Choisissez un endroit calme, sans bruit de fond\n- Posez votre téléphone sur un support stable (ou demandez à quelqu\'un de vous filmer)\n- Chantez a cappella ou avec un accompagnement instrumental, comme vous préférez\n- Soyez vous-même, souriez et amusez-vous ! C\'est ça qui fait la différence.',
    },
    {
      question: 'Quel type de fichier audio est accepté pour le MP3 de demi-finale ?',
      answer: 'Si vous êtes sélectionné(e) pour la demi-finale, on vous demandera un fichier MP3 de votre accompagnement instrumental (la version sans voix de votre chanson). Formats acceptés : MP3 ou WAV. Vous pouvez trouver des instrumentales sur YouTube ou des sites spécialisés. L\'équipe technique vous accompagnera pour cette étape, pas d\'inquiétude !',
    },
    {
      question: 'Comment sont sélectionnés les demi-finalistes ?',
      answer: 'Un jury professionnel visionne toutes les vidéos de candidature et sélectionne les 10 meilleurs candidats par catégorie pour la demi-finale.',
    },
    {
      question: 'Comment fonctionne la notation ?',
      answer: 'Le jury note chaque candidat sur 4 critères (sur 10 chacun) :\n- Justesse vocale\n- Interprétation\n- Présence scénique\n- Originalité\nEn finale, le classement combine les notes du jury (60%) et les votes du public (40%).',
    },
    {
      question: 'Mon enfant peut-il participer ?',
      answer: 'Oui ! Les enfants de 6 à 12 ans peuvent participer dans la catégorie "Enfant", et les adolescents de 13 à 17 ans dans la catégorie "Ado". Une autorisation parentale signée par un représentant légal est obligatoire pour tout candidat mineur (moins de 18 ans).',
    },
    {
      question: 'Qu\'est-ce que l\'autorisation parentale et qui est concerné ?',
      answer: 'L\'autorisation parentale est un document obligatoire pour tous les candidats mineurs (moins de 18 ans), que ce soit en catégorie Enfant (6-12 ans) ou Ado (13-17 ans). Ce document, signé par un parent ou représentant légal, autorise le mineur à participer au concours ChanteEnScène, à être filmé et photographié lors des événements.',
    },
    {
      question: 'Quel document fournir pour l\'autorisation parentale ?',
      answer: 'Vous devez fournir une autorisation parentale signée par un parent ou représentant légal. Le document peut être :\n- Un PDF du formulaire d\'autorisation rempli et signé\n- Une photo (JPG, PNG) du document signé manuscritement\nL\'important est que la signature du représentant légal soit bien lisible. Vous pouvez scanner le document ou simplement le prendre en photo avec votre téléphone.',
    },
    {
      question: 'Comment transmettre l\'autorisation parentale ?',
      answer: 'L\'autorisation parentale se transmet directement lors de l\'inscription en ligne. Quand vous remplissez le formulaire d\'inscription pour un mineur, un champ dédié "Autorisation parentale" apparaît automatiquement. Il vous suffit de cliquer dessus pour déposer votre fichier (PDF ou photo du document signé). Sans ce document, l\'inscription ne pourra pas être validée.',
    },
    {
      question: 'Où se déroule le concours ?',
      answer: 'Le concours se déroule à Aubagne (13400) :\n- Demi-finale : Espace Liberté\n- Grande finale : Cours Foch (en plein air)\nLes candidats chantent en live, accompagnés par des musiciens professionnels.',
    },
    {
      question: 'Peut-on chanter en playback ?',
      answer: 'Non ! ChanteEnScène est un concours 100% live. En demi-finale, vous chantez sur bande MP3 (accompagnement instrumental). En finale, vous êtes accompagné par des musiciens professionnels sur scène.',
    },
    {
      question: 'Comment modifier mon profil après inscription ?',
      answer: 'Rendez-vous sur la page "Mon profil" accessible depuis le lien envoyé par email après votre inscription. Vous pourrez modifier votre photo, bio, nom de scène et couleur de profil.',
    },
    {
      question: 'Y a-t-il des prix à gagner ?',
      answer: 'Oui ! Un gagnant est désigné dans chaque catégorie (Enfant, Ado, Adulte). Les prix sont annoncés avant chaque édition. Le plus important : une expérience unique sur scène devant un vrai public !',
    },
    {
      question: 'Comment contacter l\'organisation ?',
      answer: 'Vous pouvez nous contacter par email à contact@chantenscene.fr ou via nos réseaux sociaux. Nous répondons généralement sous 48h.',
    },
  ]

  const rows = defaultFaqs.map((faq, idx) => ({
    session_id: sessionId,
    question: faq.question,
    answer: faq.answer,
    sort_order: idx + 1,
    is_active: true,
  }))

  const { error } = await supabase.from('chatbot_faq').insert(rows)

  if (error) return { error: error.message }

  revalidatePath('/admin/chatbot')
  return { success: true, count: rows.length }
}

export async function reorderFaq(sessionId: string, orderedIds: string[]) {
  const supabase = createAdminClient()

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from('chatbot_faq')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])
  }

  revalidatePath('/admin/chatbot')
  return { success: true }
}
