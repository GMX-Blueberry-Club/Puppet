import { $Node, $svg, $wrapNativeElement, attr } from "@aelea/dom"
import { IBerryDisplayTupleMap, berryPartsToSvg } from "@gambitdao/gbc-middleware"
import { tap } from "@most/core"



export function $svgContent(content: string): $Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<g>${content}</g>`, "image/svg+xml")

  // @ts-ignore
  const firstNode = Array.from(doc.firstChild?.childNodes)

  // @ts-ignore
  return firstNode.map(node => $wrapNativeElement(node)())
}


export const $berry = (
  displayTuple: Partial<IBerryDisplayTupleMap>,
) => {

  return $svg('svg')(
    attr({ xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: "xMidYMin meet", fill: 'none', viewBox: `0 0 1500 1500` })
  )(
    tap((node) => {
      node.element.innerHTML = berryPartsToSvg(displayTuple)
      return node
    })
  )()
}


