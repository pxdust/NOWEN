import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from '../ui/effects';
import { Typewriter } from '../ui/typewriter';
import { getRandomWisdom, isQuotesVisible } from '../../data/quotes';
import { WeatherDisplay } from './WeatherDisplay';
import { SearchHint } from './SearchHint';
import { WeatherData } from '../../hooks/useWeather';
import { greetingForHour, useTime } from '../../hooks/useTime';

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
}

function LiveClock({ showLunar, hasWallpaper }: { showLunar?: boolean; hasWallpaper?: boolean }) {
  const { formattedTime, formattedDate, lunarDate } = useTime(!!showLunar);
  return (
    <>
      <div
        className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tighter font-mono"
        style={{ color: hasWallpaper ? 'rgba(255, 255, 255, 0.95)' : 'var(--color-text-primary)', ...(hasWallpaper ? wallpaperTextShadow.primary : {}) }}
      >
        {formattedTime}
      </div>
      <div
        className="text-base tracking-[0.2em] uppercase mt-3 flex flex-wrap items-center justify-center gap-2"
        style={{ color: hasWallpaper ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-muted)', ...(hasWallpaper ? wallpaperTextShadow.muted : {}) }}
      >
        <span>{formattedDate}</span>
        {showLunar && lunarDate.display && (
          <span
            className="px-2 py-0.5 rounded-md text-sm normal-case tracking-normal"
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
    </>
  );
}

// A11y: 壁纸模式下的文字阴影样式 - 提升对比度确保可读性
const wallpaperTextShadow = {
  primary: { textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)' },
  secondary: { textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.35)' },
  muted: { textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)' },
};

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
}: HeroSectionProps) {
  const [greeting, setGreeting] = useState(() => greetingForHour(new Date().getHours()));
  useEffect(() => {
    const timer = setInterval(() => {
      const next = greetingForHour(new Date().getHours());
      setGreeting((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.section
      className="pt-20 pb-16 text-center relative"
      initial={{ opacity: 0, y: isLiteMode ? 10 : 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isLiteMode ? 0.5 : 0.8 }}
    >
      {/* Time Display */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <LiveClock showLunar={showLunar} hasWallpaper={hasWallpaper} />

        {/* 天气显示 */}
        {showWeather && weather && (
          <WeatherDisplay weather={weather} loading={weatherLoading} onRefresh={onRefreshWeather} weatherCity={weatherCity} onCityChange={onCityChange} />
        )}
      </motion.div>

      {/* Greeting with Typewriter */}
      {isQuotesVisible() && (
        <motion.h1
          className="text-base sm:text-lg lg:text-xl font-serif font-medium mb-8 tracking-wide min-h-[3.5em] flex items-center justify-center"
          style={{ 
            color: hasWallpaper ? 'rgba(255, 255, 255, 0.95)' : 'var(--color-text-secondary)',
            ...(hasWallpaper ? wallpaperTextShadow.secondary : {}),
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {isLiteMode ? (
            // 精简模式：静态文字，无 Sparkles 特效
            <Typewriter
              getNextWord={getRandomWisdom}
              initialWord={greeting}
              delayBetweenWords={5000}
              fullSentence
            />
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
        </motion.h1>
      )}

      {/* Search Hint */}
      {showSearch && <SearchHint isLiteMode={isLiteMode} onOpenSearch={onOpenSearch} />}
    </motion.section>
  );
}

export default HeroSection;
