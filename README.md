# Suffolk 250 Stamp Finder

A static Suffolk County America 250 passport stamp finder with a small Vercel serverless geocoder.

## Project Layout

- `public/index.html` - the app
- `public/site_data.json` - the current source data, included for editing and future data loading
- `api/geocode.js` - serverless address lookup; reads `GEOAPIFY_KEY` from Vercel
- `vercel.json` - Vercel routing/runtime config
- `package.json` - minimal project metadata

## Deploy To Vercel

1. Create a free Geoapify key at <https://www.geoapify.com/>.
2. Deploy this folder to Vercel.
3. In Vercel, open the project settings and add an environment variable:

   ```text
   GEOAPIFY_KEY=your_geoapify_key
   ```

4. Redeploy the project after adding the key.

The browser calls `/api/geocode` on your own domain. The Geoapify key stays server-side and is never exposed in `index.html`.
