This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Demo Data Configuration

This project supports configurable demo data via a properties file:

- `config/demo.properties`

Available mode:

- `demo.dataMode=live`: use open-source APIs only
- `demo.dataMode=mock`: use local dummy data only
- `demo.dataMode=fallback`: try APIs first, fallback to dummy data when APIs are empty/unavailable

Useful properties:

- `demo.mock.destination`
- `demo.mock.country`
- `demo.mock.lat`
- `demo.mock.lon`
- `demo.mock.currency`
- `demo.mock.hotelsCount`
- `demo.mock.attractionsCount`
- `demo.mock.weatherDaysDefault`
- `demo.itinerary.mode` (`oss-ai` or `rule-based`)
- `demo.itinerary.model` (Hugging Face model id)

### Open-Source AI Itinerary

To generate itinerary via an open-source AI model, set:

- `demo.itinerary.mode=oss-ai`

And provide environment variable:

- `HUGGINGFACE_API_KEY=<your_token>`

If token is missing or model call fails, the app automatically falls back to the rule-based itinerary builder.

## Parsing and Speed Improvements

- Budget parsing now detects multiple currencies from user text (USD, EUR, GBP, AED, PKR, INR, CAD, AUD).
- Duration-only queries like "for 5 days" or "10 day trip" now default start date to today and auto-calculate end date.
- External API calls use timeouts and short in-memory caching for faster repeat loads.
- Itinerary generation and cost estimation run in parallel during planning to reduce total wait time.

## Customer-Facing Itinerary Quality

- Day-by-day itinerary now shows a provider badge:
	- `Open-source AI` when generated from open-source model
	- `Rule-based fallback` when AI provider is unavailable
- Mock fallback location is now city-aware (e.g., Lahore stays in Pakistan coordinates) to avoid impossible cross-city suggestions in demos.

### Strict Customer Demo Safety

Use these properties in `config/demo.properties`:

- `demo.strictCityValidation=true`
- `demo.maxDistanceKm=60`
- `demo.autoFallbackOnValidation=true`

What this does:

- Filters hotels/attractions by distance from destination coordinates
- Prevents obviously wrong places from appearing in another city
- Falls back to local mock items when strict filtering removes all noisy results

After changing `config/demo.properties`, restart the dev server.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
