import { redirect } from 'next/navigation'

// La page Social (fil d'actualité générique) a été retirée du menu — son
// contenu utile (discussions, activité) vit maintenant dans Communautés.
// Cette redirection évite un lien mort pour quiconque a l'ancienne URL
// en favori.
export default function Page() {
  redirect('/groups')
}
