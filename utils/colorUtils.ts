
import { ColorRGBA } from '../types';

export const rgbaToHex = (c: ColorRGBA): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}${c.a < 255 ? toHex(c.a) : ''}`;
};

export const hexToRgba = (hex: string): ColorRGBA => {
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map(char => char + char).join('');
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return { r, g, b, a: 255 };
};

export const getBrightness = (c: ColorRGBA): number => {
  return (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
};

export const getContrastColor = (c: ColorRGBA): string => {
  // If transparent, use black/dark gray so it shows on checkboard
  if (c.a < 128) return '#000000'; 
  return getBrightness(c) > 128 ? '#000000' : '#FFFFFF';
};

export const colorDistance = (c1: ColorRGBA, c2: ColorRGBA): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2) +
    Math.pow(c1.a - c2.a, 2)
  );
};

export const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
};

export const getHsbValues = (c: ColorRGBA) => {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  let s = max === 0 ? 0 : delta / max;
  let v = max;

  if (max !== min) {
      switch (max) {
          case r: h = (g - b) / delta + (g < b ? 6 : 0); break;
          case g: h = (b - r) / delta + 2; break;
          case b: h = (r - g) / delta + 4; break;
      }
      h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    b: Math.round(v * 100)
  };
};

export const rgbToHsb = (c: ColorRGBA): string => {
  const { h, s, b } = getHsbValues(c);
  return `${h}° ${s}% ${b}%`;
};
