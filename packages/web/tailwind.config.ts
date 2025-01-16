/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'
import plugin from 'tailwindcss/plugin'

function transformFontSize() {
  const fontSize = defaultTheme.fontSize
  const result: Record<string, [string, { lineHeight: string }]> = {}

  for (const key of Object.keys(fontSize)) {
    const value = fontSize[key]

    if (!Array.isArray(value)) {
      result[key] = value
      continue
    }

    const [size, { lineHeight }] = fontSize[key] as [string, { lineHeight: string }]
    result[key] = [
      /rem/.test(size) ? `${parseFloat(size.replace(/rem/, '')) * 16}px` : size,
      {
        lineHeight: /rem/.test(lineHeight)
          ? `${parseFloat(lineHeight.replace(/rem/, '')) * 16}px`
          : lineHeight,
      },
    ]
  }

  return result
}

function transformBorderRadius() {
  const borderRadius = defaultTheme.borderRadius
  const result: Record<string, string> = {}

  for (const key of Object.keys(borderRadius)) {
    const value = borderRadius[key]

    result[key] = /rem/.test(value) ? `${parseFloat(value.replace(/rem/, '')) * 16}px` : value
  }

  return result
}

export default {
  content: ['./src/**/*.vue'],
  theme: {
    extend: {
      spacing: Array(73)
        .fill(0)
        .reduce((map: Record<number, string>, _, index) => {
          map[index] = `${index}px`

          return map
        }, {}),
      fontSize: {
        ...Array(72)
          .fill(0)
          .reduce((map: Record<number, [string, { lineHeight: string }]>, _, index) => {
            map[index + 1] = [`${index + 1}px`, { lineHeight: '1' }]

            return map
          }, {}),
        ...transformFontSize(),
      },
      borderRadius: {
        ...Array(8)
          .fill(0)
          .reduce((map: Record<number, string>, _, index) => {
            map[index + 1] = `${index + 1}px`

            return map
          }, {}),
        ...transformBorderRadius(),
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('has-hover', '@media (hover: hover) and (pointer: fine)')
      addVariant('no-hover', '@media not all and (hover: hover) and (pointer: fine)')
    }),
  ],
}
