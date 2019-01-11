import { convert } from 'convert-svg-to-png'
import * as sharp from 'sharp'
import * as bezier from 'simple-bezier'
import * as SusAnalyzer from 'sus-analyzer'
import { ISusNotes } from 'sus-analyzer'
import * as builder from 'xmlbuilder'

enum NoteType {
  START = 1,
  END = 2,
  RELAY = 3,
  INFLECTION = 4,
  INV_RELAY = 5
}

// enum LaneType {
//   SHORT = 1,
//   HOLD = 2,
//   SLIDE = 3,
//   AIRACTION = 4,
//   AIR = 5
// }

interface ILongPoint {
  x: number
  y: number
}

// const shortColor = new Map<number, string>([
//   [1, '#FF3333'],
//   [2, '#FFFF33'],
//   [3, '#33CCCC'],
//   [4, '#0033FF'],
//   [5, '#FFFF33'],
//   [6, '#FFFF33'],
//   [7, '#77FF33']
// ])
// const longColor = new Map<number, string>([[2, '#FFA500'], [3, '#0033FF']])

export async function getPNG(rawSus: string): Promise<Buffer> {
  return await convert(await getSVG(rawSus), {
    puppeteer: { args: ['--no-sandbox'] }
  })
}

export async function getPNGs(rawSus: string) {
  const png = await getPNG(rawSus)
  const process = []
  const image = await sharp(png)
  const meta = await image.metadata()
  if (meta.height == null) {
    return null
  }
  const m = Math.round((meta.height - 16) / 768)
  for (let i = 0; i < m; i++) {
    process.push(
      image
        .extract({ left: 0, top: i * 768 + 32, width: 272, height: 768 })
        .toBuffer()
    )
  }
  return await Promise.all(process)
}

