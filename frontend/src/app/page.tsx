"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GoldResponse = {
  gold: number;
  goldChange: number;
  goldChangePercent: number;
  goldWeeklyChangePercent: number;
  isWeekend: boolean;
  timestamp: string;
  source: string;
  error: string;
};

type SilverResponse = {
  silver: number;
  silverChange: number;
  silverChangePercent: number;
  silverWeeklyChangePercent: number;
  isWeekend: boolean;
  timestamp: string;
  source: string;
  error: string;
};

type BtcResponse = {
  btc: number;
  btcChange: number;
  btcChangePercent: number;
  btcWeeklyChangePercent: number;
  btcMarketCap: number;
  btcDominance: number;
  btcVolume24h: number;
  btcVolumeChangePercent: number;
  isWeekend: boolean;
  timestamp: string;
  source: string;
  error: string;
};

type AssetCardProps = {
  name: string;
  price: number;
  dailyChange: number;
  dailyChangePercent: number;
  weeklyChangePercent: number;
  icon: string;
  pair: string;
  accent: "gold" | "silver" | "btc";
  lastUpdated: string;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatNumber(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function AssetCard(props: AssetCardProps) {
  const dailyUp = props.dailyChangePercent > 0;
  const dailyDown = props.dailyChangePercent < 0;

  const accent =
    props.accent === "gold"
      ? "rgba(255, 215, 0, 0.55)"
      : props.accent === "silver"
        ? "rgba(192, 192, 192, 0.45)"
        : "rgba(247, 147, 26, 0.55)";

  const accentSoft =
    props.accent === "gold"
      ? "rgba(255, 215, 0, 0.14)"
      : props.accent === "silver"
        ? "rgba(192, 192, 192, 0.12)"
        : "rgba(247, 147, 26, 0.14)";

  return (
    <div
      className="group relative h-full rounded-2xl border bg-[#131929]/90 p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-opacity duration-500"
      style={{ borderColor: accent, boxShadow: `0 0 0 1px ${accent}, 0 30px 80px -50px ${accentSoft}` }}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 blur transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(600px circle at 40% 10%, ${accentSoft}, transparent 60%)` }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
            style={{ background: accentSoft, border: `1px solid ${accent}` }}
          >
            <span aria-hidden>{props.icon}</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{props.name}</div>
            <div className="text-xs text-[#8892a4]">{props.pair}</div>
          </div>
        </div>

        <div
          className={classNames(
            "rounded-full px-3 py-1 text-sm font-semibold",
            dailyUp && "text-[#00d084]",
            dailyDown && "text-[#ff4d4d]",
            !dailyUp && !dailyDown && "text-[#8892a4]"
          )}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {dailyUp ? "+" : ""}
          {formatNumber(props.dailyChange, 2)} ({dailyUp ? "+" : ""}
          {formatNumber(props.dailyChangePercent, 2)}%)
        </div>
      </div>

      <div className="relative mt-6">
        <div className="text-5xl font-bold tracking-tight text-white">
          {formatNumber(props.price, 2)}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-[#8892a4]">Weekly change</div>
          <div className="text-sm font-semibold text-white">
            {props.weeklyChangePercent > 0 ? "+" : ""}
            {formatNumber(props.weeklyChangePercent, 2)}%
          </div>
        </div>
      </div>

      <div className="relative mt-6 text-xs text-[#8892a4]">
        Last updated: {props.lastUpdated}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-white/80" />
        <div className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(120,90,255,0.22),transparent_65%)] blur" />
      </div>
    </div>
  );
}

export default function Home() {
  const baseUrl = useMemo(() => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
    return raw.replace(/\/$/, "");
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [gold, setGold] = useState<GoldResponse | null>(null);
  const [silver, setSilver] = useState<SilverResponse | null>(null);
  const [btc, setBtc] = useState<BtcResponse | null>(null);

  const [goldUpdatedAt, setGoldUpdatedAt] = useState<Date | null>(null);
  const [silverUpdatedAt, setSilverUpdatedAt] = useState<Date | null>(null);
  const [btcUpdatedAt, setBtcUpdatedAt] = useState<Date | null>(null);

  const mountedRef = useRef(true);

  const formatTime = useCallback((d: Date | null) => {
    if (!d) return "—";
    return d.toLocaleTimeString(undefined, { hour12: false });
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const fetchWithRetry = useCallback(
    async (url: string) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
  } catch {
        // Retry once after 2 seconds.
        await sleep(2000);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUrl]
  );

  const refreshAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      const errors: string[] = [];

      if (!silent) {
        setLoading(true);
        setError("");
      }

      const goldUrl = `${baseUrl}/api/prices/gold`;
      const silverUrl = `${baseUrl}/api/prices/silver`;
      const btcUrl = `${baseUrl}/api/prices/btc`;

      const fetchGold = async () => {
        try {
          const json = (await fetchWithRetry(goldUrl)) as GoldResponse;
          if (json.error) errors.push(`gold: ${json.error}`);
          if (mountedRef.current) {
            setGold(json);
            setGoldUpdatedAt(new Date());
          }
        } catch (e) {
          errors.push(`gold: ${e instanceof Error ? e.message : String(e)}`);
        }
      };

      const fetchSilver = async () => {
        try {
          const json = (await fetchWithRetry(silverUrl)) as SilverResponse;
          if (json.error) errors.push(`silver: ${json.error}`);
          if (mountedRef.current) {
            setSilver(json);
            setSilverUpdatedAt(new Date());
          }
        } catch (e) {
          errors.push(
            `silver: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      };

      const fetchBtc = async () => {
        try {
          const json = (await fetchWithRetry(btcUrl)) as BtcResponse;
          if (json.error) errors.push(`btc: ${json.error}`);
          if (mountedRef.current) {
            setBtc(json);
            setBtcUpdatedAt(new Date());
          }
        } catch (e) {
          errors.push(`btc: ${e instanceof Error ? e.message : String(e)}`);
        }
      };

      await Promise.all([fetchGold(), fetchSilver(), fetchBtc()]);

      if (mountedRef.current) {
        // Only replace the global error message if we have something meaningful.
        setError(errors.join(" • "));
        setLoading(false);
      }
    },
    [baseUrl, fetchWithRetry]
  );

  useEffect(() => {
    mountedRef.current = true;

    // On page load: fetch immediately.
    void refreshAll({ silent: false });

    // Every 30 seconds: fetch again silently.
    const id = window.setInterval(() => {
      void refreshAll({ silent: true });
    }, 30_000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      {/* Subtle animated orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-[-10%] h-[34rem] w-[34rem] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(120,90,255,0.22),transparent_60%)] blur-3xl" />
        <div className="absolute top-24 right-[-10%] h-[28rem] w-[28rem] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(0,208,132,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-30%] left-[25%] h-[30rem] w-[30rem] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(247,147,26,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,16,32,0.7),rgba(11,16,32,1))]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        {/* Ticker bar */}
        <div className="border-b border-white/5 bg-white/[0.03] backdrop-blur">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Gold</span>
                <span className="text-white/90">${formatNumber(gold?.gold ?? 0, 2)}</span>
                <span
                  className={classNames(
                    "font-semibold",
                    (gold?.goldChangePercent ?? 0) > 0 && "text-[#00d084]",
                    (gold?.goldChangePercent ?? 0) < 0 && "text-[#ff4d4d]",
                    (gold?.goldChangePercent ?? 0) === 0 && "text-[#8892a4]"
                  )}
                >
                  {(gold?.goldChangePercent ?? 0) > 0 ? "+" : ""}
                  {formatNumber(gold?.goldChange ?? 0, 2)} ({(gold?.goldChangePercent ?? 0) > 0 ? "+" : ""}
                  {formatNumber(gold?.goldChangePercent ?? 0, 2)}%)
                </span>
              </div>

              <div className="hidden h-4 w-px bg-white/10 sm:block" />

              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Silver</span>
                <span className="text-white/90">${formatNumber(silver?.silver ?? 0, 2)}</span>
                <span
                  className={classNames(
                    "font-semibold",
                    (silver?.silverChangePercent ?? 0) > 0 && "text-[#00d084]",
                    (silver?.silverChangePercent ?? 0) < 0 && "text-[#ff4d4d]",
                    (silver?.silverChangePercent ?? 0) === 0 && "text-[#8892a4]"
                  )}
                >
                  {(silver?.silverChangePercent ?? 0) > 0 ? "+" : ""}
                  {formatNumber(silver?.silverChange ?? 0, 2)} ({(silver?.silverChangePercent ?? 0) > 0 ? "+" : ""}
                  {formatNumber(silver?.silverChangePercent ?? 0, 2)}%)
                </span>
              </div>

              <div className="hidden h-4 w-px bg-white/10 sm:block" />

              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">BTC</span>
                <span className="text-white/90">${formatNumber(btc?.btc ?? 0, 2)}</span>
                <span
                  className={classNames(
                    "font-semibold",
                    (btc?.btcChangePercent ?? 0) > 0 && "text-[#00d084]",
                    (btc?.btcChangePercent ?? 0) < 0 && "text-[#ff4d4d]",
                    (btc?.btcChangePercent ?? 0) === 0 && "text-[#8892a4]"
                  )}
                >
                  {(btc?.btcChangePercent ?? 0) > 0 ? "+" : ""}
                  {formatNumber(btc?.btcChange ?? 0, 2)} ({(btc?.btcChangePercent ?? 0) > 0 ? "+" : ""}
                  {formatNumber(btc?.btcChangePercent ?? 0, 2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  Price Tracker
                </h1>
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7a5aff] opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7a5aff]" />
                  </span>
                  <span className="text-sm font-semibold text-white/90">Live</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-[#8892a4]">
                Deep market snapshot · Powered by Twelve Data
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refreshAll({ silent: false })}
              className="relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 0 0 1px rgba(122,90,255,0.25), 0 0 40px rgba(122,90,255,0.20)",
              }}
            >
              Refresh
            </button>
          </div>

          {/* Content */}
          <div className="mt-10">
            {loading ? (
              <Spinner />
            ) : (
              <>
                {error ? (
                  <div
                    className="mb-6 rounded-2xl px-4 py-3 text-sm"
                    style={{
                      background: "rgba(255, 77, 77, 0.08)",
                      border: "1px solid rgba(255, 77, 77, 0.25)",
                      color: "#ffb3b3",
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="animate-[fadeIn_450ms_ease-out]" style={{ animationFillMode: "both" }}>
                    <AssetCard
                      icon="🥇"
                      accent="gold"
                      name="Gold"
                      pair="XAU/USD"
                      price={gold?.gold ?? 0}
                      dailyChange={gold?.goldChange ?? 0}
                      dailyChangePercent={gold?.goldChangePercent ?? 0}
                      weeklyChangePercent={gold?.goldWeeklyChangePercent ?? 0}
                      lastUpdated={formatTime(goldUpdatedAt)}
                    />
                  </div>

                  <div className="animate-[fadeIn_450ms_ease-out]" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
                    <AssetCard
                      icon="🥈"
                      accent="silver"
                      name="Silver"
                      pair="SILVER"
                      price={silver?.silver ?? 0}
                      dailyChange={silver?.silverChange ?? 0}
                      dailyChangePercent={silver?.silverChangePercent ?? 0}
                      weeklyChangePercent={silver?.silverWeeklyChangePercent ?? 0}
                      lastUpdated={formatTime(silverUpdatedAt)}
                    />
                  </div>

                  <div className="animate-[fadeIn_450ms_ease-out]" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
                    <AssetCard
                      icon="₿"
                      accent="btc"
                      name="Bitcoin"
                      pair="BTC/USD"
                      price={btc?.btc ?? 0}
                      dailyChange={btc?.btcChange ?? 0}
                      dailyChangePercent={btc?.btcChangePercent ?? 0}
                      weeklyChangePercent={btc?.btcWeeklyChangePercent ?? 0}
                      lastUpdated={formatTime(btcUpdatedAt)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 sm:flex-row sm:items-center">
            <div className="text-sm text-[#8892a4]">
              Data provided by Twelve Data · Updates every 30s
            </div>
            <div className="text-xs text-white/40">API: {baseUrl}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
