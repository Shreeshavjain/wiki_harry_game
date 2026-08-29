import type { HouseName } from "./models/participant";

export interface HouseDefinition {
  name: string;
  tag: string;
  c1: string; // Legacy surface
  c2: string; // Legacy accent
  surface: string;
  accent: string;
  text: string;
  highlight: string;
  crest: string;
  flavor: string;
}

/**
 * House definitions — colors, mottos, SVG crests, and flavor text.
 * Preserved from the original club member's design.
 */
export const HOUSES: Record<HouseName, HouseDefinition> = {
  gryffindor: {
    name: "Gryffindor",
    tag: "Where dwell the brave at heart",
    c1: "#2B0F10", 
    c2: "#E53935", 
    surface: "#2B0F10", // deep crimson surface
    accent: "#E53935", // bright red accent
    text: "#FFD54F", // warm ivory/gold text
    highlight: "#FFCA28", // gold highlight
    crest: `<circle cx="60" cy="60" r="56" fill="none" stroke="#d3a625" stroke-width="3"/>
      <path d="M60 30 C50 30 42 38 42 50 C42 62 52 68 52 78 L45 78 C45 85 52 90 60 90 C68 90 75 85 75 78 L68 78 C68 68 78 62 78 50 C78 38 70 30 60 30 Z" fill="#d3a625"/>
      <path d="M60 40 C55 40 51 44 51 50 C51 58 60 62 60 62 C60 62 69 58 69 50 C69 44 65 40 60 40 Z" fill="#740001"/>`,
    flavor: "The Hat senses courage...",
  },
  slytherin: {
    name: "Slytherin",
    tag: "Those of cunning and ambition",
    c1: "#0A1F13", 
    c2: "#2E7D32", 
    surface: "#0A1F13", // deep forest surface
    accent: "#2E7D32", // emerald accent
    text: "#E8F5E9", // bright emerald/ivory text
    highlight: "#A5D6A7", // soft green highlight
    crest: `<circle cx="60" cy="60" r="56" fill="none" stroke="#aaaaaa" stroke-width="3"/>
      <path d="M35 40 C45 55 45 65 35 82 C55 78 62 68 60 55 C68 68 70 80 60 90 C80 82 82 62 68 50 C78 48 84 40 82 32 C72 42 60 40 55 32 C52 42 40 40 35 40 Z" fill="#aaaaaa"/>`,
    flavor: "The Hat senses ambition...",
  },
  ravenclaw: {
    name: "Ravenclaw",
    tag: "Where those of wit and learning belong",
    c1: "#091024", 
    c2: "#1976D2", 
    surface: "#091024", // deep navy surface
    accent: "#1976D2", // strong royal blue / blue-cyan accent
    text: "#E3F2FD", // bright blue-white/silver text
    highlight: "#64B5F6", // light blue highlight
    crest: `<circle cx="60" cy="60" r="56" fill="none" stroke="#946b2d" stroke-width="3"/>
      <path d="M60 34 L74 58 L96 60 L78 74 L84 96 L60 84 L36 96 L42 74 L24 60 L46 58 Z" fill="#946b2d"/>`,
    flavor: "The Hat senses wisdom...",
  },
  hufflepuff: {
    name: "Hufflepuff",
    tag: "Where they are just and loyal",
    c1: "#211A0F", 
    c2: "#FBC02D", 
    surface: "#211A0F", // deep warm-black/brown surface
    accent: "#FBC02D", // rich gold accent
    text: "#FFF59D", // bright ivory/gold text
    highlight: "#FFF9C4", // pale gold highlight
    crest: `<circle cx="60" cy="60" r="56" fill="none" stroke="#ecb939" stroke-width="3"/>
      <ellipse cx="60" cy="60" rx="26" ry="20" fill="#ecb939"/>
      <path d="M40 60 C40 50 48 44 60 44 C72 44 80 50 80 60" fill="none" stroke="#372e29" stroke-width="3"/>
      <circle cx="50" cy="58" r="3" fill="#372e29"/><circle cx="70" cy="58" r="3" fill="#372e29"/>`,
    flavor: "The Hat senses loyalty...",
  },
};

/** Ordered list of house keys (consistent iteration order) */
export const HOUSE_ORDER: HouseName[] = [
  "gryffindor",
  "slytherin",
  "ravenclaw",
  "hufflepuff",
];

/**
 * Sorting Hat SVG markup — original club member artwork.
 * Used by the SortingHat component.
 */
export const SORTING_HAT_SVG = `
  <ellipse cx="100" cy="168" rx="78" ry="14" fill="#000" opacity="0.35"/>
  <path d="M40 160 C40 150 55 148 65 148 L135 148 C145 148 160 150 160 160 C160 168 150 170 140 170 L60 170 C50 170 40 168 40 160 Z" fill="#3b2a1c"/>
  <path d="M62 148 C60 100 70 60 92 34 C82 70 84 112 92 148 Z" fill="#4a3524"/>
  <path d="M92 34 C112 30 128 46 132 66 C120 96 118 122 138 148 L96 148 C86 112 86 70 92 34 Z" fill="#5a4229"/>
  <path d="M92 34 C97 26 110 24 118 30 C114 34 108 38 106 44 C100 42 95 38 92 34 Z" fill="#5a4229"/>
  <path d="M64 122 C90 112 130 116 158 132" stroke="#c9a227" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
  <circle cx="145" cy="128" r="6" fill="#c9a227"/>
  <path d="M88 92 C93 88 100 88 104 92" stroke="#1a140d" stroke-width="3" stroke-linecap="round"/>
  <path d="M84 104 Q96 112 110 103" stroke="#1a140d" stroke-width="3" stroke-linecap="round" fill="none"/>
`;

/** Theme color tokens */
export const THEME = {
  night1: "#05070D",
  night2: "#080B14",
  surface: "#0C1020",
  parchment: "#ffffff",
  parchmentDim: "#a0a5b5",
  gold: "#c9a227",
  goldBright: "#e8c968",
  goldMuted: "#8a7329",
  emerald: "#10b981",
  crimson: "#ef4444",
} as const;
