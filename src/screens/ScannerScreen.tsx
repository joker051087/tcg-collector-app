import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SearchStackParamList } from "../navigation/types";
import { Game } from "../types";
import { GAME_LABELS, SCRYDEX_VISION_GAMES, SUPPORTED_GAMES } from "../constants/games";
import { identifyCardByImage, extractTextFromImage } from "../api/scanner";
import SelectableChips from "../components/SelectableChips";
import { colors, radius } from "../theme/colors";

type Props = NativeStackScreenProps<SearchStackParamList, "Scanner">;

// Écran caméra du scanner : deux méthodes de reconnaissance selon le jeu
// choisi (voir SCRYDEX_VISION_GAMES) — reconnaissance visuelle complète pour
// les 6 jeux couverts par Scrydex Vision (ouvre directement la fiche carte),
// lecture de texte pour les 7 autres (préremplit la recherche classique avec
// le texte lu). Voir GUIDE_SCANNER.md pour la configuration des clés
// serveur ; sans elles, le scanner affiche un message clair plutôt que de
// planter (voir handleCapture, catch bloc "501").
export default function ScannerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [game, setGame] = useState<Game>(route.params?.initialGame ?? "pokemon");
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const usesVision = Boolean(SCRYDEX_VISION_GAMES[game]);

  async function handleCapture() {
    if (!cameraRef.current || isProcessing) return;
    setError(null);
    setIsProcessing(true);
    try {
      // Qualité 0.6 : OCR.space (compte gratuit) refuse les fichiers de plus
      // de 1024 Ko — une qualité plus élevée (testé à 0.9) fait dépasser
      // cette limite sur beaucoup de téléphones et fait échouer le scan
      // avec une erreur générique ("Erreur du service OCR"), donc on reste
      // sur 0.6 malgré une légère perte de netteté.
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error(t("scanner.errorCapture"));

      if (usesVision) {
        try {
          const result = await identifyCardByImage(photo.uri, game);
          if (result) {
            navigation.replace("CardDetail", {
              game,
              cardId: result.card.id,
              presetCard: result.card,
            });
            return;
          }
          // Aucun match trouvé — on retente avec la lecture de texte
          // ci-dessous plutôt que de s'arrêter là.
        } catch (visionErr) {
          // Scrydex non configuré côté serveur (voir GUIDE_SCANNER.md,
          // optionnel) ou service indisponible — on retente avec la lecture
          // de texte plutôt que de bloquer l'utilisateur sur une erreur.
          console.warn("Scan visuel indisponible, repli sur la lecture de texte:", visionErr);
        }
      }

      const text = await extractTextFromImage(photo.uri);
      if (!text) {
        setError(t("scanner.noText"));
        return;
      }
      navigation.replace("SearchHome", { initialGame: game, initialQuery: text });
    } catch (err: any) {
      console.error("Erreur scanner:", err);
      setError(err?.message ?? t("scanner.errorGeneric"));
    } finally {
      setIsProcessing(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>{t("scanner.permissionTitle")}</Text>
        <Text style={styles.permissionSubtitle}>{t("scanner.permissionSubtitle")}</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t("scanner.permissionButton")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gameSelector}>
        <SelectableChips
          options={SUPPORTED_GAMES}
          value={game}
          onChange={(g) => {
            setGame(g);
            setError(null);
          }}
          getLabel={(g) => GAME_LABELS[g]}
        />
      </View>

      <Text style={styles.modeHint}>
        {usesVision ? t("scanner.modeVisionHint") : t("scanner.modeOcrHint")}
      </Text>

      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View pointerEvents="none" style={styles.frameOverlay} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
        onPress={handleCapture}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={colors.accentOn} />
        ) : (
          <View style={styles.captureButtonInner} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  permissionSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    color: colors.accentOn,
    fontWeight: "500",
    fontSize: 14,
  },
  gameSelector: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  modeHint: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 24,
  },
  cameraWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  camera: {
    flex: 1,
  },
  // Cadre aux proportions d'une carte standard (63 x 88 mm, ratio ~0.716)
  // plutôt qu'un simple rectangle — aide à bien cadrer la carte entière.
  frameOverlay: {
    position: "absolute",
    top: "4%",
    bottom: "4%",
    aspectRatio: 0.716,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.md,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 8,
  },
  captureButton: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.accentOn,
  },
});
