import {
  Home,
  Search,
  Plus,
  Languages,
  Sun,
  Moon,
  LayoutDashboard,
  Github,
  Sparkles,
  Grid3X3,
  LayoutGrid,
  StretchHorizontal,
  Eye,
  Lightbulb,
} from "lucide-react";
import { TFunction } from "i18next";
import type { BookmarkIconTier, BookmarkLayout } from "../lib/bookmarkPresentation";
import { BOOKMARK_ICON_TIERS } from "../lib/bookmarkPresentation";

export interface DockItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  IconComponent: React.FC<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  subItems?: DockItem[];
  isActive?: boolean;
}

// 视图模式配置
const VIEW_MODES = [
  { id: 'view-compact', key: 'compact' as const, icon: Grid3X3, titleKey: 'bookmark.view_compact' },
  { id: 'view-standard', key: 'standard' as const, icon: LayoutGrid, titleKey: 'bookmark.view_standard' },
  { id: 'view-comfortable', key: 'comfortable' as const, icon: StretchHorizontal, titleKey: 'bookmark.view_comfortable' },
];

export interface BookmarkViewMenuOptions {
  layout: BookmarkLayout
  tier: BookmarkIconTier
  /** 极简模式只调图标大小，不在这里切回详细卡片。 */
  hideLayoutToggle?: boolean
  onLayoutChange: (layout: BookmarkLayout) => void
  onTierChange: (tier: BookmarkIconTier) => void
}

const ICON_TIER_META: Record<BookmarkIconTier, { icon: typeof Grid3X3; titleKey: string }> = {
  mini: { icon: Grid3X3, titleKey: 'bookmark.icon_tier_mini' },
  medium: { icon: LayoutGrid, titleKey: 'bookmark.icon_tier_medium' },
  large: { icon: StretchHorizontal, titleKey: 'bookmark.icon_tier_large' },
}

// 创建视图子菜单
const createViewSubmenu = (
  t: TFunction,
  onViewModeChange?: (mode: 'compact' | 'standard' | 'comfortable') => void,
  currentViewMode?: 'compact' | 'standard' | 'comfortable',
  presentation?: BookmarkViewMenuOptions,
): DockItem[] => {
  const cardModes = VIEW_MODES.map((mode) => ({
    id: mode.id,
    title: t(mode.titleKey),
    icon: <mode.icon className="w-4 h-4" />,
    IconComponent: mode.icon,
    onClick: () => onViewModeChange?.(mode.key),
    isActive: currentViewMode === mode.key,
  }))

  if (!presentation) return cardModes

  const layout = presentation.layout
  const layoutItems: DockItem[] = presentation.hideLayoutToggle ? [] : [
    {
      id: 'layout-icons',
      title: t('bookmark.layout_icons'),
      icon: <Grid3X3 className="w-4 h-4" />,
      IconComponent: Grid3X3,
      onClick: () => presentation.onLayoutChange('icons'),
      isActive: layout === 'icons',
    },
    {
      id: 'layout-cards',
      title: t('bookmark.layout_cards'),
      icon: <LayoutGrid className="w-4 h-4" />,
      IconComponent: LayoutGrid,
      onClick: () => presentation.onLayoutChange('cards'),
      isActive: layout === 'cards',
    },
  ]

  if (layout === 'cards' && !presentation.hideLayoutToggle) {
    return layoutItems.concat(cardModes)
  }

  const tierItems = BOOKMARK_ICON_TIERS.map((tier) => {
    const meta = ICON_TIER_META[tier]
    return {
      id: `icon-tier-${tier}`,
      title: t(meta.titleKey),
      icon: <meta.icon className="w-4 h-4" />,
      IconComponent: meta.icon,
      onClick: () => presentation.onTierChange(tier),
      isActive: presentation.tier === tier,
    }
  })
  return layoutItems.concat(tierItems)
};

// Dock 导航项生成函数
export const createDockItems = (
  isDark: boolean,
  onToggleTheme: () => void,
  t: TFunction,
  onToggleLanguage: () => void,
  onViewModeChange?: (mode: 'compact' | 'standard' | 'comfortable') => void,
  currentViewMode?: 'compact' | 'standard' | 'comfortable',
  presentation?: BookmarkViewMenuOptions,
): DockItem[] => [
  {
    id: "home",
    title: t("dock.home"),
    icon: <Home className="w-5 h-5" />,
    IconComponent: Home,
  },
  {
    id: "search",
    title: t("dock.search"),
    icon: <Search className="w-5 h-5" />,
    IconComponent: Search,
  },
  {
    id: "ai",
    title: t("dock.ai"),
    icon: <Sparkles className="w-5 h-5" />,
    IconComponent: Sparkles,
  },
  {
    id: "notes",
    title: t("dock.notes"),
    icon: <Lightbulb className="w-5 h-5" />,
    IconComponent: Lightbulb,
  },
  {
    id: "add",
    title: t("dock.add"),
    icon: <Plus className="w-5 h-5" />,
    IconComponent: Plus,
  },
  // 视图切换菜单
  {
    id: "view",
    title: t("dock.view"),
    icon: <Eye className="w-5 h-5" />,
    IconComponent: Eye,
    subItems: createViewSubmenu(t, onViewModeChange, currentViewMode, presentation),
  },
  {
    id: "language",
    title: t("language_toggle"),
    icon: <Languages className="w-5 h-5" />,
    IconComponent: Languages,
    onClick: onToggleLanguage,
  },
  {
    id: "theme",
    title: isDark ? t("dock.theme_light") : t("dock.theme_dark"),
    icon: isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />,
    IconComponent: isDark ? Sun : Moon,
    onClick: onToggleTheme,
  },
  {
    id: "admin",
    title: t("dock.admin"),
    icon: <LayoutDashboard className="w-5 h-5" />,
    IconComponent: LayoutDashboard,
  },
  {
    id: "github",
    title: "GitHub",
    icon: <Github className="w-5 h-5" />,
    IconComponent: Github,
    href: "https://github.com/cropflre/NOWEN",
  },
];

// 根据菜单可见性过滤 Dock 项
export const filterDockItems = (
  items: DockItem[],
  menuVisibility: { languageToggle?: boolean; themeToggle?: boolean; searchToggle?: boolean },
  widgetVisibility?: { aiAssistant?: boolean },
  isLoggedIn?: boolean
): DockItem[] => {
  return items.filter((item) => {
    if (item.id === "language" && menuVisibility.languageToggle === false) {
      return false;
    }
    if (item.id === "theme" && menuVisibility.themeToggle === false) {
      return false;
    }
    if (item.id === "search" && menuVisibility.searchToggle === false) {
      return false;
    }
    if (item.id === "ai" && (widgetVisibility?.aiAssistant === false || !isLoggedIn)) {
      return false;
    }
    if (item.id === "notes" && !isLoggedIn) {
      return false;
    }
    if (item.id === "add" && !isLoggedIn) {
      return false;
    }
    return true;
  });
};
