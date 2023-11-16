import { $Branch, $text, attr, style } from "@aelea/dom"
import { $ButtonIcon, $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { IToken, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { $anchor, $calendar, $caretDblDown, $ethScan } from "gmx-middleware-ui-components"
import { getAccountExplorerUrl, getTxExplorerUrl, shortenAddress } from "gmx-middleware-utils"
import { Address } from "viem"
import { $berryByToken } from "../../components/$common.js"
import { $trash } from "./$icons.js"

export const $TrashBtn = $ButtonIcon($trash)

export const boxShadow = theme.name === 'dark'
  ? 'rgb(0 0 0 / 25%) 0px 0px 1px, rgb(0 0 0 / 15%) 0px 15px 20px, rgb(0 0 0 / 8%) 0px 1px 12px'
  : 'rgb(0 0 0 / 25%) 0px 0px 1px, rgb(59 60 74 / 15%) 0px 15px 20px, rgb(0 0 0 / 8%) 0px 1px 12px'

export const $card = $column(layoutSheet.spacing,
  style({ borderRadius: '20px', boxShadow: boxShadow, padding: screenUtils.isDesktopScreen ? '36px': '12px', backgroundColor: pallete.background })
)


export const $card2 = $column(layoutSheet.spacing,
  style({
    borderRadius: '20px', padding: '20px',
    backgroundColor: pallete.middleground,
    boxShadow: 'rgb(0 0 0 / 25%) 0px 0px 1px, rgb(0 0 0 / 15%) 0px 15px 20px, rgb(0 0 0 / 8%) 0px 1px 12px',
  })
)

export const $seperator = $text(style({ color: pallete.foreground, pointerEvents: 'none' }))('|')
export const $responsiveFlex = screenUtils.isDesktopScreen ? $row : $column


function convertMsToGoogleCalendarDate(ms: Date) {
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2)
  const day = ("0" + date.getUTCDate()).slice(-2)
  const hours = ("0" + date.getUTCHours()).slice(-2)
  const minutes = ("0" + date.getUTCMinutes()).slice(-2)
  const seconds = ("0" + date.getUTCSeconds()).slice(-2)

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}


export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${colorAlpha(pallete.foreground, .2)}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '.85rem' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${colorAlpha(pallete.foreground, .2)}` }))(),
  )
}

// <a class="atc-link icon-google" target="_blank" href=">Google Calendar</a>

// 				<a class="atc-link icon-ical" target="_blank" href="">iCal Calendar</a>


export interface IAddtoCalendarButton {
  time: Date
  title: string
  description?: string
  location?: string
}

export const $addToCalendar = (config: IAddtoCalendarButton) => {

  const isApple = ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  const href = isApple
    ? `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
  VERSION:2.0
  BEGIN:VEVENT
  URL:${document.location.href}
  DTSTART:${config.time.toISOString()}
  DTEND:${config.time.toISOString()}
  SUMMARY:${config.title}
  DESCRIPTION:${config.description ? encodeURIComponent(config.description) : ''}
  ${config.location ? 'LOCATION:' + config.location : ''}
  ${config.description ? `LOCATION:${encodeURIComponent(config.description)}` : ''}
  END:VEVENT
  END:VCALENDAR`
    : `http://www.google.com/calendar/render?
action=TEMPLATE
&text=${config.title}
&dates=${convertMsToGoogleCalendarDate(config.time)}/${convertMsToGoogleCalendarDate(config.time)}
${config.description ? `&details=${encodeURIComponent(config.description)}` : ''}
${config.location ? '&location=' + config.location : ''}
&trp=false
&sprop=
&sprop=name:`


  return $anchor(attr({ href, target: '_blank' }), style({ padding: '0 4px', backgroundColor: pallete.background, border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }))(
    $icon({ $content: $calendar, width: '22px', viewBox: `0 0 32 32` })
  )
}



export const $iconCircular = ($iconPath: $Branch<SVGPathElement>, size = '32px') => {
  return $icon({
    $content: $iconPath,
    svgOps: style({
      padding: '6px', zIndex: 10, borderRadius: '50%', border: `1px solid ${colorAlpha(pallete.foreground, .25)}`,
      width: size, aspectRatio: '1 / 1', height: 'auto', fontSize: '11px', textAlign: 'center', lineHeight: '15px', fontWeight: 'bold', color: pallete.message,
    }),
    viewBox: '0 0 32 32'
  })
}



export const $accountRef = (id: Address) => $anchor(attr({ href: getAccountExplorerUrl(LAB_CHAIN, id) }))(
  $text(style({}))(`${shortenAddress(id)}`)
)


export const $accountIconLink = (address: Address) => $anchor(attr({ href: getAccountExplorerUrl(LAB_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24', svgOps: style({ margin: '3px 4px 0 0' }) }),
  $text(style({}))(`${shortenAddress(address)} `),
)

export const $txnIconLink = (hash: string) => $anchor(attr({ href: getTxExplorerUrl(LAB_CHAIN, hash) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)


export interface ITeamMember {
  name: string
  title: string
  token: IToken
}

export const $teamMember = ({ name, title, token }: ITeamMember) => {
  return $column(layoutSheet.spacing, style({ alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '.85rem' }))(
    $berryByToken(token),
    $column(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      $anchor(attr(({ href: `https://twitter.com/${name}` })), style({ fontWeight: 900, textDecoration: 'none', fontSize: '1em' }))($text(`@${name}`)),
      $text(style({ fontSize: '.85rem', color: pallete.foreground, textAlign: 'center', lineHeight: '1.3' }))(title),
    )
  )
}
