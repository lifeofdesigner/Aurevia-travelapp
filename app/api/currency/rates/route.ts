import {fetchRates} from "@/server/currency/exchange-service";

export const revalidate = 3600;

export async function GET() {
  const rates = await fetchRates("EUR");

  return Response.json(
    {
      baseCurrency: "EUR",
      fetchedAt: new Date().toISOString(),
      rates
    },
    {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600"
      }
    }
  );
}

