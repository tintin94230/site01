export default function handler(req, res) {
  // Autoriser l'appel depuis le navigateur
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Récupération du mot depuis l'URL
  const mot = req.query.mot;

  // Vérification simple
  if (!mot) {
    return res.status(400).json({
      erreur: "Paramètre 'mot' manquant"
    });
  }

  // Calcul de la longueur
  const longueur = mot.length;

  // Réponse JSON
  res.status(200).json({
    mot: mot,
    longueur: longueur
  });
}
