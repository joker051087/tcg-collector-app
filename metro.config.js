const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// "server/" est un backend Node.js séparé (voir README.md, section "Backend"),
// pas du code de l'app mobile. Il vit dans le même dossier pour la simplicité
// du projet, mais Metro ne doit ni le surveiller ni essayer de le bundler —
// il utilise des modules ES natifs (import.meta) que Hermes ne supporte pas.
//
// Important : le chemin est ancré à NOTRE dossier server/ précisément (chemin
// absolu du projet), pas à n'importe quel dossier nommé "server" — une
// première version trop large bloquait par erreur un dossier interne d'Expo
// (node_modules/expo/.../@expo/cli/.../server), ce qui cassait le serveur de
// dev lui-même.
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const serverDir = path.join(__dirname, "server");
config.resolver.blockList = [new RegExp(`^${escapeRegExp(serverDir)}${escapeRegExp(path.sep)}.*`)];

module.exports = config;
