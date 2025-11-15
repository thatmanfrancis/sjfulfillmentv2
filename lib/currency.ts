// Currency conversion utility using free exchange rate API
interface ExchangeRateResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CachedRate {
  rate: number;
  timestamp: number;
  expiry: number;
}

// Cache for exchange rates (1 hour TTL)
const rateCache = new Map<string, CachedRate>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export class CurrencyService {
  private static readonly API_URL = 'https://api.exchangerate-api.com/v4/latest';
  private static readonly FALLBACK_API = 'https://api.fixer.io/latest';

  /**
   * Get exchange rate from one currency to another
   */
  static async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    const cacheKey = `${from}_${to}`;
    const cached = rateCache.get(cacheKey);
    
    // Return cached rate if still valid
    if (cached && Date.now() < cached.expiry) {
      return cached.rate;
    }

    try {
      // Try primary API first
      const response = await fetch(`${this.API_URL}/${from}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
      }

      const data: ExchangeRateResponse = await response.json();
      
      if (!data.success || !data.rates[to]) {
        throw new Error(`Rate for ${to} not found`);
      }

      const rate = data.rates[to];
      
      // Cache the rate
      rateCache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_TTL
      });

      return rate;

    } catch (error) {
      console.error(`Error fetching exchange rate for ${from} to ${to}:`, error);
      
      // Try to return a cached rate even if expired
      if (cached) {
        console.warn('Using expired cached rate');
        return cached.rate;
      }
      
      // Return fallback rates for common conversions
      return this.getFallbackRate(from, to);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertAmount(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }

  /**
   * Get multiple currency rates at once
   */
  static async getMultipleRates(baseCurrency: string, targetCurrencies: string[]): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    
    try {
      const response = await fetch(`${this.API_URL}/${baseCurrency}`);
      const data: ExchangeRateResponse = await response.json();
      
      if (data.success) {
        for (const currency of targetCurrencies) {
          if (data.rates[currency]) {
            rates[currency] = data.rates[currency];
            
            // Cache individual rates
            const cacheKey = `${baseCurrency}_${currency}`;
            rateCache.set(cacheKey, {
              rate: data.rates[currency],
              timestamp: Date.now(),
              expiry: Date.now() + CACHE_TTL
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching multiple rates:', error);
      
      // Fallback: get rates individually
      for (const currency of targetCurrencies) {
        try {
          rates[currency] = await this.getExchangeRate(baseCurrency, currency);
        } catch (err) {
          console.error(`Failed to get rate for ${currency}`);
        }
      }
    }
    
    return rates;
  }

  /**
   * Format currency amount with proper symbol and formatting
   */
  static formatCurrency(amount: number, currency: string, locale: string = 'en-NG'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbols: Record<string, string> = {
        'NGN': '₦',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥'
      };
      
      const symbol = symbols[currency] || currency;
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Get supported currencies
   */
  static getSupportedCurrencies(): string[] {
    return [
      'NGN', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 
      'CHF', 'CNY', 'ZAR', 'KES', 'GHS', 'XOF', 'XAF'
    ];
  }

  /**
   * Validate currency code
   */
  static isValidCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  /**
   * Get fallback rates for essential conversions
   */
  private static getFallbackRate(from: string, to: string): number {
    // Fallback rates (approximate, should be updated periodically)
    const fallbackRates: Record<string, Record<string, number>> = {
      'USD': {
        'NGN': 1650,
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110
      },
      'NGN': {
        'USD': 0.00061,
        'EUR': 0.00052,
        'GBP': 0.00044
      },
      'EUR': {
        'USD': 1.18,
        'NGN': 1940,
        'GBP': 0.86
      }
    };

    const rate = fallbackRates[from]?.[to];
    if (rate) {
      console.warn(`Using fallback rate for ${from} to ${to}: ${rate}`);
      return rate;
    }

    console.error(`No fallback rate available for ${from} to ${to}`);
    return 1; // Default to 1:1 as last resort
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    rateCache.clear();
  }

  /**
   * Get cached rates for debugging
   */
  static getCachedRates(): Array<{ key: string; rate: number; timestamp: number; expiry: number }> {
    return Array.from(rateCache.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
  }
}

export default CurrencyService;