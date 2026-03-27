from mcp.server.fastmcp import FastMCP
import yfinance as yf

mcp = FastMCP("Financial_Data_Server")


@mcp.tool()
def get_company_data(ticker:str) -> str :
    """Fetch the current stock price and EBITDA margin for a given company ticker (e.g., AAPL, MSFT)."""
    try:
        # Reach out to Yahoo Finance for the data
        company = yf.Ticker(ticker)
        price = company.info.get("currentPrice", "Unknown")
        ebitda_margin = company.info.get("ebitdaMargins", "Unknown")
        
        # Package the data up nicely to hand back to the AI
        return f"Data for {ticker}: Current Price is ${price}. EBITDA Margin is {ebitda_margin}."
    
    except Exception as e:
        return f"Sorry, I couldn't find data for {ticker}. Error: {str(e)}"

# 3. Start the server safely using your Mac's internal communication (stdio)
if __name__ == "__main__":
    mcp.run(transport='stdio')