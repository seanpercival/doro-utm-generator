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

Channels and publishers live in [`lib/utm-config.ts`](lib/utm-config.ts). Per the sheet's READ ME,
add new publishers freely; coordinate channel changes with Annalect.

## Development

```bash
npm install
npm run dev
```

Built with Next.js (App Router), Tailwind CSS v4, shadcn/ui and `qrcode`.
