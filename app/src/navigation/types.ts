export type CommonStackParamList = {
  EventDetail: { eventId: string };
  PinDetail: { pinId: string };
};

export type NowStackParamList = CommonStackParamList & { Now: undefined };
export type MapStackParamList = CommonStackParamList & { Map: undefined };
export type DaysStackParamList = CommonStackParamList & { Days: undefined; Inbox: { sharedText?: string } | undefined };
export type MoneyStackParamList = { Money: undefined; Converter: undefined };
export type PhrasesStackParamList = { Phrases: undefined; PhrasePractice: { situationId: string } };

export type TabParamList = {
  NowTab: undefined;
  MapTab: undefined;
  DaysTab: undefined;
  MoneyTab: undefined;
  PhrasesTab: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  AddPin: { prefillName?: string; prefillAddress?: string; sourceUrl?: string; handle?: string; thumbnailUrl?: string } | undefined;
  ShareSheet: { url: string } | undefined;
};
