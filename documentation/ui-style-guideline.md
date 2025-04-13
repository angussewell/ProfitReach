# UI Style Guidelines

This document outlines the standard UI components and styles used throughout the application, ensuring consistency across all interfaces.

## Buttons

### Variants

- `default`: Light gray background (`bg-neutral-100`), thick dark border (`border-2 border-neutral-500`), bold font (`font-semibold`). Primary action style.
  ```
  bg-neutral-100 text-neutral-900 font-semibold border-2 border-neutral-500 shadow-sm hover:border-neutral-700 hover:shadow
  ```

- `secondary`: White background, same thick dark border as default (`border-2 border-neutral-500`). Secondary action style.
  ```
  bg-white text-neutral-800 font-medium border-2 border-neutral-500 hover:border-neutral-700 hover:bg-neutral-50
  ```

- `outline`: White background, same thick dark border as default/secondary (`border-2 border-neutral-500`). Alternative action style.
  ```
  bg-white text-neutral-800 font-medium border-2 border-neutral-500 hover:border-neutral-700 hover:bg-neutral-50
  ```
  *(Note: Visually identical to secondary currently)*

- `destructive`: White background, red text, thick red border (`border-2 border-red-500`). For destructive actions.
  ```
  bg-white text-red-700 font-medium border-2 border-red-500 hover:bg-red-50 hover:border-red-700 focus-visible:ring-destructive
  ```

- `ghost`: Transparent background, no border. For subtle actions or icons.
  ```
  text-gray-700 hover:bg-gray-100 border border-transparent
  ```

- `link`: Standard text link style.
  ```
  text-blue-600 underline-offset-4 hover:underline
  ```

- `brand-gradient-warm`: Subtle warm gradient background (RGBA 15%), dark red text (`text-[#ab213e]`), consistent border. For specific branded CTAs.
  ```
  text-[#ab213e] font-medium border-2 border-neutral-500 shadow-sm hover:border-neutral-700 hover:shadow [background-image:linear-gradient(to_top_right,rgba(237,173,82,0.15),rgba(233,61,61,0.15),rgba(171,33,62,0.15))]
  ```
  - Uses a subtle light gradient wash with signature warm colors (#edad52, #e93d3d, #ab213e) applied with 15% opacity.
  - Text color is the darkest shade from the warm brand palette.
  - Shares border style with default/outline for cohesion.

- `brand-gradient-cold`: Subtle cold gradient background (RGBA 15%), dark blue text (`text-[#092843]`), consistent border. For specific branded CTAs.
  ```
  text-[#092843] font-medium border-2 border-neutral-500 shadow-sm hover:border-neutral-700 hover:shadow [background-image:linear-gradient(to_top_right,rgba(83,181,217,0.15),rgba(27,79,117,0.15),rgba(9,40,67,0.15))]
  ```
  - Uses a subtle light gradient wash with signature cold colors (#53b5d9, #1b4f75, #092843) applied with 15% opacity.
  - Text color is the darkest shade from the cold brand palette.
  - Shares border style with default/outline for cohesion.


### Sizes

- `sm`: Compact size.
  ```
  h-9 px-3 py-1.5 text-sm rounded-lg
  ```
- `default`: Standard size.
  ```
  h-10 px-5 py-2 rounded-lg
  ```
- `lg`: Large size for emphasis.
  ```
  h-12 px-6 py-2.5 rounded-lg
  ```
- `icon`: Square size for icon-only buttons.
  ```
  h-10 w-10 p-2 rounded-lg flex items-center justify-center
  ```
  - Icons should use `w-5 h-5` (1.25em).

### Base Styles & Interaction

All buttons share these base styles and interactions:
```
inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] focus:scale-[1.02]
```
- Includes subtle scale transform on hover/focus.

### Implementation

Use the Button component:

```jsx
import { Button } from "@/components/ui/button";

// Examples
<Button variant="default">Default Button</Button>
<Button variant="secondary" size="sm">Small Secondary</Button>
<Button variant="brand-gradient-warm" size="lg">Large Subtle Gradient CTA</Button> 
<Button variant="ghost" size="icon"><TrashIcon className="h-5 w-5" /></Button>
```

## Cards

Cards provide a visually distinct container for content sections.

### Card Components

- **Card Container**: `<Card />` (Shadcn/ui)
  ```
  bg-white text-card-foreground rounded-lg border-2 border-gray-200 p-5 shadow-[0_2px_3px_rgba(0,0,0,0.05)]
  ```
  - White background, rounded corners, subtle shadow, and a visible border.

- **Card Header**: `<CardHeader />`
  ```
  flex flex-col space-y-1.5 p-1
  ```
- **Card Title**: `<CardTitle />`
  ```
  text-lg font-semibold leading-none tracking-tight
  ```
- **Card Description**: `<CardDescription />`
  ```
  text-sm text-muted-foreground
  ```
- **Card Content**: `<CardContent />`
  ```
  pt-0 px-1
  ```
- **Card Footer**: `<CardFooter />`
  ```
  flex items-center pt-4 px-1
  ```

### Implementation

```jsx
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    <Button variant="default">Action</Button>
  </CardFooter>
</Card>
```

## Brand Colors & Gradients (CSS Variables)

Defined in `src/app/globals.css` within `:root`.

### Warm Gradient
- `--brand-warm-start: #edad52`
- `--brand-warm-middle: #e93d3d`
- `--brand-warm-end: #ab213e`

### Cold Gradient
- `--brand-cold-start: #53b5d9`
- `--brand-cold-middle: #1b4f75`
- `--brand-cold-end: #092843`

## Typography

- Headings: font-semibold tracking-tight
  - Page titles: text-2xl
  - Section headers: text-xl
  - Card titles: text-lg
- Body text: text-sm or text-base
- Subtle text: text-sm text-muted-foreground
