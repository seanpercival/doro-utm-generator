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
publishers and their groups. Edits are stored in the browser (localStorage) and marked with an
"edited" badge. Use **Export** / **Import** to share a list as JSON, and **Reset to defaults** to
go back to the sheet's lists. To change the defaults for everyone, edit `lib/utm-config.ts`.

## Saved URLs log

**Save** (next to Copy / Email) adds the current URL to a log at the bottom of the page. Each entry
shows when it was created, its parameters and the full URL, and has a free-text note, Copy and
Delete. **Export CSV** downloads the whole log; **Clear all** empties it. Like the option lists, the log
is stored in the browser (localStorage).

## Development

```bash
npm install
npm run dev
```

Built with Next.js (App Router), Tailwind CSS v4, shadcn/ui and `qrcode`.
