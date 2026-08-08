import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { SearchStackParamList, TabParamList } from "./types";
import SearchScreen from "../screens/SearchScreen";
import CardDetailScreen from "../screens/CardDetailScreen";
import PortfolioScreen from "../screens/PortfolioScreen";
import SettingsScreen from "../screens/SettingsScreen";

const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: "#111827" },
  headerTintColor: "#f9fafb",
  headerTitleStyle: { color: "#f9fafb" },
};

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

export default function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: { backgroundColor: "#111827" },
        tabBarActiveTintColor: "#34d399",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tab.Screen
        name="SearchTab"
        component={SearchStackNavigator}
        options={{ title: t("tabs.search"), headerShown: false }}
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
