import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { CurrencyService } from "@/lib/currency";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from')?.toUpperCase() || 'NGN';
    const to = searchParams.get('to')?.toUpperCase() || 'USD';
    const amount = parseFloat(searchParams.get('amount') || '1');

    // Validate currencies
    if (!CurrencyService.isValidCurrency(from) || !CurrencyService.isValidCurrency(to)) {
      return NextResponse.json(
        { 
          error: "Invalid currency code",
          supportedCurrencies: CurrencyService.getSupportedCurrencies()
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    try {
      const exchangeRate = await CurrencyService.getExchangeRate(from, to);
      const convertedAmount = await CurrencyService.convertAmount(amount, from, to);
      const formattedOriginal = CurrencyService.formatCurrency(amount, from);
      const formattedConverted = CurrencyService.formatCurrency(convertedAmount, to);

      return NextResponse.json({
        conversion: {
          from: {
            currency: from,
            amount,
            formatted: formattedOriginal
          },
          to: {
            currency: to,
            amount: convertedAmount,
            formatted: formattedConverted
          },
          rate: exchangeRate,
          timestamp: new Date(),
          rateAge: "Current" // Could be enhanced to show actual cache age
        },
        supportedCurrencies: CurrencyService.getSupportedCurrencies()
      });

    } catch (conversionError) {
      console.error("Currency conversion error:", conversionError);
      return NextResponse.json(
        { 
          error: "Failed to get current exchange rates. Please try again later.",
          fallbackUsed: false
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error("Error in currency conversion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { baseCurrency, targetCurrencies, amounts } = body;

    // Validate base currency
    if (!baseCurrency || !CurrencyService.isValidCurrency(baseCurrency)) {
      return NextResponse.json(
        { error: "Invalid base currency" },
        { status: 400 }
      );
    }

    // Validate target currencies
    if (!Array.isArray(targetCurrencies) || targetCurrencies.length === 0) {
      return NextResponse.json(
        { error: "Target currencies must be a non-empty array" },
        { status: 400 }
      );
    }

    const invalidCurrencies = targetCurrencies.filter(curr => !CurrencyService.isValidCurrency(curr));
    if (invalidCurrencies.length > 0) {
      return NextResponse.json(
        { 
          error: "Invalid target currencies",
          invalidCurrencies,
          supportedCurrencies: CurrencyService.getSupportedCurrencies()
        },
        { status: 400 }
      );
    }

    try {
      // Get multiple rates at once
      const rates = await CurrencyService.getMultipleRates(baseCurrency, targetCurrencies);
      
      // Convert amounts if provided
      const conversions: any = {};
      
      if (amounts && typeof amounts === 'object') {
        for (const [currency, amount] of Object.entries(amounts)) {
          if (targetCurrencies.includes(currency) && typeof amount === 'number' && amount > 0) {
            const rate = rates[currency];
            if (rate) {
              conversions[currency] = {
                originalAmount: amount,
                convertedAmount: amount * rate,
                rate,
                formattedOriginal: CurrencyService.formatCurrency(amount, baseCurrency),
                formattedConverted: CurrencyService.formatCurrency(amount * rate, currency)
              };
            }
          }
        }
      }

      return NextResponse.json({
        baseCurrency,
        rates,
        conversions: Object.keys(conversions).length > 0 ? conversions : undefined,
        timestamp: new Date(),
        cachedRates: CurrencyService.getCachedRates().map(cache => ({
          pair: cache.key,
          rate: cache.rate,
          cachedAt: new Date(cache.timestamp),
          expiresAt: new Date(cache.expiry)
        }))
      });

    } catch (ratesError) {
      console.error("Error getting multiple rates:", ratesError);
      return NextResponse.json(
        { error: "Failed to fetch exchange rates" },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error("Error in bulk currency conversion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Clear currency cache (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can clear cache
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can clear currency cache" },
        { status: 403 }
      );
    }

    CurrencyService.clearCache();
    
    return NextResponse.json({
      message: "Currency cache cleared successfully",
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Error clearing currency cache:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}