export async function getSVG(rawSus: string) {
  const sus = SusAnalyzer.getScore(rawSus)
  const height = 768 * sus.measure + 32

  const svg = builder.begin().ele('svg', {
    height: `${height}px`,
    version: '1.1',
    width: '272px',
    xmlns: 'http://www.w3.org/2000/svg'
  })
  svg
    .ele('linearGradient', { id: 'hold', x1: '0', y1: '0', x2: '0', y2: '1' })
    .ele('stop', {
      offset: '0%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '25%',
      'stop-color': '#F6FF4C',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '75%',
      'stop-color': '#F6FF4C',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '100%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()
  svg
    .ele('linearGradient', { id: 'slide', x1: '0', y1: '0', x2: '0', y2: '1' })
    .ele('stop', {
      offset: '0%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '25%',
      'stop-color': '#4CD5FF',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '75%',
      'stop-color': '#4CD5FF',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '100%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()

  sus.shortNotes = sus.shortNotes.map(note => ({
    ...note,
    position: note.tick + 8
  }))
  sus.holdNotes = sus.holdNotes.map(longNotes =>
    longNotes.map(note => ({ ...note, tick: note.tick + 8 }))
  )
  sus.slideNotes = sus.slideNotes.map(longNotes =>
    longNotes.map(note => ({ ...note, tick: note.tick + 8 }))
  )
  sus.airActionNotes = sus.airActionNotes.map(longNotes =>
    longNotes.map(note => ({ ...note, tick: note.tick + 8 }))
  )
  sus.airNotes = sus.airNotes.map(note => ({
    ...note,
    position: note.tick + 8
  }))

  const score = svg.ele('g', { id: 'score' })
  const base = score.ele('g', { id: 'base' })

  // ベース描画
  base.ele('rect', {
    fill: '#000000',
    height: `${height}px`,
    id: 'base_black',
    width: '272px',
    x: '0',
    y: '0'
  })

  // レーン描画
  const laneLine = base.ele('g', { id: 'lane_line' })
  for (let i = 0; i <= 8; i++) {
    laneLine.ele('line', {
      stroke: '#888888',
      'stroke-width': '1px',
      x1: `${32 * i + 8}px`,
      x2: `${32 * i + 8}px`,
      y1: '0px',
      y2: `${height}px`
    })
  }

  // 小節線描画
  const measureLine = base.ele('g', { id: 'measure_line' })
  for (let i = 0; i < sus.measure + 1; i++) {
    measureLine.ele('line', {
      stroke: '#FFFFFF',
      'stroke-width': '2px',
      x1: `0px`,
      x2: `272px`,
      y1: `${height - (i * 768 + 16)}px`,
      y2: `${height - (i * 768 + 16)}px`
    })
  }

  // 拍線描画
  const beatLine = base.ele('g', { id: 'beat_line' })
  sus.BEATs.forEach((beat, index) => {
    for (let i = 0; i < beat; i++) {
      beatLine.ele('line', {
        stroke: '#FFFFFF',
        'stroke-width': '1px',
        x1: `0px`,
        x2: `272px`,
        y1: `${height - (768 * index + (768 / beat) * i + 16)}px`,
        y2: `${height - (768 * index + (768 / beat) * i + 16)}px`
      })
    }
  })

  const notes = score.ele('g', { id: 'notes' })

  // HOLD SLIDE ベース
  const long = notes.ele('g', { id: 'long' })
  const longBase = long.ele('g', { id: 'longBase' })
  const longBaseHold = longBase.ele('g', { id: 'longBaseHold' })
  const longBaseSlide = longBase.ele('g', { id: 'longBaseSlide' })

  drawLongBase(sus.holdNotes, height).forEach(d =>
    longBaseHold.ele('path', { d, fill: 'url(#hold)' })
  )

  drawLongBase(sus.slideNotes, height).forEach(d =>
    longBaseSlide.ele('path', { d, fill: 'url(#slide)' })
  )

  // SLIDE 線
  const longLine = long.ele('g', { id: 'long_line' })

  drawLongLine(sus.slideNotes, height).forEach(d =>
    longLine.ele('path', { d, fill: '#4CD5FF' })
  )

  return svg.end({
    allowEmpty: false,
    indent: '  ',
    newline: '\n',
    pretty: true,
    spacebeforeslash: ''
  })
}

function drawLongBase(laneNotes: ISusNotes[][], height: number): string[] {
  const d: string[] = []
  laneNotes.forEach(longNotes => {
    // 可視中継点で分割（色分けの為）
    const colorBlocks = longNotes.reduce(
      (list, note) => {
        list[list.length - 1].push({ ...note })
        if (note.noteType !== NoteType.RELAY) {
          return list
        }
        list.push([])
        list[list.length - 1].push({ ...note })
        return list
      },
      [[]] as ISusNotes[][]
    )

    colorBlocks.forEach(colorBlock => {
      // ノーツがある場合ベースの位置を8pxずらす
      if (
        [NoteType.START, NoteType.RELAY].indexOf(colorBlock[0].noteType) > -1
      ) {
        colorBlock[0].tick += 8
      }
      if (
        [NoteType.END, NoteType.RELAY].indexOf(
          colorBlock[colorBlock.length - 1].noteType
        ) > -1
      ) {
        colorBlock[colorBlock.length - 1].tick -= 8
      }

      // 不可視中継点で分割（ベジェ判定の為）
      const bases = colorBlock.reduce(
        (list, note) => {
          list[list.length - 1].push({ ...note })
          if (note.noteType !== NoteType.INV_RELAY) {
            return list
          }
          list.push([])
          list[list.length - 1].push({ ...note })
          return list
        },
        [[]] as ISusNotes[][]
      )

      const points = bases.reduce(
        (list, notes) => {
          if (
            notes.length > 2 &&
            notes.some(n => n.noteType === NoteType.INFLECTION)
          ) {
            // ベジェ
            const n1 = notes.map(n => [
              n.lane * 16 + 8 + 4,
              n.measure * 768 + n.tick + 8
            ])
            const n2 = notes.map(n => [
              n.lane * 16 + 8 + n.width * 16 - 4,
              n.measure * 768 + n.tick + 8
            ])

            bezier(n1, 100).forEach((c: number[]) =>
              list[0].push({ x: c[0], y: height - c[1] })
            )
            bezier(n2, 100).forEach((c: number[]) =>
              list[1].push({ x: c[0], y: height - c[1] })
            )
          } else {
            // 直線
            notes.forEach(note => {
              list[0].push({
                x: note.lane * 16 + 8 + 4,
                y: height - (note.measure * 768 + note.tick + 8)
              })
              list[1].push({
                x: note.lane * 16 + 8 + note.width * 16 - 4,
                y: height - (note.measure * 768 + note.tick + 8)
              })
            })
          }
          return list
        },
        [[], []] as ILongPoint[][]
      )

      let data = 'M'

      points[0].forEach(point => (data += `${point.x} ${point.y} L`))
      points[1].reverse().forEach(point => (data += `${point.x} ${point.y} L`))

      d.push(data.slice(0, -1) + 'z')
    })
  })
  return d
}

function drawLongLine(laneNotes: ISusNotes[][], height: number): string[] {
  const d: string[] = []
  laneNotes.forEach(longNotes => {
    // 可視中継点で分割（色分けの為）
    const colorBlocks = longNotes.reduce(
      (list, note) => {
        list[list.length - 1].push({ ...note })
        if (note.noteType !== NoteType.RELAY) {
          return list
        }
        list.push([])
        list[list.length - 1].push({ ...note })
        return list
      },
      [[]] as ISusNotes[][]
    )

    colorBlocks.forEach(colorBlock => {
      // ノーツがある場合ベースの位置を8pxずらす
      if (
        [NoteType.START, NoteType.RELAY].indexOf(colorBlock[0].noteType) > -1
      ) {
        colorBlock[0].tick += 8
      }
      if (
        [NoteType.END, NoteType.RELAY].indexOf(
          colorBlock[colorBlock.length - 1].noteType
        ) > -1
      ) {
        colorBlock[colorBlock.length - 1].tick -= 8
      }

      // 不可視中継点で分割（ベジェ判定の為）
      const bases = colorBlock.reduce(
        (list, note) => {
          list[list.length - 1].push({ ...note })
          if (note.noteType !== NoteType.INV_RELAY) {
            return list
          }
          list.push([])
          list[list.length - 1].push({ ...note })
          return list
        },
        [[]] as ISusNotes[][]
      )

      const points = bases.reduce(
        (list, notes) => {
          if (notes.length > 2 && notes.some(n => n.noteType === 4)) {
            // ベジェ
            const n1 = notes.map(n => [
              n.lane * 16 + 8 + (n.width * 16) / 2 - 3,
              n.measure * 768 + n.tick + 8
            ])
            const n2 = notes.map(n => [
              n.lane * 16 + 8 + (n.width * 16) / 2 + 3,
              n.measure * 768 + n.tick + 8
            ])

            const b1: number[][] = bezier(n1, 100)
            const b2: number[][] = bezier(n2, 100)
            b1.forEach(c => list[0].push({ x: c[0], y: height - c[1] }))
            b2.forEach(c => list[1].push({ x: c[0], y: height - c[1] }))
          } else {
            // 直線
            notes.forEach(note => {
              list[0].push({
                x: note.lane * 16 + 8 + (note.width * 16) / 2 - 3,
                y: height - (note.measure * 768 + note.tick + 8)
              })
              list[1].push({
                x: note.lane * 16 + 8 + (note.width * 16) / 2 + 3,
                y: height - (note.measure * 768 + note.tick + 8)
              })
            })
          }
          return list
        },
        [[], []] as ILongPoint[][]
      )

      let data = 'M'

      points[0].forEach(point => (data += `${point.x} ${point.y} L`))
      points[1].reverse().forEach(point => (data += `${point.x} ${point.y} L`))

      d.push(data.slice(0, -1) + 'z')
    })
  })
  return d
}

// function drawNotes(parent, x, y, width, color, line) {
//   const notes = parent.ele('g', { class: 'notes' })
//   notes.ele('rect', {
//     x: x + 2,
//     y: y - 16,
//     rx: '4px',
//     ry: '4px',
//     width: `${width * 16 - 4}px`,
//     height: '16px',
//     fill: color,
//     stroke: '#FFFFFF',
//     'stroke-width': '3px'
//   })
//   if (line) {
//     notes.ele('path', {
//       d: `M${x + 8},${y - 8} L${x + width * 16 - 8},${y - 8}`,
//       stroke: '#FFFFFF',
//       'stroke-width': '3px'
//     })
//   }
// }
