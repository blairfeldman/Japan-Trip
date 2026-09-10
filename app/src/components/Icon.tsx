import React from 'react';
import {
  BowlFood, Train, ShoppingBag, Bathtub, FirstAidKit, HandWaving, Coins, Leaf,
  AirplaneTakeoff, ForkKnife, TrainRegional, MapPin, Compass, MapTrifold, CalendarBlank,
  Wallet, Translate, NavigationArrow, Crosshair, CloudRain, CloudSlash, WifiSlash, WifiHigh,
  Plus, MagnifyingGlass, CaretRight, CheckCircle, CircleDashed, Check, SpeakerHigh, Play,
  Pause, ArrowLeft, X, DownloadSimple, EnvelopeSimple, EnvelopeSimpleOpen, MapPinLine,
  CurrencyJpy, PlayCircle, Clock, CalendarCheck, Sun, Cloud, CloudSun, CloudSnow,
} from 'phosphor-react-native';

const MAP = {
  BowlFood, Train, ShoppingBag, Bathtub, FirstAidKit, HandWaving, Coins, Leaf,
  AirplaneTakeoff, ForkKnife, TrainRegional, MapPin, Compass, MapTrifold, CalendarBlank,
  Wallet, Translate, NavigationArrow, Crosshair, CloudRain, CloudSlash, WifiSlash, WifiHigh,
  Plus, MagnifyingGlass, CaretRight, CheckCircle, CircleDashed, Check, SpeakerHigh, Play,
  Pause, ArrowLeft, X, DownloadSimple, EnvelopeSimple, EnvelopeSimpleOpen, MapPinLine,
  CurrencyJpy, PlayCircle, Clock, CalendarCheck, Sun, Cloud, CloudSun, CloudSnow,
};

export type IconName = keyof typeof MAP;

export function Icon({
  name,
  size = 20,
  color = '#201e1d',
  weight = 'duotone',
}: {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} weight={weight} />;
}
