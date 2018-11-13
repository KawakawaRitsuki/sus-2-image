const SusAnalyzer = require('sus-analyzer')
const bezier = require('simple-bezier')
const sharp = require('sharp')
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

module.exports.getMeasures = async sus => {
  const images = (await module.exports.getImages(sus)).reverse()
  let process = []
  for(let i = 0; i < images.length; i++) {
    const image = await sharp(Buffer.from(images[i].split(',')[1], 'base64'))
    const m = ((await image.metadata()).height - 16) / 768
    for(let j = 0; j < m; j++)
      process.push(image.extract({ left: 0, top: j*768, width: 272, height: 768 }).toBuffer())
  }
  const buffers = await Promise.all(process)
  const measures = []
  for(let i = 0; i < buffers.length; i++)
    measures.push("data:image/png;base64," + buffers[i].toString('base64'))
  return measures
}

module.exports.getImages = async raw_sus => {
  const sus = SusAnalyzer.getData(raw_sus)

  const image = {
    1: {
      1: {
        left:   await loadImage(path.join(__dirname, 'asset', 'tap-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'tap-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'tap-right.png'))
      },
      2: {
        left:   await loadImage(path.join(__dirname, 'asset', 'extap-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'extap-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'extap-right.png'))
      },
      3: {
        left:   await loadImage(path.join(__dirname, 'asset', 'flick-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'flick-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'flick-right.png'))
      },
      4: {
        left:   await loadImage(path.join(__dirname, 'asset', 'hell-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'hell-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'hell-right.png'))
      },
      5: {
        left:   await loadImage(path.join(__dirname, 'asset', 'extap-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'extap-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'extap-right.png'))
      },
      6: {
        left:   await loadImage(path.join(__dirname, 'asset', 'extap-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'extap-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'extap-right.png'))
      },
      7: {
        left:   await loadImage(path.join(__dirname, 'asset', 'air-left.png')),
        center: await loadImage(path.join(__dirname, 'asset', 'air-center.png')),
        right:  await loadImage(path.join(__dirname, 'asset', 'air-right.png'))
      }
    },
    2: {
      left:   await loadImage(path.join(__dirname, 'asset', 'hold-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'hold-center.png')),
      step:   await loadImage(path.join(__dirname, 'asset', 'hold-step-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'hold-right.png'))
    },
    3: {
      left:   await loadImage(path.join(__dirname, 'asset', 'slide-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'slide-center.png')),
      step:   await loadImage(path.join(__dirname, 'asset', 'slide-step-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'slide-right.png'))
    },
    4: {
      left:   await loadImage(path.join(__dirname, 'asset', 'air-action-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'air-action-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'air-action-right.png'))
    },
    5: {
      1: await loadImage(path.join(__dirname, 'asset', 'air-up.png')),
      2: await loadImage(path.join(__dirname, 'asset', 'air-down.png')),
      3: await loadImage(path.join(__dirname, 'asset', 'air-up-left.png')),
      4: await loadImage(path.join(__dirname, 'asset', 'air-up-right.png')),
      5: await loadImage(path.join(__dirname, 'asset', 'air-down-left.png')),
      6: await loadImage(path.join(__dirname, 'asset', 'air-down-right.png')),
      7: await loadImage(path.join(__dirname, 'asset', 'air-up.png')),
      8: await loadImage(path.join(__dirname, 'asset', 'air-up-left.png')),
      9: await loadImage(path.join(__dirname, 'asset', 'air-up-right.png'))
    }
  }

  const measure = await loadImage(path.join(__dirname, 'asset', 'measure.png'))
  const split = await loadImage(path.join(__dirname, 'asset', 'split.png'))

  sus.shortNotes = sus.shortNotes.map(note => {
    note.position = 768 / sus.BEATs[note.measure] / 192 * note.position
    return note
  })

  sus.longNotes = sus.longNotes.map(long => {
    long.notes = long.notes.map(note => {
      note.position = 768 / sus.BEATs[note.measure] / 192 * note.position
      return note
    })
    return long
  })

  const images = []
  sus.measure++

  for(let count = 0; count < Math.ceil(sus.measure / 40); count++){
    let a = ((count+1) * 40) > sus.measure ? sus.measure : (count+1) * 40
    let b = count*40

    const canvas = createCanvas(272, 768 * (a - b) + 16)
    const ctx = canvas.getContext('2d')

    ctx.scale(1, -1)
    ctx.translate(0,8+a*-768 )

    // 小節線描画
    for(let i = -1; i < sus.measure; i++) ctx.drawImage(measure, 0, i*768 + 8)

    // 拍線描画
    sus.BEATs.forEach((beat, index) => {
      const base = 768 * index
      for(let i = 1; i < beat; i++)
        ctx.drawImage(split, 0, 768 * index + 768/beat*i + 8)
    })

    // HOLD/SLIDE ベース
    sus.longNotes.filter(long => long.type !== 4)
      .forEach(longNotes => {

        // 可視中継点で分割（色分けの為）
        const colorBlocks = longNotes.notes.reduce((list,note) => {
          list[list.length - 1].push(Object.assign({},note))
          if(note.note_type !== 3) return list
          list.push([])
          list[list.length - 1].push(Object.assign({},note))
          return list
        },[[]])

        colorBlocks.forEach(colorBlock => {

          // 不可視中継点で分割（ベジェ判定の為）
          const bases = colorBlock.reduce((list,note) => {
            list[list.length - 1].push(Object.assign({},note))
            if(![5].includes(note.note_type)) return list
            list.push([])
            list[list.length - 1].push(Object.assign({},note))
            return list
          },[[]])

          bases.forEach(notes => {
            ctx.beginPath()

            if([1,2,3].includes(notes[0].note_type)) notes[0].position += 8
            if([1,2,3].includes(notes[notes.length - 1].note_type)) notes[notes.length - 1].position -= 8

            if(notes.length > 2 && notes.some(n => n.note_type === 4)){
              const n1 = notes.map(n => ([n.lane * 16 + 8 + 4               , n.measure * 768 + n.position + 8]))
              const n2 = notes.map(n => ([n.lane * 16 + 8 + n.width * 16 - 4, n.measure * 768 + n.position + 8]))

              const curve1 = bezier(n1, 100)
              const curve2 = bezier(n2, 100)
              ctx.moveTo(curve1[0][0], curve1[0][1])
              for(let i = 1; i < curve1.length; i++)      ctx.lineTo(curve1[i][0], curve1[i][1])
              for(let i = curve2.length - 1; i >= 0; i--) ctx.lineTo(curve2[i][0], curve2[i][1])
            } else {
              ctx.moveTo(notes[0].lane * 16 + 8 + 4, notes[0].measure * 768 + notes[0].position + 8)
              for(let i = 1; i < notes.length; i++) {
                ctx.lineTo(notes[i].lane * 16 + 8 + 4, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + 4, notes[i].measure * 768 + notes[i].position + 8)
              }
              for(let i = notes.length - 1; i >= 1; i--) {
                ctx.lineTo(notes[i].lane * 16 + 8 + notes[i].width * 16 - 4, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + notes[i].width * 16 - 4, notes[i].measure * 768 + notes[i].position + 8)
              }
              ctx.lineTo(notes[0].lane * 16 + 8 + notes[0].width * 16 - 4,notes[0].measure * 768 + notes[0].position + 8)
            }
            ctx.closePath()

            let gradient = ctx.createLinearGradient(0,colorBlock[0].measure * 768 + colorBlock[0].position + 16, 0 ,colorBlock[colorBlock.length-1].measure * 768 + colorBlock[colorBlock.length-1].position)
            gradient.addColorStop(0, '#ff4ce1bb')
            gradient.addColorStop(0.25, longNotes.type == 2 ? '#f6ff4ccc' : longNotes.type == 3 ? '#4cd5ffbb' : '#ff4ce1bb')
            gradient.addColorStop(0.75, longNotes.type == 2 ? '#f6ff4ccc' : longNotes.type == 3 ? '#4cd5ffbb' : '#ff4ce1bb')
            gradient.addColorStop(1, '#ff4ce1bb')
            ctx.fillStyle = gradient
            ctx.fill()

          })
        })
      })

    // SLIDE 線
    sus.longNotes.filter(long => long.type === 3)
      .forEach(longNotes => {

        // 可視中継点で分割（色分けの為）
        const colorBlocks = longNotes.notes.reduce((list,note) => {
          list[list.length - 1].push(Object.assign({},note))
          if(note.note_type !== 3) return list
          list.push([])
          list[list.length - 1].push(Object.assign({},note))
          return list
        },[[]])

        colorBlocks.forEach(colorBlock => {

          // 不可視中継点で分割（ベジェ判定の為）
          const bases = colorBlock.reduce((list,note) => {
            list[list.length - 1].push(Object.assign({},note))
            if(![5].includes(note.note_type)) return list
            list.push([])
            list[list.length - 1].push(Object.assign({},note))
            return list
          },[[]])

          bases.forEach(notes => {
            ctx.beginPath()

            if([1,2,3].includes(notes[0].note_type)) notes[0].position += 8
            if([1,2,3].includes(notes[notes.length - 1].note_type)) notes[notes.length - 1].position -= 8

            if(notes.length > 2 && notes.some(n => n.note_type === 4)){
              const n1 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 - 3, n.measure * 768 + n.position + 8]))
              const n2 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 + 3, n.measure * 768 + n.position + 8]))

              const curve1 = bezier(n1, 100)
              const curve2 = bezier(n2, 100)
              ctx.moveTo(curve1[0][0],curve1[0][1])
              for(let i = 1; i < curve1.length; i++)      ctx.lineTo(curve1[i][0], curve1[i][1])
              for(let i = curve2.length - 1; i >= 0; i--) ctx.lineTo(curve2[i][0], curve2[i][1])
            } else {
              ctx.moveTo(notes[0].lane * 16 + 8 + ( notes[0].width * 16 ) / 2 - 3, notes[0].measure * 768 + notes[0].position + 8)
              for(let i = 1; i < notes.length; i++) {
                ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 - 3, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 - 3, notes[i].measure * 768 + notes[i].position + 8)
              }
              for(let i = notes.length - 1; i >= 1; i--) {
                ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 + 3, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 + 3, notes[i].measure * 768 + notes[i].position + 8)
              }
              ctx.lineTo(notes[0].lane * 16 + 8 + ( notes[0].width * 16 ) / 2 + 3,notes[0].measure * 768 + notes[0].position + 8)
            }
            ctx.closePath()
            ctx.fillStyle = '#4cd5ff'
            ctx.fill()

          })
        })
      })

    // HOLD/SLIDE ノーツ
    sus.longNotes.filter(long => long.type !== 4).forEach(long => {  // AIR系でない
      long.notes.filter(note => ![4,5].includes(note.note_type)) // 不可視ノーツでない
        .forEach(note => {
          const x_pos = note.lane * 16 + 8
          const y_pos = note.measure * 768 + note.position

          ctx.drawImage(image[long.type].left   ,x_pos                                             ,y_pos )
          ctx.drawImage(image[long.type][[1,4].includes(note.note_type) ? 'center' : 'step'] ,x_pos + 4 ,y_pos ,note.width * 16 - 8 ,16 )
          ctx.drawImage(image[long.type].right  ,x_pos + note.width * 16 - 4                       ,y_pos )
        })
    })

    // 地を這うTAP系
    sus.shortNotes.filter(note => [1,5].includes(note.lane_type)).forEach(note => {
      const x_pos = note.lane * 16 + 8
      const y_pos = note.measure * 768 + note.position
      const height = note.lane_type == 1 ? 16 : note.width * 8

      switch (note.lane_type){
        case 1:
          ctx.drawImage(image[note.lane_type][note.note_type].left   ,x_pos                       ,y_pos , note.width ,note.lane_type == 1 ? 16 : note.width * 8)
          ctx.drawImage(image[note.lane_type][note.note_type].center ,x_pos + 4                   ,y_pos , note.width * 16 - 8 ,16 )
          ctx.drawImage(image[note.lane_type][note.note_type].right  ,x_pos + note.width * 16 - 4 ,y_pos )
          break
        case 5:
          ctx.drawImage(image[note.lane_type][note.note_type] ,x_pos + ([1,2,7].includes(note.note_type) ? 0 : [3,6,8].includes(note.note_type) ? -8 : 8), y_pos + 20, note.width * 16, note.width * 8)
          const short = sus.shortNotes
            .filter(n => n.lane_type === 1)
            .filter(n => n.lane === note.lane)
            .filter(n => n.measure === note.measure)
            .filter(n => n.position === note.position)
            .filter(n => n.width === note.width).length

          const long = sus.longNotes
            .filter(long => long.type !== 4)
            .reduce((list, long) => list.concat(long.notes),[])
            .filter(n => [1,3].includes(n.note_type))
            .filter(n => n.lane === note.lane)
            .filter(n => n.measure === note.measure)
            .filter(n => n.position === note.position)
            .filter(n => n.width === note.width).length

          if((0 < short || 0 < long) && ![7,8,9].includes(note.note_type)) break

          ctx.drawImage(image[1][7].left   ,x_pos                       ,y_pos )
          ctx.drawImage(image[1][7].center ,x_pos + 4                   ,y_pos , note.width * 16 - 8 ,16 )
          ctx.drawImage(image[1][7].right  ,x_pos + note.width * 16 - 4 ,y_pos )
          break
      }
    })

    // AIR線
    sus.longNotes.filter(long => long.type === 4)
      .forEach(longNotes => {
        // 可視中継点で分割（色分けの為）
        const colorBlocks = longNotes.notes.reduce((list,note) => {
          list[list.length - 1].push(Object.assign({},note))
          if(note.note_type !== 3) return list
          list.push([])
          list[list.length - 1].push(Object.assign({},note))
          return list
        },[[]])

        colorBlocks.forEach(colorBlock => {

          // 不可視中継点で分割（ベジェ判定の為）
          const bases = colorBlock.reduce((list,note) => {
            list[list.length - 1].push(Object.assign({},note))
            if(![5].includes(note.note_type)) return list
            list.push([])
            list[list.length - 1].push(Object.assign({},note))
            return list
          },[[]])

          bases.forEach(notes => {

            ctx.beginPath()

            if([1,2,3].includes(notes[0].note_type)) notes[0].position += 8
            if([1,2,3].includes(notes[notes.length - 1].note_type)) notes[notes.length - 1].position -= 8

            if(notes.length > 2 && notes.some(n => n.note_type === 4)){
              const n1 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 - 3, n.measure * 768 + n.position + 8]))
              const n2 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 + 3, n.measure * 768 + n.position + 8]))

              const curve1 = bezier(n1, 100)
              const curve2 = bezier(n2, 100)
              ctx.moveTo(curve1[0][0], curve1[0][1])
              for(let i = 1; i < curve1.length; i++)      ctx.lineTo(curve1[i][0], curve1[i][1])
              for(let i = curve2.length - 1; i >= 0; i--) ctx.lineTo(curve2[i][0], curve2[i][1])
            } else {
              ctx.moveTo(notes[0].lane * 16 + 8 + ( notes[0].width * 16 ) / 2 - 3, notes[0].measure * 768 + notes[0].position + 8)
              for(let i = 1; i < notes.length; i++) {
                ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 - 3, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 - 3, notes[i].measure * 768 + notes[i].position + 8)
              }
              for(let i = notes.length - 1; i >= 1; i--) {
                ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 + 3, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 + 3, notes[i].measure * 768 + notes[i].position + 8)
              }
              ctx.lineTo(notes[0].lane * 16 + 8 + ( notes[0].width * 16 ) / 2 + 3,notes[0].measure * 768 + notes[0].position + 8)
            }
            ctx.closePath()
            ctx.fillStyle = '#4cff51bb'
            ctx.fill()
          })
        })
      })

    // AIR ACTIONノーツ
    sus.longNotes.filter(long => long.type === 4).forEach(long => {
      long.notes.filter(note => ![1,4,5].includes(note.note_type))
        .forEach(note => {
          const x_pos = note.lane * 16 + 8
          const y_pos = note.measure * 768 + note.position

          ctx.drawImage(image[long.type].left   ,x_pos                                             ,y_pos )
          ctx.drawImage(image[long.type].center ,x_pos + 4 ,y_pos ,note.width * 16 - 8 ,16 )
          ctx.drawImage(image[long.type].right  ,x_pos + note.width * 16 - 4                       ,y_pos )
        })
    })

    images.push(canvas.toDataURL())
  }
  return images
}

