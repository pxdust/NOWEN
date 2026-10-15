import { useState, useEffect, useMemo } from "react";

export interface LunarDateInfo {
  month: string;
  day: string;
  fullDate: string;
  jieQi: string | null;
  festival: string | null;
  display: string;
}

const emptyLunar: LunarDateInfo = {
  month: "",
  day: "",
  fullDate: "",
  jieQi: null,
  festival: null,
  display: "",
};

export function greetingForHour(hours: number): string {
  if (hours < 6) return "夜深了，注意休息";
  if (hours < 9) return "早安，新的一天";
  if (hours < 12) return "上午好";
  if (hours < 14) return "午安";
  if (hours < 17) return "下午好";
  if (hours < 19) return "傍晚好";
  if (hours < 22) return "晚上好";
  return "夜深了";
}

export function useTime(enableLunar = true) {
  const [time, setTime] = useState(() => new Date());
  const [lunarDate, setLunarDate] = useState<LunarDateInfo>(emptyLunar);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const greeting = useMemo(() => greetingForHour(hours), [hours]);

  const formattedDate = time.toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const dateKey = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()}`;

  // 农历库约 400KB，只在需要时再拉，避免堵在首屏包里。
  useEffect(() => {
    if (!enableLunar) {
      setLunarDate(emptyLunar);
      return;
    }
    let cancelled = false;
    const current = time;
    import("lunar-javascript")
      .then(({ Solar }) => {
        if (cancelled) return;
        const solar = Solar.fromDate(current);
        const lunar = solar.getLunar();
        const monthName = lunar.getMonthInChinese();
        const dayName = lunar.getDayInChinese();
        const jieQi = lunar.getJieQi();
        const festivals = lunar.getFestivals() as string[];
        const festival = festivals.length > 0 ? festivals[0] : null;
        setLunarDate({
          month: monthName,
          day: dayName,
          fullDate: `${monthName}月${dayName}`,
          jieQi: jieQi || null,
          festival,
          display: festival || jieQi || `${monthName}月${dayName}`,
        });
      })
      .catch(() => {
        if (!cancelled) setLunarDate(emptyLunar);
      });
    return () => {
      cancelled = true;
    };
    // dateKey 按天变化；time 取 effect 启动时的值即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableLunar, dateKey]);

  return {
    time,
    hours,
    minutes,
    formattedTime,
    formattedDate,
    lunarDate,
    greeting,
    isNight: hours < 6 || hours >= 19,
  };
}
