import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, FONT_SERIF_REGULAR } from '../theme';
import { Icon, IconName } from '../components/Icon';

import NowScreen from '../screens/NowScreen';
import MapScreen from '../screens/MapScreen';
import DaysScreen from '../screens/DaysScreen';
import MoneyScreen from '../screens/MoneyScreen';
import PhrasesScreen from '../screens/PhrasesScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import PinDetailScreen from '../screens/PinDetailScreen';
import InboxScreen from '../screens/InboxScreen';
import ConverterScreen from '../screens/ConverterScreen';
import PhrasePracticeScreen from '../screens/PhrasePracticeScreen';
import AddPinScreen from '../screens/AddPinScreen';
import ShareSheetScreen from '../screens/ShareSheetScreen';

const commonStackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: COLORS.bg },
};

const NowStack = createNativeStackNavigator();
function NowStackNavigator() {
  return (
    <NowStack.Navigator screenOptions={commonStackOptions}>
      <NowStack.Screen name="Now" component={NowScreen} />
      <NowStack.Screen name="EventDetail" component={EventDetailScreen} />
      <NowStack.Screen name="PinDetail" component={PinDetailScreen} />
    </NowStack.Navigator>
  );
}

const MapStack = createNativeStackNavigator();
function MapStackNavigator() {
  return (
    <MapStack.Navigator screenOptions={commonStackOptions}>
      <MapStack.Screen name="Map" component={MapScreen} />
      <MapStack.Screen name="PinDetail" component={PinDetailScreen} />
      <MapStack.Screen name="EventDetail" component={EventDetailScreen} />
    </MapStack.Navigator>
  );
}

const DaysStack = createNativeStackNavigator();
function DaysStackNavigator() {
  return (
    <DaysStack.Navigator screenOptions={commonStackOptions}>
      <DaysStack.Screen name="Days" component={DaysScreen} />
      <DaysStack.Screen name="EventDetail" component={EventDetailScreen} />
      <DaysStack.Screen name="Inbox" component={InboxScreen} />
    </DaysStack.Navigator>
  );
}

const MoneyStack = createNativeStackNavigator();
function MoneyStackNavigator() {
  return (
    <MoneyStack.Navigator screenOptions={commonStackOptions}>
      <MoneyStack.Screen name="Money" component={MoneyScreen} />
      <MoneyStack.Screen name="Converter" component={ConverterScreen} />
    </MoneyStack.Navigator>
  );
}

const PhrasesStack = createNativeStackNavigator();
function PhrasesStackNavigator() {
  return (
    <PhrasesStack.Navigator screenOptions={commonStackOptions}>
      <PhrasesStack.Screen name="Phrases" component={PhrasesScreen} />
      <PhrasesStack.Screen name="PhrasePractice" component={PhrasePracticeScreen} />
    </PhrasesStack.Navigator>
  );
}

const TAB_ICON: Record<string, IconName> = {
  NowTab: 'Compass',
  MapTab: 'MapTrifold',
  DaysTab: 'CalendarBlank',
  MoneyTab: 'Wallet',
  PhrasesTab: 'Translate',
};

const Tab = createBottomTabNavigator();
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.link,
        tabBarInactiveTintColor: COLORS.label,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: COLORS.hairline, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11.5, fontFamily: FONT_SERIF_REGULAR },
        tabBarIcon: ({ color }: { color: string }) => <Icon name={TAB_ICON[route.name]} size={23} color={color} />,
      })}
    >
      <Tab.Screen name="NowTab" component={NowStackNavigator} options={{ title: 'Now' }} />
      <Tab.Screen name="MapTab" component={MapStackNavigator} options={{ title: 'Map' }} />
      <Tab.Screen name="DaysTab" component={DaysStackNavigator} options={{ title: 'Days' }} />
      <Tab.Screen name="MoneyTab" component={MoneyStackNavigator} options={{ title: 'Money' }} />
      <Tab.Screen name="PhrasesTab" component={PhrasesStackNavigator} options={{ title: 'Phrases' }} />
    </Tab.Navigator>
  );
}

const RootStack = createNativeStackNavigator();
export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={Tabs} />
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen name="AddPin" component={AddPinScreen} />
        <RootStack.Screen name="ShareSheet" component={ShareSheetScreen} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
}
