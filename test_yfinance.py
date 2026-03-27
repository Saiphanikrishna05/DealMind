import yfinance as yf
info = yf.Ticker('NVDA').info
keys = ["currentPrice", "ebitdaMargins", "grossMargins", "profitMargins", "trailingPE", "enterpriseToEbitda", "debtToEquity", "freeCashflow"]
for k in keys:
    print(f"{k}: {info.get(k, 'NOT FOUND')}")
