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

- Data lives in the user's own CivicTrace Supabase project via src/lib/civictrace.ts (not Lovable Cloud) — it is shared with the official dashboard. Schema is in supabase-setup/civictrace.sql and must be run by the user.
- Serve branding images from public/ with root-relative paths so external hosts such as Vercel do not depend on Lovable's asset proxy.
- Keep public interface translations in src/lib/translations.ts and language state in a root-level LanguageProvider; translate stored enum values only when displaying them so switching never remounts forms or alters event payloads.
