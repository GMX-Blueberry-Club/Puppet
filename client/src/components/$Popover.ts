import { Behavior, O, Op } from '@aelea/core'
import { $Node, $node, INode, NodeComposeFn, component, nodeEvent, style, styleBehavior } from '@aelea/dom'
import { observer } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, filter, map, merge, multicast, switchLatest, until, zip } from "@most/core"
import { Stream } from "@most/types"


interface IPocus {
  open: Stream<any>
  dismiss?: Stream<any>

  $target: $Node
  $content: $Node

  $container?: NodeComposeFn<$Node>
  margin?: number
  padding?: number
}

export const $Popover = ({ open, dismiss = empty(), $content, margin = 30, padding = 76, $container = $node, $target }: IPocus) => component((
  [overlayClick, overlayClickTether]: Behavior<INode, false>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
  [popoverContentDimension, popoverContentDimensionTether]: Behavior<INode, ResizeObserverEntry[]>,
) => {


  const $$popContentMulticast = multicast($content)

  const contentOps = O(
    popoverContentDimensionTether(
      observer.resize({})
    ),
    styleBehavior(
      zip(([contentRect], [targetRect]) => {
        const screenWidth = targetRect.rootBounds!.width
        const targetBound = targetRect.intersectionRect
        const bottomSpcace = window.innerHeight - targetBound.bottom
        const goDown = bottomSpcace > targetBound.bottom

        const top = (goDown ? targetBound.bottom + margin : targetBound.y - margin) + 'px'
        const width = Math.min(contentRect.contentRect.width, screenWidth - margin)
        const center = targetBound.x + (targetBound.width / 2)
        const centerWidth = width / 2
        const rightOffset = center - screenWidth
        const leftOffset = center - centerWidth + Math.min(rightOffset < 0 ? Math.abs(rightOffset) : 0, 0)
        const left = Math.max(leftOffset, margin) + 'px'


        return {
          top, left,
          
          transition: 'opacity .2s ease-in-out',
          transform: `translate(0, ${goDown ? '0' : '-100%'})`
        }
      }, popoverContentDimension, targetIntersection)
    ),
    style({ position: 'absolute' }),
  )


  const $popContent = constant($content, open)

  const $overlay = $node(
    style({
      position: 'fixed', zIndex: 99999,
      top: 0, left: 0, right: 0, bottom: 0, visibility: 'hidden',
    }),
    overlayClickTether(
      nodeEvent('click'),
      filter(ev => {
        if (ev.target instanceof HTMLElement) {
          const computedStyle = getComputedStyle(ev.target)
          if (computedStyle.zIndex === '99999' && computedStyle.inset === '0px'){
            return true
          }
        }
        
        return false
      }),
      constant(false)
    ),
    styleBehavior(
      zip(([contentResizeRect], [targetIntersectionRect]) => {
        const { y, x, bottom } = targetIntersectionRect.intersectionRect
        const rootWidth = targetIntersectionRect.rootBounds?.width || 0

        const width = Math.max(contentResizeRect.contentRect.width, targetIntersectionRect.intersectionRect.width) + (padding * 2) + margin
        const targetHeight = targetIntersectionRect.intersectionRect.height
        const contentHeight = contentResizeRect.contentRect.height
        const height = contentHeight + targetHeight + margin

        const placedWidth = x + contentResizeRect.contentRect.width

        const leftOffset = placedWidth > rootWidth ? rootWidth - placedWidth - 20 : 0

        const left = x + (targetIntersectionRect.intersectionRect.width / 2) + leftOffset + 'px'

        const bottomSpace = window.innerHeight - bottom
        const popDown = bottomSpace > bottom
        const top = (popDown ? y + (height / 2) : y - ((height - padding) / 2)) + 'px'

        const backgroundImage = `radial-gradient(${width}px ${height + padding * 2}px at top ${top} left ${left}, ${pallete.horizon} ${width / 2}px, ${colorAlpha(pallete.background, .45)})`


        return { backgroundImage, visibility: 'visible' }
      }, popoverContentDimension, targetIntersection)
    )
  )


  const dismissEvent = merge(overlayClick, dismiss)


  const $popover = switchLatest(
    map($nn => {
      return until(dismissEvent, $overlay(contentOps($nn)))
    }, $popContent)
  )


  const targetOp = O(
    targetIntersectionTether(
      observer.intersection(),
      // map(node => {
      //   const root = node.element instanceof HTMLElement && node.element.offsetParent || null
      //   return observer.intersection({ root })(now(node))
      // }),
      // switchLatest
    ),
    styleBehavior(
      merge(
        constant({ zIndex: 100000, position: 'relative' }, open),
        constant(null, dismissEvent)
      )
    )
  )

  return [
    $container(
      targetOp($target),
      $popover,
    ),

    { overlayClick }
  ]
})

