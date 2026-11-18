<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application structure
- Keep the shared Atlética header and footer in the root route, with individual content routes for home, clubs, clothing, and events so navigation and metadata remain independent.
- Use the shared category page for unpublished listings; do not fabricate products, prices, club schedules, or event dates.
- Reference uploaded brand artwork through asset pointers and centralize visual styling in the global design system.

- The /kongcode route is a standalone link-in-bio page branded "KongCode": the root route hides SiteHeader/SiteFooter for paths starting with /kongcode, and it is not listed in the site navigation. Why: the user wants it visually detached from the official Atlética site.
