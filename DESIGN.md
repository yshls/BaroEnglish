# baro Design System

> Headspace-inspired warm, calm brand identity for baro (바로영어)

## Brand Personality

Calm, warm, approachable. Cream panels instead of cold whites. Deep blue
primary CTA against warm neutrals. Limited palette — confidence through
restraint, not variety.

---

## Color Tokens

### Primary

| Token           | Hex       | Usage                                   |
|-----------------|-----------|-----------------------------------------|
| primary         | `#0061ef` | Main CTA, search, listening, brand blue |
| action-focus    | `#0040ea` | Hover / focus ring on primary actions    |
| primary-pressed | `#0000db` | Pressed / active state                   |
| on-primary      | `#ffffff` | Text & icons on primary fill             |

### Surfaces & Backgrounds

| Token        | Hex       | Usage                             |
|--------------|-----------|-----------------------------------|
| cream        | `#f9f4f2` | Panel / page background           |
| canvas       | `#ffffff` | Card / elevated surface           |
| soft-hover   | `#e5e7ec` | Hover state on cream surfaces     |
| dark-hover   | `#141313` | Hover on dark actions             |

### Text / Ink

| Token         | Hex       | Usage                                        |
|---------------|-----------|----------------------------------------------|
| foreground    | `#2d2c2b` | Paragraph ink, hero action fill, nav text    |
| slate         | `#44423f` | Cream action label, footer links             |
| inherited-ink | `#4b4c4d` | Computed controls, muted text                |
| ink-pure      | `#000000` | Maximum contrast (sparingly)                 |

### Borders

| Token        | Hex       | Usage                        |
|--------------|-----------|------------------------------|
| border-tan   | `#e2ded9` | Card & section dividers      |
| border-input | `#d2d5de` | Form input borders           |

### Accent Colors

| Token  | Hex       | Usage                                 |
|--------|-----------|---------------------------------------|
| gold   | `#ffce00` | Bookmarks, favorites, yellow accent   |
| pink   | `#ffa1cc` | Shorts, recording, soft pink          |
| purple | `#3b197f` | Speaking, fast playback, deep purple  |

### Validation

| Token | Hex       | Usage        |
|-------|-----------|--------------|
| error | `#e01919` | Error states |

---

## Radius

| Token | Value | Usage                   |
|-------|-------|-------------------------|
| none  | 0px   | Sharp corners           |
| sm    | 8px   | Buttons, small controls |
| card  | 16px  | Cards, panels           |
| tab   | 24px  | Tab pills               |
| pill  | 32px  | Full-round pills        |

## Shadows

- Button primary rest: `rgba(65, 61, 69, 0.2) 0px 2px 0px 0px`

## Motion

- Duration: 150ms
- Easing: `cubic-bezier(0.32, 0.94, 0.6, 1)`

## Typography

- App font: Spoqa Han Sans Neo (Korean + Latin)
- Weights: 400 (regular), 500 (medium), 700 (bold)
