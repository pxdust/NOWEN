import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Typewriter } from '../ui/typewriter';
import { Sparkles } from '../ui/effects';
import { getRandomWisdom, isQuotesVisible } from '../../data/quotes';
import { WeatherDisplay } from './WeatherDisplay';
import { SearchHint } from './SearchHint';
import { WeatherData } from '../../hooks/useWeather';
import { useTime } from '../../hooks/useTime';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

interface HeroSectionProps {
  isLiteMode?: boolean;
  showWeather?: boolean;
  showLunar?: boolean;
  showSearch?: boolean;
  weather: WeatherData | null;
  weatherLoading?: boolean;
  weatherCity?: string;
  hasWallpaper?: boolean;
  onRefreshWeather: () => void;
  onCityChange?: (city: string) => void;
  onOpenSearch: () => void;
  statusExtra?: ReactNode;
  tabletNav?: ReactNode;
  /** 点击时间切换极简模式。不传时时间只是展示，方便既有调用保持原样。 */
  minimalMode?: boolean;
  onToggleMinimal?: () => void;
}

const wallpaperTextShadow = {
  primary: { textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)' },
  secondary: { textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.35)' },
  muted: { textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)' },
};

const minimalWallpaperShadow = {
  primary: '0 2px 28px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.8)',
  secondary: '0 1px 12px rgba(0,0,0,0.5)',
  muted: '0 1px 10px rgba(0,0,0,0.55)',
};

function HeroStack({
  showWeather,
  showLunar,
  weather,
  weatherLoading,
  weatherCity,
  hasWallpaper,
  onRefreshWeather,
  onCityChange,
  showQuote,
  animateQuote,
  staticQuote,
  minimalMode,
  onToggleMinimal,
  showSearch,
  onOpenSearch,
  settleMotion,
}: {
  showWeather?: boolean;
  showLunar?: boolean;
  weather: WeatherData | null;
  weatherLoading?: boolean;
  weatherCity?: string;
  hasWallpaper?: boolean;
  onRefreshWeather: () => void;
  onCityChange?: (city: string) => void;
  showQuote: boolean;
  animateQuote: boolean;
  staticQuote: string;
  minimalMode?: boolean;
  onToggleMinimal?: () => void;
  showSearch?: boolean;
  onOpenSearch: () => void;
  settleMotion: boolean;
}) {
  const { t } = useTranslation();
  const { formattedTime, formattedDate, lunarDate } = useTime(!!showLunar);
  const primaryColor = hasWallpaper ? 'rgba(255, 255, 255, 0.96)' : 'var(--color-text-primary)';
  const secondaryColor = hasWallpaper ? 'rgba(255, 255, 255, 0.9)' : 'var(--color-text-secondary)';
  const mutedColor = hasWallpaper
    ? (minimalMode ? 'rgba(255, 255, 255, 0.82)' : 'rgba(255, 255, 255, 0.7)')
    : 'var(--color-text-muted)';

  const minimalHint = minimalMode ? t('minimalMode.exitHint') : t('minimalMode.enterHint');
  const timeClassName = [
    'font-mono tabular-nums tracking-tight',
    minimalMode ? 'text-6xl font-medium sm:text-7xl lg:text-8xl' : 'text-4xl font-semibold sm:text-5xl',
    onToggleMinimal ? 'cursor-pointer rounded-md hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4' : '',
    settleMotion ? 'transition-[font-size,opacity] duration-500 ease-out' : '',
  ].filter(Boolean).join(' ');
  const timeStyle = {
    color: primaryColor,
    ...(hasWallpaper
      ? { textShadow: minimalMode ? minimalWallpaperShadow.primary : wallpaperTextShadow.primary.textShadow }
      : minimalMode
        ? { textShadow: '0 2px 22px rgba(0,0,0,0.28)' }
        : {}),
  };
  const metaShadow = hasWallpaper
    ? { textShadow: minimalMode ? minimalWallpaperShadow.muted : wallpaperTextShadow.muted.textShadow }
    : {};
  const quoteColor = minimalMode
    ? (hasWallpaper ? 'rgba(255, 255, 255, 0.72)' : 'var(--color-text-muted)')
    : secondaryColor;
  const quoteShadow = hasWallpaper
    ? { textShadow: minimalMode ? minimalWallpaperShadow.secondary : wallpaperTextShadow.secondary.textShadow }
    : {};

  const timeNode = onToggleMinimal ? (
    <button
      type="button"
      data-testid="hero-time"
      onClick={onToggleMinimal}
      title={minimalHint}
      aria-pressed={!!minimalMode}
      aria-label={minimalHint}
      className={timeClassName}
      style={timeStyle}
    >
      {formattedTime}
    </button>
  ) : (
    <div data-testid="hero-time" className={timeClassName} style={timeStyle}>
      {formattedTime}
    </div>
  );

  return (
    <div
      data-testid="hero-stack"
      className={
        minimalMode
          ? 'flex w-full max-w-3xl flex-col items-center justify-center gap-5 text-center sm:gap-6'
          : 'flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-center sm:gap-3'
      }
    >
      {timeNode}

      <div
        data-testid="hero-meta"
        className={
          minimalMode
            ? 'flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-base sm:text-lg'
            : 'flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5'
        }
      >
        <span
          className={minimalMode ? 'tracking-wide' : 'text-sm tracking-wide sm:text-base'}
          style={{ color: mutedColor, ...metaShadow }}
        >
          {formattedDate}
        </span>
        {showLunar && lunarDate.display && (
          <span
            data-testid="hero-lunar"
            className={
              minimalMode
                ? 'text-sm tracking-wide sm:text-base'
                : 'rounded-md px-2 py-0.5 text-xs sm:text-sm'
            }
            style={
              minimalMode
                ? {
                    color: lunarDate.festival || lunarDate.jieQi
                      ? 'rgb(251, 146, 60)'
                      : mutedColor,
                    ...metaShadow,
                  }
                : {
                    background:
                      lunarDate.festival || lunarDate.jieQi
                        ? 'rgba(251, 146, 60, 0.15)'
                        : hasWallpaper ? 'rgba(255, 255, 255, 0.15)' : 'var(--color-bg-tertiary)',
                    color:
                      lunarDate.festival || lunarDate.jieQi
                        ? 'rgb(251, 146, 60)'
                        : hasWallpaper ? 'rgba(255, 255, 255, 0.85)' : 'var(--color-text-muted)',
                    ...(hasWallpaper ? wallpaperTextShadow.muted : {}),
                  }
            }
          >
            {lunarDate.display}
          </span>
        )}
        {showWeather && weather && (
          <WeatherDisplay
            compact
            plain={!!minimalMode}
            onMedia={!!minimalMode && !!hasWallpaper}
            weather={weather}
            loading={!!weatherLoading}
            onRefresh={onRefreshWeather}
            weatherCity={weatherCity}
            onCityChange={onCityChange}
          />
        )}
      </div>

      {minimalMode && showSearch && (
        <SearchHint variant="stage" onWallpaper={!!hasWallpaper} onOpenSearch={onOpenSearch} />
      )}

      {showQuote && (
        <p
          data-testid="hero-quote"
          className={
            minimalMode
              ? 'line-clamp-2 w-full max-w-xl text-sm font-normal leading-relaxed sm:text-base'
              : 'line-clamp-2 w-full max-w-3xl text-lg leading-snug sm:text-xl sm:leading-relaxed'
          }
          style={{ color: quoteColor, ...quoteShadow }}
        >
          {animateQuote ? (
            <Sparkles className="inline">
              <Typewriter
                getNextWord={getRandomWisdom}
                initialWord={staticQuote}
                delayBetweenWords={5000}
                fullSentence
              />
            </Sparkles>
          ) : (
            staticQuote
          )}
        </p>
      )}
    </div>
  );
}

