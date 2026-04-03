import { useThemeContext } from '@/contexts/ThemeContext';

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const zincColors = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
};

export const appleBlue = "#007AFF";
export const appleRed = "#FF3B30";

export const borderColor = "#A1A1AA80";
export const appleGreen = "#34C759";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const AppColors = {
  light: {
    // ── Backgrounds ──────────────────────────────────────────────────────────
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#EEF0F5',
    // ── Cards / legacy ───────────────────────────────────────────────────────
    card: '#FFFFFF',
    headerBackground: '#F7F8FA',
    // ── Text ─────────────────────────────────────────────────────────────────
    text: '#111318',
    textSecondary: '#5A6070',
    textTertiary: '#9BA3B5',
    subtext: '#5A6070',
    placeholder: '#9BA3B5',
    // ── Brand ─────────────────────────────────────────────────────────────────
    primary: '#007AFF',
    primaryMuted: 'rgba(0,122,255,0.10)',
    tint: '#007AFF',
    accent: '#34C759',
    warning: '#F59E0B',
    // ── Danger ───────────────────────────────────────────────────────────────
    danger: '#FF3B30',
    dangerMuted: 'rgba(255,59,48,0.10)',
    destructive: '#FF3B30',
    // ── Borders / dividers ───────────────────────────────────────────────────
    border: 'rgba(0,0,0,0.07)',
    divider: 'rgba(0,0,0,0.04)',
    separator: 'rgba(0,0,0,0.07)',
    // ── Chips ────────────────────────────────────────────────────────────────
    chipBackground: '#E8EAEF',
    chipSelected: '#007AFF',
    chipSelectedText: '#FFFFFF',
    chipText: '#3C3C43',
    // ── Inputs ───────────────────────────────────────────────────────────────
    inputBg: '#FFFFFF',
    // ── Tab bar ──────────────────────────────────────────────────────────────
    tabBar: '#FFFFFF',
    tabBarBorder: 'rgba(0,0,0,0.07)',
    // ── Icons ────────────────────────────────────────────────────────────────
    icon: '#3C3C43',
  },
  dark: {
    // ── Backgrounds ──────────────────────────────────────────────────────────
    background: '#0F1117',
    surface: '#1C1E26',
    surfaceSecondary: '#252830',
    // ── Cards / legacy ───────────────────────────────────────────────────────
    card: '#1C1E26',
    headerBackground: '#0F1117',
    // ── Text ─────────────────────────────────────────────────────────────────
    text: '#F0F2F7',
    textSecondary: '#8B90A0',
    textTertiary: '#555C70',
    subtext: '#8B90A0',
    placeholder: '#555C70',
    // ── Brand ─────────────────────────────────────────────────────────────────
    primary: '#4A9EFF',
    primaryMuted: 'rgba(74,158,255,0.12)',
    tint: '#4A9EFF',
    accent: '#30D158',
    warning: '#FFD60A',
    // ── Danger ───────────────────────────────────────────────────────────────
    danger: '#FF453A',
    dangerMuted: 'rgba(255,69,58,0.12)',
    destructive: '#FF453A',
    // ── Borders / dividers ───────────────────────────────────────────────────
    border: 'rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.05)',
    separator: 'rgba(255,255,255,0.08)',
    // ── Chips ────────────────────────────────────────────────────────────────
    chipBackground: '#252830',
    chipSelected: '#4A9EFF',
    chipSelectedText: '#FFFFFF',
    chipText: '#C8C8D0',
    // ── Inputs ───────────────────────────────────────────────────────────────
    inputBg: '#252830',
    // ── Tab bar ──────────────────────────────────────────────────────────────
    tabBar: '#1C1E26',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    // ── Icons ────────────────────────────────────────────────────────────────
    icon: '#C8C8D0',
  },
};

export type AppColorPalette = typeof AppColors.light;

export function useColors(): AppColorPalette {
  const { colorScheme } = useThemeContext();
  return AppColors[colorScheme];
}

