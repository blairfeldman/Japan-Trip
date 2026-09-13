import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * The routes each navigator knows about, and what they expect to be handed.
 *
 * Worth having typed rather than reaching for `useNavigation<any>()`: the
 * whole surface is `navigate('SomeName', { someParam })` — two strings and an
 * object literal, none of which a compiler can check unless the shapes are
 * written down. A renamed route or a mistyped param key is otherwise a
 * runtime "not found" on a screen you might not open until Kyoto.
 */

export type CommonStackParamList = {
  EventDetail: { eventId: string };
  PinDetail: { pinId: string };
  /** eventId edits an existing entry; day starts a new one on that day. */
  EditEvent: { eventId?: string; day?: number };
};

export type NowStackParamList = CommonStackParamList & { Now: undefined };
export type MapStackParamList = CommonStackParamList & { Map: undefined };
export type DaysStackParamList = CommonStackParamList & { Days: undefined; Inbox: { sharedText?: string } | undefined };
export type MoneyStackParamList = { Money: undefined; Converter: undefined };
export type PhrasesStackParamList = { Phrases: undefined; PhrasePractice: { situationId: string } };

export type TabParamList = {
  NowTab: NavigatorScreenParams<NowStackParamList>;
  MapTab: NavigatorScreenParams<MapStackParamList>;
  DaysTab: NavigatorScreenParams<DaysStackParamList>;
  MoneyTab: NavigatorScreenParams<MoneyStackParamList>;
  PhrasesTab: NavigatorScreenParams<PhrasesStackParamList>;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  AddPin: { prefillName?: string; prefillAddress?: string; sourceUrl?: string; handle?: string; thumbnailUrl?: string } | undefined;
  ShareSheet: { url: string } | undefined;
};

/** What `useNavigation` hands back inside each stack. */
export type NowNav = NativeStackNavigationProp<NowStackParamList>;
export type MapNav = NativeStackNavigationProp<MapStackParamList>;
export type DaysNav = NativeStackNavigationProp<DaysStackParamList>;
export type MoneyNav = NativeStackNavigationProp<MoneyStackParamList>;
export type PhrasesNav = NativeStackNavigationProp<PhrasesStackParamList>;
export type RootNav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Event detail, pin detail and the edit sheet are mounted in more than one
 * stack, so they can only count on the routes every stack has.
 */
export type CommonNav = NativeStackNavigationProp<CommonStackParamList>;
