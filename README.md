# Doro UTM Generator

Generate consistent UTM parameters for cross-market campaign tracking on [doro.com](https://www.doro.com).

A Doro version of the Xplora UTM generator, using the taxonomy from the
**Doro – UTM-tagging tool – Global – 2025** spreadsheet (PHD / Annalect).

## UTM convention

| Parameter      | Field            | Values                                                                  |
| -------------- | ---------------- | ----------------------------------------------------------------------- |
| `utm_medium`   | Channel          | `channel_objective`, e.g. `paid_social_awa`, `display_pur`, `email_crm` — locked global list |
| `utm_source`   | Publisher        | Platform / media partner, e.g. `facebook`, `programmatic`, `bonnier`    |
| `utm_campaign` | Campaign         | Free text: short, English, lowercase, words separated by `_`            |
| `utm_content`  | Creative variant | Optional, only appended when filled                                     |

Objective suffixes: `awa` awareness · `con` consideration · `pur` purchase · `crm` existing customers.

Example output:

```
https://www.doro.com/fr-fr/?utm_medium=paid_social_awa&utm_source=facebook&utm_campaign=summer&utm_content=blue_glasses
```

Landing pages default to the market sub-folder (`https://www.doro.com/{locale}/`) — 17 locales
from the [change-country page](https://www.doro.com/nb-no/change-country/) — and can be edited to any page.

Default channels and publishers live in [`lib/utm-config.ts`](lib/utm-config.ts). Per the sheet's READ ME,
add new publishers freely; coordinate channel changes with Annalect.

## Editing the dropdowns

**Manage options** (in the Campaign Details card) opens a dialog to add, rename or remove channels,
publishers and their groups. Saved lists are shared with everyone who uses the tool and marked with
an "edited" badge. **Export** / **Import** back up or restore a list as JSON; **Reset to defaults**
returns everyone to the sheet's lists. The built-in defaults live in `lib/utm-config.ts`.

## Saved URLs log

**Save** (next to Copy / Email) adds the current URL to a log at the bottom of the page. Each entry
shows when it was created, its parameters and the full URL, and has a free-text note, Copy and
Delete. **Export CSV** downloads the whole log; **Clear all** empties it for everyone.

## Shared storage

Both the option lists and the saved URLs log are stored in Supabase (the "Xplora" project, tables
`doro_utm_settings` and `doro_utm_saved_urls`) and shared by all users. The app talks to Supabase
only from its API routes (`app/api/*`) using two environment variables:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

They are set on the Vercel project for production, preview and development. For local work run
`vercel env pull .env.local`. There is no login: anyone with the URL can read and edit the shared data.

## Development

```bash
npm install
npm run dev
```

Built with Next.js (App Router), Tailwind CSS v4, shadcn/ui, `qrcode` and Supabase.
