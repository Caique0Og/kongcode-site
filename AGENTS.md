## Application structure
- Keep the shared Atlética header and footer in the root route, with individual content routes for home, clubs, clothing, and events so navigation and metadata remain independent.
- Use the shared category page for unpublished listings; do not fabricate products, prices, club schedules, or event dates.
- Keep fixed brand artwork as real files in public/images (referenced via src/lib/images.ts); admin uploads go to the Supabase Storage bucket "media" and centralize visual styling in the global design system.

- The /kongcode route is a standalone link-in-bio page branded "KongCode": the root route hides SiteHeader/SiteFooter for paths starting with /kongcode, and it is not listed in the site navigation. Why: the user wants it visually detached from the official Atlética site.
