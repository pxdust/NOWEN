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
  /** 点击时间切换极简模式。不传时时间只是展示。 */
  minimalMode?: boolean;
  onToggleMinimal?: () => void;
}

const wallpaperTextShadow = {
  primary: { textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)' },
  secondary: { textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.35)' },
  muted: { textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)' },
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
}) {
  const { t } = useTranslation();
  const { formattedTime, formattedDate, lunarDate } = useTime(!!showLunar);
  const primaryColor = hasWallpaper ? 'rgba(255, 255, 255, 0.95)' : 'var(--color-text-primary)';
  const secondaryColor = hasWallpaper ? 'rgba(255, 255, 255, 0.9)' : 'var(--color-text-secondary)';
  const mutedColor = hasWallpaper ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-muted)';
  const timeClassName = 'font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl';
  const timeStyle = { color: primaryColor, ...(hasWallpaper ? wallpaperTextShadow.primary : {}) };
  const minimalHint = minimalMode ? t('minimalMode.exitHint') : t('minimalMode.enterHint');

  return (
    <div
      data-testid="hero-stack"
      className="flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-center sm:gap-3"
    >
      {onToggleMinimal ? (
        <button
          type="button"
          data-testid="hero-time"
          onClick={onToggleMinimal}
          title={minimalHint}
          aria-pressed={!!minimalMode}
          aria-label={minimalHint}
          className={`${timeClassName} cursor-pointer rounded-md transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4`}
          style={timeStyle}
        >
          {formattedTime}
        </button>
      ) : (
        <div
          data-testid="hero-time"
          className={timeClassName}
          style={timeStyle}
        >
          {formattedTime}
        </div>
      )}

      <div
        data-testid="hero-meta"
        className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5"
      >
        <span
          className="text-sm tracking-wide sm:text-base"
          style={{ color: mutedColor, ...(hasWallpaper ? wallpaperTextShadow.muted : {}) }}
        >
          {formattedDate}
        </span>
        {showLunar && lunarDate.display && (
          <span
            data-testid="hero-lunar"
            className="rounded-md px-2 py-0.5 text-xs sm:text-sm"
            style={{
              background:
                lunarDate.festival || lunarDate.jieQi
                  ? 'rgba(251, 146, 60, 0.15)'
                  : hasWallpaper ? 'rgba(255, 255, 255, 0.15)' : 'var(--color-bg-tertiary)',
              color:
                lunarDate.festival || lunarDate.jieQi
                  ? 'rgb(251, 146, 60)'
                  : hasWallpaper ? 'rgba(255, 255, 255, 0.85)' : 'var(--color-text-muted)',
              ...(hasWallpaper ? wallpaperTextShadow.muted : {}),
            }}
          >
            {lunarDate.display}
          </span>
        )}
        {showWeather && weather && (
          <WeatherDisplay
            compact
            weather={weather}
            loading={!!weatherLoading}
            onRefresh={onRefreshWeather}
            weatherCity={weatherCity}
            onCityChange={onCityChange}
          />
        )}
      </div>

      {showQuote && (
        <p
          data-testid="hero-quote"
          className="line-clamp-2 w-full max-w-3xl text-lg leading-snug sm:text-xl sm:leading-relaxed"
          style={{ color: secondaryColor, ...(hasWallpaper ? wallpaperTextShadow.secondary : {}) }}
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
  const showEdge = showSearch || !!statusExtra || !!tabletNav;

  return (
    <section
      data-testid="hero-section"
      className="relative mb-4 flex min-h-[25vh] items-center justify-center py-10"
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
      />
    </section>
  );
}

export default HeroSection;
