import { Game } from "../types";

// Logos officiels des jeux, pour la grille "Explorer un jeu" de l'écran
// d'Accueil. Ce sont des marques déposées appartenant à leurs éditeurs
// respectifs (Nintendo/Creatures/GAME FREAK, Wizards of the Coast, Konami,
// Bandai Namco, Disney, Riot Games, Toei, Legend Story Studios, Fantasy
// Flight/Lucasfilm, Square Enix...) — on ne les héberge pas dans l'app
// (aucun fichier copié dans le repo), on affiche juste une image distante
// via son URL, exactement comme les images de cartes déjà utilisées partout
// ailleurs dans l'app. Adapté à un usage personnel non publié ; à
// reconsidérer avant toute publication sur les stores.
//
// URLs récupérées le 08/08/2026 en lisant le src= réel des images affichées
// dans les infobox Wikipedia (article dédié au jeu quand il existe), donc
// vérifiées comme fonctionnelles au moment de l'écriture — pas de garantie
// de stabilité à très long terme (Wikipedia peut renommer/remplacer un
// fichier), mais wikimedia.org est un hébergeur stable en pratique.
//
// 3 jeux sans logo trouvé (aucune image exploitable sur leur page Wikipedia,
// et sites officiels non extractibles simplement) : Flesh and Blood, Union
// Arena, Gundam — ils gardent l'avatar coloré généré (voir HomeScreen.tsx).
export const GAME_LOGOS: Partial<Record<Game, string>> = {
  pokemon:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Pok%C3%A9mon_Trading_Card_Game_logo.svg/250px-Pok%C3%A9mon_Trading_Card_Game_logo.svg.png",
  magic:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Magic_the_Gathering_2017.svg/250px-Magic_the_Gathering_2017.svg.png",
  yugioh:
    "https://upload.wikimedia.org/wikipedia/en/thumb/0/0a/Yu-Gi-Oh%21_Trading_Card_Game_logo.png/250px-Yu-Gi-Oh%21_Trading_Card_Game_logo.png",
  onepiece:
    "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/One_Piece_Card_Game_logo.webp/250px-One_Piece_Card_Game_logo.webp.png",
  lorcana:
    "https://upload.wikimedia.org/wikipedia/en/thumb/0/08/Disney_Lorcana_Logo.png/250px-Disney_Lorcana_Logo.png",
  // Pas de logo dédié trouvé sur Wikipedia pour Riftbound (article très
  // récent) : image de la boîte du jeu à la place, pas un simple wordmark.
  riftbound:
    "https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/Riftbound_League_of_Legends_Trading_Card_Game_cover.png/250px-Riftbound_League_of_Legends_Trading_Card_Game_cover.png",
  dragonball: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/DBSlogo-01.png/250px-DBSlogo-01.png",
  digimon:
    "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Digimon_2025_official_logo.jpg/330px-Digimon_2025_official_logo.jpg",
  starwarsunlimited:
    "https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Star_Wars_Unlimited_logo.png/250px-Star_Wars_Unlimited_logo.png",
  // Pas de logo TCG dédié trouvé : photo de la boîte du jeu de cartes
  // classique (Final Fantasy CCG) à la place d'un wordmark.
  finalfantasy: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Final_Fantasy_CCG.jpg/250px-Final_Fantasy_CCG.jpg",
};
