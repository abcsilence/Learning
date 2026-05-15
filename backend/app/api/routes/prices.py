import os
from pathlib import Path
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter


# Load environment variables from backend/.env using a path relative to this file.
_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

_API_KEY = os.getenv("TWELVE_DATA_API_KEY")
print(f"TWELVE_DATA_API_KEY loaded: {'YES' if _API_KEY else 'NO'}")

router = APIRouter(prefix="/prices", tags=["prices"])


def _is_weekend_utc(now: datetime) -> bool:
	# Monday=0 ... Sunday=6
	return now.weekday() >= 5


@router.get("/gold")
async def get_gold_prices() -> dict:
	"""Gold spot price and changes from Twelve Data.

	Always returns the exact response schema; on error returns zeros and the error message.
	"""

	now = datetime.now(timezone.utc)
	base = {
		"gold": 0.0,
		"goldChange": 0.0,
		"goldChangePercent": 0.0,
		"goldWeeklyChangePercent": 0.0,
		"isWeekend": _is_weekend_utc(now),
		"timestamp": now.isoformat(),
		"source": "twelvedata",
		"error": "",
	}

	try:
		quote = await fetch_quote("XAU/USD")
		weekly_change_pct = await fetch_weekly_change("XAU/USD")

		# Twelve Data fields come back as strings.
		gold = float(quote.get("close") or 0.0)
		gold_change = float(quote.get("change") or 0.0)
		gold_change_pct = float(quote.get("percent_change") or 0.0)

		return {
			**base,
			"gold": gold,
			"goldChange": gold_change,
			"goldChangePercent": gold_change_pct,
			"goldWeeklyChangePercent": float(weekly_change_pct),
		}
	except Exception as exc:
		return {**base, "error": str(exc)}


@router.get("/silver")
async def get_silver_prices() -> dict:
	"""Silver spot price and changes from Twelve Data.

	Always returns the exact response schema; on error returns zeros and the error message.
	"""

	now = datetime.now(timezone.utc)
	base = {
		"silver": 0.0,
		"silverChange": 0.0,
		"silverChangePercent": 0.0,
		"silverWeeklyChangePercent": 0.0,
		"isWeekend": _is_weekend_utc(now),
		"timestamp": now.isoformat(),
		"source": "twelvedata",
		"error": "",
	}

	try:
		quote = await fetch_quote("SILVER")
		# TEMP DEBUG: print the raw quote response for silver.
		print(f"SILVER quote raw: {quote}")
		weekly_change_pct = await fetch_weekly_change("SILVER")

		silver = float(quote.get("close") or 0.0)
		silver_change = float(quote.get("change") or 0.0)
		silver_change_pct = float(quote.get("percent_change") or 0.0)

		return {
			**base,
			"silver": silver,
			"silverChange": silver_change,
			"silverChangePercent": silver_change_pct,
			"silverWeeklyChangePercent": float(weekly_change_pct),
		}
	except Exception as exc:
		return {**base, "error": str(exc)}


@router.get("/btc")
async def get_btc_prices() -> dict:
	"""BTC price and changes from Twelve Data.

	Always returns the exact response schema; on error returns zeros and the error message.
	"""

	now = datetime.now(timezone.utc)
	base = {
		"btc": 0.0,
		"btcChange": 0.0,
		"btcChangePercent": 0.0,
		"btcWeeklyChangePercent": 0.0,
		"btcMarketCap": 0.0,
		"btcDominance": 0.0,
		"btcVolume24h": 0.0,
		"btcVolumeChangePercent": 0.0,
		"isWeekend": _is_weekend_utc(now),
		"timestamp": now.isoformat(),
		"source": "twelvedata",
		"error": "",
	}

	try:
		quote = await fetch_quote("BTC/USD")
		weekly_change_pct = await fetch_weekly_change("BTC/USD")

		btc = float(quote.get("close") or 0.0)
		btc_change = float(quote.get("change") or 0.0)
		btc_change_pct = float(quote.get("percent_change") or 0.0)

		return {
			**base,
			"btc": btc,
			"btcChange": btc_change,
			"btcChangePercent": btc_change_pct,
			"btcWeeklyChangePercent": float(weekly_change_pct),
		}
	except Exception as exc:
		return {**base, "error": str(exc)}


async def fetch_quote(symbol: str, **extra_params: str) -> dict:
	"""Fetch a quote for the given symbol from Twelve Data.

	Returns the raw JSON response.
	"""
	if not _API_KEY:
		raise RuntimeError("TWELVE_DATA_API_KEY is not set")

	url = "https://api.twelvedata.com/quote"
	params = {"symbol": symbol, "apikey": _API_KEY, **extra_params}

	async with httpx.AsyncClient(timeout=20) as client:
		resp = await client.get(url, params=params)
		resp.raise_for_status()
		return resp.json()


async def fetch_weekly_change(symbol: str) -> float:
	"""Fetch the last ~7 daily closes and compute percent change.

	Uses: (last_close - first_close) / first_close * 100
	"""
	try:
		if not _API_KEY:
			return 0.0

		url = "https://api.twelvedata.com/time_series"
		params = {
			"symbol": symbol,
			"interval": "1day",
			"outputsize": 7,
			"apikey": _API_KEY,
		}

		async with httpx.AsyncClient(timeout=20) as client:
			resp = await client.get(url, params=params)
			resp.raise_for_status()
			data = resp.json()

		values = data.get("values")
		if not isinstance(values, list) or len(values) < 2:
			return 0.0

		# Sort by date ascending (oldest first).
		values_sorted = sorted(values, key=lambda v: v.get("datetime", ""))
		first_item = values_sorted[0]
		last_item = values_sorted[-1]

		print(
			f"{symbol} weekly change range: {first_item.get('datetime')} -> {last_item.get('datetime')}"
		)
		print(f"{symbol} first item: {first_item}")
		print(f"{symbol} last item: {last_item}")

		start = float(first_item.get("close") or 0.0)
		end = float(last_item.get("close") or 0.0)
		if start == 0:
			return 0.0

		return (end - start) / start * 100.0
	except Exception:
		return 0.0

