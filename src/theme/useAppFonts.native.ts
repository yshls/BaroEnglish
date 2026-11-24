import { useFonts, type FontFamilyDefinition } from 'expo-font';
import { FONT_FAMILY_NAME } from './tokens';

const NATIVE_FONT_DEFINITIONS: FontFamilyDefinition[] = [
  {
    fontFamily: FONT_FAMILY_NAME,
    fontDefinitions: [
      {
        path: require('../../assets/fonts/SpoqaHanSansNeo-Thin.ttf'),
        weight: 100,
        style: 'normal',
      },
      {
        path: require('../../assets/fonts/SpoqaHanSansNeo-Light.ttf'),
        weight: 300,
        style: 'normal',
      },
      {
        path: require('../../assets/fonts/SpoqaHanSansNeo-Regular.ttf'),
        weight: 400,
        style: 'normal',
      },
      {
        path: require('../../assets/fonts/SpoqaHanSansNeo-Medium.ttf'),
        weight: 500,
        style: 'normal',
      },
      {
        path: require('../../assets/fonts/SpoqaHanSansNeo-Bold.ttf'),
        weight: 700,
        style: 'normal',
      },
    ],
  },
];

export function useAppFonts(): [boolean, Error | null] {
  return useFonts(NATIVE_FONT_DEFINITIONS);
}
