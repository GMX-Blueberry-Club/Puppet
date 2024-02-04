import { Behavior, combineObject } from "@aelea/core"
import { $Node, $text, IBranch, component, drawLatest, eventElementTarget, nodeEvent, style, styleBehavior, styleInline } from "@aelea/dom"
import { $column, $row, Input, observer } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { join, map, mergeArray, now, snapshot, until } from "@most/core"
import { Stream } from "@most/types"
import { invertColor } from "common-utils"

export interface ISliderParams extends Input<number> {
  step?: number

  $thumb?: $Node
  disabled?: Stream<boolean>
  min?: Stream<number>
  max?: Stream<number>

  color?: Stream<string>
}


export const $defaultSliderThumb = $row(
  style({
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    position: 'absolute',
    background: pallete.background,
    borderRadius: '50px',
    cursor: 'grab',
    lineHeight: .9,
    userSelect: 'none',
    fontSize: '.75rem',
    alignItems: 'center',
    placeContent: 'center',
    transition: 'border 250ms ease-in',
    border: '2px solid red',
    // borderWidth: '2px',
    width: 38 + 'px',
    height: 38 + 'px'
  })
)

export const $Slider = ({
  value,
  color = now(pallete.primary),
  step = 0,
  disabled = now(false),
  min = now(0),
  max = now(1),
  $thumb,
}: ISliderParams) => component((
  [changeSliderDimension, changeSliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, ResizeObserverEntry>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {

  const $rangeWrapper = $row(style({ height: '2px', pointerEvents: 'none', background: pallete.background, position: 'relative' }))


  return [
    $column(style({ minHeight: '26px', zIndex: 0, touchAction: 'none', placeContent: 'center', cursor: 'pointer' }))(
      changeSliderDimensionTether(observer.resize({}), map(res => res[0])),
      thumbePositionDeltaTether(
        nodeEvent('pointerdown'),
        downSrc => {
          return snapshot((params, downEvent) => {
            const dragEnd = eventElementTarget('pointerup', window.document)
            const dragStart = eventElementTarget('pointermove', window.document)
            const drag = until(dragEnd, dragStart)
            const rectWidth = params.changeSliderDimension.contentRect.width

            const startFromBar = downEvent.target === params.changeSliderDimension.target


            if (startFromBar) {
              // @ts-ignore
              const initOffsetX = downEvent.layerX || downEvent.offsetX // Firefox uses layerX

              const initialOffset = now(Math.min(Math.max(downEvent.offsetX / rectWidth, params.min), params.max))
              const moveDelta = drawLatest(map(moveEvent => {
                const deltaX = (moveEvent.clientX - downEvent.clientX) + initOffsetX

                moveEvent.preventDefault()

                const val = deltaX / rectWidth

                const cVal = Math.min(Math.max(val, params.min), params.max)
                const steppedVal = step > 0 ? cVal / step * step : cVal

                return steppedVal
              }, drag))

              return mergeArray([initialOffset, moveDelta])
            }

            return drawLatest(map(moveEvent => {
              const normalisedValue = Math.min(Math.max(params.value, params.min), params.max)
              const deltaX = (moveEvent.clientX - downEvent.clientX) + (rectWidth * normalisedValue)

              moveEvent.preventDefault()

              const val = deltaX / rectWidth

              const cVal = Math.min(Math.max(val, params.min), params.max)
              const steppedVal = step > 0 ? cVal / step * step : cVal

              return steppedVal
            }, drag))
          }, combineObject({ value, min, max, color, changeSliderDimension }), downSrc)
        },
        join
      )
    )(
      $rangeWrapper(
        styleInline(map(params => {
          const gutterColor = colorAlpha(pallete.background, .35)
          const minArea = `${colorAlpha(params.color, .35)} ${params.min * 100}%,`
          const valArea = `${params.color} ${params.min * 100}% ${params.value * 100}%,`
          const freeArea = `${invertColor(pallete.message) } ${params.value * 100}% ${params.max * 100}%,`
          const maxArea = `${gutterColor} ${params.max * 100}%`

          const background = `linear-gradient(90deg, ${minArea} ${valArea} ${freeArea} ${maxArea}`
          return { background }
        }, combineObject({ value, min, max, color })))
      )(
        $row(
          styleInline(map(val => ({ left: `${Math.min(Math.max(val, 0), 1) * 100}%` }), value)),
          style({ width: '0px', top: '50%', position: 'absolute', transition: 'left 175ms cubic-bezier(0.25, 0.8, 0.25, 1) 0s', alignItems: 'center', placeContent: 'center' }),
        )(
          $thumb ? $thumb : $defaultSliderThumb(
            styleBehavior(map(params => {
              return params.disabled
                ? { borderColor: 'transparent', pointerEvents: params.disabled ? 'none' : 'all' }
                : { borderColor: params.color, pointerEvents: 'all' }
            }, combineObject({ disabled, color }))),
          )(
            $text(style({ paddingTop: '2px' }))(
              map(n => Math.floor(n * 100) + '%', value)
            )
          ) 
        )
      )
    ),
    {
      change: thumbePositionDelta
    }
  ]
})
