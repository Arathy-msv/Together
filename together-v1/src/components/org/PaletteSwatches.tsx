import { BRAND_PALETTES, isHexColor, normalizeHex, type BrandPalette } from '../../lib/theme.ts'
import type { OrgBranding } from '../../lib/types.ts'

function sameColor(left: string, right: string): boolean {
  if (!isHexColor(left) || !isHexColor(right)) return false
  return normalizeHex(left) === normalizeHex(right)
}

function isSelected(branding: Pick<OrgBranding, 'primary' | 'secondary' | 'accent' | 'background'>, palette: BrandPalette): boolean {
  return (['primary', 'secondary', 'accent', 'background'] as const).every((key) => sameColor(branding[key], palette.colors[key]))
}

/** Suggested brand colours. Applying one updates the draft so the existing preview refreshes before save. */
export function PaletteSwatches({
  branding,
  onApply,
}: {
  branding: Pick<OrgBranding, 'primary' | 'secondary' | 'accent' | 'background'>
  onApply: (colors: BrandPalette['colors']) => void
}) {
  return (
    <fieldset className="palette-fieldset">
      <legend className="field-label">Suggested palettes</legend>
      <p className="help" id="palette-help">
        Each palette is built for readable contrast. Choosing one updates these colours and the live preview before you save. The colour pickers and hex fields stay available.
      </p>
      <div className="palette-row" role="group" aria-describedby="palette-help">
        {BRAND_PALETTES.map((palette) => {
          const selected = isSelected(branding, palette)
          return (
            <button
              key={palette.id}
              type="button"
              className={selected ? 'palette-swatch selected' : 'palette-swatch'}
              aria-pressed={selected}
              onClick={() => onApply(palette.colors)}
            >
              <span className="palette-chips" aria-hidden="true">
                <i style={{ background: palette.colors.primary }} />
                <i style={{ background: palette.colors.secondary }} />
                <i style={{ background: palette.colors.accent }} />
                <i style={{ background: palette.colors.background }} />
              </span>
              <span className="palette-name">{palette.name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
