# UMKM POS — Design System Master

Source: UI/UX Pro Max product/style/color/typography match (python CLI unavailable; mapped from skill CSVs).

- **Product types:** Inventory & Stock Management + Restaurant/Food Service + E-commerce (POS kiosk).
- **Primary style:** Soft UI Evolution + Flat Design + Minimalism.
- **Dashboard:** Data-dense, real-time monitoring, traffic-light stock.
- **Palette:** Productivity Tool (colors.csv #16) — teal focus, WCAG-adjusted orange CTA.
- **Type:** Friendly SaaS — Plus Jakarta Sans (typography.csv #13).
- **Density 8:** spacing 8–32px. **Motion 3:** 150–300ms, reduced-motion disable.
- **Stack:** Next.js App Router, Server Components default, Lucide outline icons, no emoji icons.
- **Touch:** min 44×44px, 8px gap, visible focus ring, press opacity 150ms.

## Tokens

| Token | Light |
| --- | --- |
| primary | #0D9488 |
| on-primary | #FFFFFF |
| accent (Pay CTA) | #EA580C |
| background | #F0FDFA |
| foreground | #134E4A |
| card | #FFFFFF |
| muted | #64748B |
| border | #99F6E4 / #E8F1F4 |
| destructive | #DC2626 |
| warn | #D97706 |
| ok | #15803D |
| sidebar | #134E4A |
| radius | 12–16px |

Anti-patterns: emoji as icons, hover-only actions, gray-on-gray, mixing filled/outline Lucide, innerWidth hamburger.