export function HeroSection({
  isLiteMode,
  showWeather,
  showLunar,
  showSearch = true,
  weather,
  weatherLoading,
  weatherCity,
  hasWallpaper,
  onRefreshWeather,
  onCityChange,
  onOpenSearch,
  statusExtra,
  tabletNav,
  minimalMode = false,
  onToggleMinimal,
}: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const showQuote = isQuotesVisible();
  const [staticQuote] = useState(getRandomWisdom);
  const animateQuote = showQuote && !isLiteMode && !reducedMotion;
  const showEdge = !minimalMode && (showSearch || !!statusExtra || !!tabletNav);

  return (
    <section
      data-testid="hero-section"
      className={[
        'relative flex items-center justify-center',
        minimalMode ? 'mb-0 min-h-[100dvh] pb-[12vh]' : 'mb-4 min-h-[25vh] py-10',
        reducedMotion ? '' : 'transition-[min-height,padding] duration-500 ease-out',
      ].filter(Boolean).join(' ')}
    >
      {showEdge && (
        <div
          data-testid="hero-edge"
          className="absolute right-0 top-2 z-10 flex items-center justify-end gap-2 sm:top-3"
        >
          {statusExtra}
          {tabletNav}
          {showSearch && <SearchHint variant="edge" onOpenSearch={onOpenSearch} />}
        </div>
      )}

      <HeroStack
        showWeather={showWeather}
        showLunar={showLunar}
        weather={weather}
        weatherLoading={weatherLoading}
        weatherCity={weatherCity}
        hasWallpaper={hasWallpaper}
        onRefreshWeather={onRefreshWeather}
        onCityChange={onCityChange}
        showQuote={showQuote}
        animateQuote={animateQuote}
        staticQuote={staticQuote}
        minimalMode={minimalMode}
        onToggleMinimal={onToggleMinimal}
        showSearch={showSearch}
        onOpenSearch={onOpenSearch}
        settleMotion={!reducedMotion}
      />
    </section>
  );
}

export default HeroSection;