export const backgroundColors = [
  "#fef2f2",
  "#fee2e2",
  "#fecaca",
  "#fca5a5",
  "#f87171",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
  "#991b1b",
  "#7f1d1d",

  "#fff7ed",
  "#ffedd5",
  "#fed7aa",
  "#fdba74",
  "#fb923c",
  "#f97316",
  "#ea580c",
  "#c2410c",
  "#9a3412",
  "#7c2d12",

  "#fffbeb",
  "#fef3c7",
  "#fde68a",
  "#fcd34d",
  "#fbbf24",
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#92400e",
  "#78350f",

  "#fefce8",
  "#fef9c3",
  "#fef08a",
  "#fde047",
  "#facc15",
  "#eab308",
  "#ca8a04",
  "#a16207",
  "#854d0e",
  "#713f12",

  "#f7fee7",
  "#ecfccb",
  "#d9f99d",
  "#bef264",
  "#a3e635",
  "#84cc16",
  "#65a30d",
  "#4d7c0f",
  "#3f6212",
  "#365314",

  "#f0fdf4",
  "#dcfce7",
  "#bbf7d0",
  "#86efac",
  "#4ade80",
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#166534",
  "#14532d",

  "#ecfdf5",
  "#d1fae5",
  "#a7f3d0",
  "#6ee7b7",
  "#34d399",
  "#10b981",
  "#059669",
  "#047857",
  "#065f46",
  "#064e3b",

  "#f0fdfa",
  "#ccfbf1",
  "#99f6e4",
  "#5eead4",
  "#2dd4bf",
  "#14b8a6",
  "#0d9488",
  "#0f766e",
  "#115e59",
  "#134e4a",

  "#f0f9ff",
  "#e0f2fe",
  "#bae6fd",
  "#7dd3fc",
  "#38bdf8",
  "#0ea5e9",
  "#0284c7",
  "#0369a1",
  "#075985",
  "#0c4a6e",

  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",

  "#eef2ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#312e81",

  "#f5f3ff",
  "#ede9fe",
  "#ddd6fe",
  "#c4b5fd",
  "#a78bfa",
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#5b21b6",
  "#4c1d95",

  "#faf5ff",
  "#f3e8ff",
  "#e9d5ff",
  "#d8b4fe",
  "#c084fc",
  "#a855f7",
  "#9333ea",
  "#7e22ce",
  "#6b21a8",
  "#581c87",

  "#fdf4ff",
  "#fae8ff",
  "#f5d0fe",
  "#f0abfc",
  "#e879f9",
  "#d946ef",
  "#c026d3",
  "#a21caf",
  "#86198f",
  "#701a75",

  "#fdf2f8",
  "#fce7f3",
  "#fbcfe8",
  "#f9a8d4",
  "#f472b6",
  "#ec4899",
  "#db2777",
  "#be185d",
  "#9d174d",
  "#831843",

  "#fff1f2",
  "#ffe4e6",
  "#fecdd3",
  "#fda4af",
  "#fb7185",
  "#f43f5e",
  "#e11d48",
  "#be123c",
  "#9f1239",
  "#881337",
];

export const emojies = [
  "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
  "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑",
  "🥦", "🥬", "🥒", "🌶", "🫑", "🌽", "🥕", "🥔", "🧄", "🧅",
  "🍄", "🍞", "🥖", "🥨", "🥐", "🥯", "🧀", "🥚", "🍳", "🥞",
  "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪",
  "🌮", "🌯", "🫔", "🥙", "🧆", "🍜", "🍝", "🍣", "🍤", "🍙",
  "🍚", "🍛", "🍲", "🥘", "🥗", "🍿", "🧈", "🥫", "🍱", "🥮",
  "🍠", "🍥", "🥟", "🥠", "🥡", "🍦", "🍧", "🍨", "🍩", "🍪",
  "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍯", "🥜", "🌰",
  "🥛", "🧃", "🧉", "🥤", "🍶", "🍵", "🍺", "🍻", "🥂", "🍷",
  "🍸", "🍹", "🥃", "🍾", "☕️", "🫖", "🥄", "🍴", "🍽", "🥢",
  "🧂", "🛒", "🛍️", "🧺", "💳", "💸", "💵", "💰", "💲", "🧾",
  "🔖", "🏪", "🏬", "🏦", "🏧", "📦", "📮", "🏷️", "✅", "📋",
  "📜", "✏️", "📝", "🔍", "📆", "⏰", "📱", "💻", "🌐", "🔗",
  "🔒", "🔑", "🗃️", "🗂️", "🔄", "💡", "⭐️", "📌", "📍", "📊",
  "💯", "🎉", "🎊", "🎁", "🏆", "⚖️", "🏠", "🚗", "🏃‍♂️", "🏃‍♀️",
  "🚶‍♂️", "🚶‍♀️", "👕", "👖", "👗", "👔", "🩳", "👠", "👟", "🧥",
  "🧤", "🧣", "🧦", "🎒", "👜", "👛", "👓", "🕶️", "👒", "🪣",
  "🪑", "🛋️", "🚪", "🪟", "🏺", "🖼️", "📺", "📻", "🔌", "🧴",
  "🪥", "🧹", "🧽", "🗑️", "🪒", "💊", "💉", "🩹", "❤️", "💔",
  "💘", "💙", "💚", "💛", "💜",
];
