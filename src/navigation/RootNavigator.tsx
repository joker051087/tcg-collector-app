import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { ChecklistStackParamList, HomeStackParamList, SearchStackParamList, TabParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import CardDetailScreen from "../screens/CardDetailScreen";
import ChecklistHomeScreen from "../screens/ChecklistHomeScreen";
import SetChecklistScreen from "../screens/SetChecklistScreen";
import WishlistScreen from "../screens/WishlistScreen";
import PortfolioScreen from "../screens/PortfolioScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { colors } from "../theme/colors";

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const ChecklistStack = createNativeStackNavigator<ChecklistStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary },
};

// Icônes de la barre d'onglets (voir styles.ts pour les couleurs actif/inactif
// dans Tab.Navigator plus bas). Une paire outline/plein par onglet, comme la
// convention iOS/Material.
const TAB_ICONS: Record<keyof TabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { active: "home", inactive: "home-outline" },
  SearchTab: { active: "search", inactive: "search-outline" },
  ChecklistTab: { active: "checkmark-done", inactive: "checkmark-done-outline" },
  PortfolioTab: { active: "albums", inactive: "albums-outline" },
  SettingsTab: { active: "settings", inactive: "settings-outline" },
};

function HomeStackNavigator() {
  const { t } = useTranslation();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: t("tabs.home") }}
      />
      <HomeStack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{ title: t("cardDetail.title") }}
      />
    </HomeStack.Navigator>
  );
}

function SearchStackNavigator() {
  const { t } = useTranslation();
  return (
    <SearchStack.Navigator screenOptions={screenOptions}>
      <SearchStack.Screen
        name="SearchHome"
        component={SearchScreen}
        options={{ title: t("search.title") }}
      />
      <SearchStack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{ title: t("cardDetail.title") }}
      />
    </SearchStack.Navigator>
  );
}

function ChecklistStackNavigator() {
  const { t } = useTranslation();
  return (
    <ChecklistStack.Navigator screenOptions={screenOptions}>
      <ChecklistStack.Screen
        name="ChecklistHome"
        component={ChecklistHomeScreen}
        options={{ title: t("checklist.title") }}
      />
      <ChecklistStack.Screen
        name="SetChecklist"
        component={SetChecklistScreen}
        options={{ title: t("checklist.title") }}
      />
      <ChecklistStack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{ title: t("cardDetail.title") }}
      />
      <ChecklistStack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: t("wishlist.title") }}
      />
    </ChecklistStack.Navigator>
  );
}

export default function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: t("tabs.home"), headerShown: false }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStackNavigator}
        options={{ title: t("tabs.search"), headerShown: false }}
      />
      <Tab.Screen
        name="ChecklistTab"
        component={ChecklistStackNavigator}
        options={{ title: t("tabs.checklist"), headerShown: false }}
      />
      <Tab.Screen
        name="PortfolioTab"
        component={PortfolioScreen}
        options={{ title: t("tabs.portfolio") }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: t("tabs.settings") }}
      />
    </Tab.Navigator>
  );
}
