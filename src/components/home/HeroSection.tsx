import { useEffect, useState, type ReactNode } from 'react';
import { Typewriter } from '../ui/typewriter';
import { Sparkles } from '../ui/effects';
import { getRandomWisdom, isQuotesVisible } from '../../data/quotes';
import { WeatherDisplay } from './WeatherDisplay';
import { SearchHint } from './SearchHint';
import { WeatherData } from '../../hooks/useWeather';
import { greetingForHour, useTime } from '../../hooks/useTime';
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
}

const wallpaperTextShadow = {
  primary: { textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)' },
  secondary: { textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.35)' },
  muted: { textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)' },
};

function StatusCluster({ showLunar, hasWallpaper }: { showLunar?: boolean; hasWallpaper?: boolean }) {
  const { formattedTime, formattedDate, lunarDate } = useTime(!!showLunar);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <div
        className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl"
        style={{ color: hasWallpaper ? 'rgba(255, 255, 255, 0.95)' : 'var(--color-text-primary)', ...(hasWallpaper ? wallpaperTextShadow.primary : {}) }}
      >
        {formattedTime}
      </div>
      <span
        className="text-sm tracking-wide"
        style={{ color: hasWallpaper ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-muted)', ...(hasWallpaper ? wallpaperTextShadow.muted : {}) }}
      >
        {formattedDate}
      </span>
      {showLunar && lunarDate.display && (
        <span
          className="rounded-md px-2 py-0.5 text-xs"
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
}: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [greeting, setGreeting] = useState(() => greetingForHour(new Date().getHours()));
  const showQuote = !isLiteMode && isQuotesVisible();

  useEffect(() => {
    const timer = setInterval(() => {
      const next = greetingForHour(new Date().getHours());
      setGreeting((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pb-6 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <StatusCluster showLunar={showLunar} hasWallpaper={hasWallpaper} />
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
        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          {statusExtra}
          {tabletNav}
          {showSearch && <SearchHint onOpenSearch={onOpenSearch} />}
        </div>
      </div>

      {showQuote && (
        <p
          className="mt-2 line-clamp-1 text-sm"
          style={{
            color: hasWallpaper ? 'rgba(255, 255, 255, 0.9)' : 'var(--color-text-secondary)',
            ...(hasWallpaper ? wallpaperTextShadow.secondary : {}),
          }}
        >
          {reducedMotion ? (
            greeting
          ) : (
            <Sparkles>
              <Typewriter
                getNextWord={getRandomWisdom}
                initialWord={greeting}
                delayBetweenWords={5000}
                fullSentence
              />
            </Sparkles>
          )}
        </p>
      )}
    </section>
  );
}

export default HeroSection;
