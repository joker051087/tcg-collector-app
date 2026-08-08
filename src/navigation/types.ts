import { Game } from "../types";

export type SearchStackParamList = {
  SearchHome: undefined;
  CardDetail: { game: Game; cardId: string };
};

export type TabParamList = {
  SearchTab: undefined;
  PortfolioTab: undefined;
  SettingsTab: undefined;
};
