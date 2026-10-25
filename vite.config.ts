import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

function flattenLegacyCssLayers(css: string): string {
  let output = ''
  let cursor = 0
  const layerPattern = /@layer\s+[^;{]+([;{])/g

  while (cursor < css.length) {
    layerPattern.lastIndex = cursor
    const match = layerPattern.exec(css)
    if (!match) return output + css.slice(cursor)

    output += css.slice(cursor, match.index)
    if (match[1] === ';') {
      cursor = layerPattern.lastIndex
      continue
    }

    const openingBrace = layerPattern.lastIndex - 1
    let depth = 1
    let closingBrace = openingBrace + 1
    while (closingBrace < css.length && depth > 0) {
      if (css[closingBrace] === '{') depth += 1
      if (css[closingBrace] === '}') depth -= 1
      closingBrace += 1
    }

    output += flattenLegacyCssLayers(css.slice(openingBrace + 1, closingBrace - 1))
    cursor = closingBrace
  }

  return output
}

function androidSevenCssCompatibility() {
  return {
    name: 'android-seven-css-compatibility',
    enforce: 'post' as const,
    generateBundle(_options: unknown, bundle: Record<string, { type: string; fileName: string; source?: string | Uint8Array }>) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.css') || asset.source === undefined) continue
        let css = flattenLegacyCssLayers(String(asset.source))
        css = css
          .replace(/padding-inline:([^;}]+)/g, 'padding-left:$1;padding-right:$1')
          .replace(/padding-block:([^;}]+)/g, 'padding-top:$1;padding-bottom:$1')
          .replace(/margin-inline:([^;}]+)/g, 'margin-left:$1;margin-right:$1')
          .replace(/margin-block:([^;}]+)/g, 'margin-top:$1;margin-bottom:$1')
          .replace(/(^|[;{])gap:([^;}]+)/g, '$1grid-gap:$2;gap:$2')
        asset.source = css
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), androidSevenCssCompatibility()],
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: { chrome: 63 << 16 },
    },
  },
  build: {
    // The dedicated Android 7 tablet currently runs a Chromium 63 WebView.
    target: 'chrome63',
    cssTarget: 'chrome63',
    cssMinify: 'lightningcss',
  },
})
