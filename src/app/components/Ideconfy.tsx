'use client'

import React, { useState, useEffect, useRef } from 'react'
import { sha256 } from 'js-sha256'
import { motion, Reorder } from 'framer-motion'

const generateIdenticon = (input: string, size: number = 5, scale: number = 20) => {
  const hash = sha256(input)
  const color = '#' + hash.slice(0, 6)

  const svg = []
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < Math.ceil(size / 2); j++) {
      const index = i * size + j
      if (parseInt(hash[index], 16) % 2 === 0) {
        svg.push(
          <rect
            key={`${i}-${j}`}
            x={j * scale}
            y={i * scale}
            width={scale}
            height={scale}
            fill={color}
          />
        )
        if (j < Math.floor(size / 2)) {
          svg.push(
            <rect
              key={`${i}-${size - j - 1}`}
              x={(size - j - 1) * scale}
              y={i * scale}
              width={scale}
              height={scale}
              fill={color}
            />
          )
        }
      }
    }
  } // Stack Overflow

  return (
    <svg width={size * scale} height={size * scale} viewBox={`0 0 ${size * scale} ${size * scale}`}>
      <rect width="100%" height="100%" fill="white" />
      {svg}
    </svg>
  )
}

const rainbowText = (text: string) => {
  return (
    <span className="relative group">
      <span className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-magic-spell">
        {text}
      </span>
      <style jsx>{`
        @keyframes magic-spell {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-magic-spell {
          background-size: 200% 200%;
          animation: magic-spell 5s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
};

export default function Ideconfy() {
  const [text, setText] = useState('')
  const [headerIdenticon, setHeaderIdenticon] = useState('')
  const [craftedIdenticons, setCraftedIdenticons] = useState<Array<{ id: string, content: string }>>([])
  const [craftingTable, setCraftingTable] = useState<Array<{ id: string, content: string }>>([])
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({})

  const MAX_IDENTICONS = 12;

  useEffect(() => {
    setHeaderIdenticon(Math.random().toString(36).substring(7))
  }, [])

  useEffect(() => {
    if (!headerIdenticon) return;

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgElement.setAttribute('width', '32')
    svgElement.setAttribute('height', '32')
    svgElement.setAttribute('viewBox', '0 0 32 32')

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', 'white')
    svgElement.appendChild(bgRect)

    const hash = sha256(headerIdenticon)
    const color = '#' + hash.slice(0, 6)
    const size = 5
    const scale = 32/5

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < Math.ceil(size / 2); j++) {
        const index = i * size + j
        if (parseInt(hash[index], 16) % 2 === 0) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', (j * scale).toString())
          rect.setAttribute('y', (i * scale).toString())
          rect.setAttribute('width', scale.toString())
          rect.setAttribute('height', scale.toString())
          rect.setAttribute('fill', color)
          svgElement.appendChild(rect)

          if (j < Math.floor(size / 2)) {
            const mirrorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            mirrorRect.setAttribute('x', ((size - j - 1) * scale).toString())
            mirrorRect.setAttribute('y', (i * scale).toString())
            mirrorRect.setAttribute('width', scale.toString())
            mirrorRect.setAttribute('height', scale.toString())
            mirrorRect.setAttribute('fill', color)
            svgElement.appendChild(mirrorRect)
          }
        }
      }
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, 32, 32)
      
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || document.createElement('link')
      favicon.type = 'image/png'
      favicon.rel = 'icon'
      favicon.href = canvas.toDataURL()
      document.head.appendChild(favicon)

      URL.revokeObjectURL(url)
    }
    img.src = url

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [headerIdenticon])

  const handleCraft = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (text.trim()) {
      const newId = Date.now().toString()
      setCraftingTable(prev => [...prev, {
        id: newId,
        content: text
      }])
      setText('')
    }
  }

  const findAvailablePosition = (baseX: number, baseY: number): { x: number, y: number } => {
    const gridSize = 20
    const iconSize = 100
    const occupied = Object.values(positions)
    
    for (let layer = 0; layer < 10; layer++) {
      for (let i = -layer; i <= layer; i++) {
        for (let j = -layer; j <= layer; j++) {
          const testX = baseX + i * (iconSize + gridSize)
          const testY = baseY + j * (iconSize + gridSize)
          
          const isClear = occupied.every(pos => {
            const distance = Math.sqrt(
              Math.pow(pos.x - testX, 2) + 
              Math.pow(pos.y - testY, 2)
            )
            return distance > iconSize
          })
          
          if (isClear) {
            return { x: testX, y: testY }
          }
        }
      }
    }
    
    return { x: Math.random() * 500, y: Math.random() * 500 }
  } // Stack Overflow  

  const handleDownloadPNG = (svg: SVGSVGElement, filename: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = 210
    canvas.height = 210
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return
    
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)
    
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 210, 210)

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
      
      URL.revokeObjectURL(blobURL)
    }
    img.src = blobURL
  }

  const handleCopySVG = (content: string) => {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgElement.setAttribute('width', '100')
    svgElement.setAttribute('height', '100')
    svgElement.setAttribute('viewBox', '0 0 100 100')
    
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', 'white')
    svgElement.appendChild(bgRect)
    
    const hash = sha256(content)
    const color = '#' + hash.slice(0, 6)
    const size = 5
    const scale = 20

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < Math.ceil(size / 2); j++) {
        const index = i * size + j
        if (parseInt(hash[index], 16) % 2 === 0) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', (j * scale).toString())
          rect.setAttribute('y', (i * scale).toString())
          rect.setAttribute('width', scale.toString())
          rect.setAttribute('height', scale.toString())
          rect.setAttribute('fill', color)
          svgElement.appendChild(rect)

          if (j < Math.floor(size / 2)) {
            const mirrorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            mirrorRect.setAttribute('x', ((size - j - 1) * scale).toString())
            mirrorRect.setAttribute('y', (i * scale).toString())
            mirrorRect.setAttribute('width', scale.toString())
            mirrorRect.setAttribute('height', scale.toString())
            mirrorRect.setAttribute('fill', color)
            svgElement.appendChild(mirrorRect)
          }
        }
      }
    }
    
    const svgString = new XMLSerializer().serializeToString(svgElement)
    navigator.clipboard.writeText(svgString)
  }

  const handleDelete = (id: string) => {
    setCraftedIdenticons(prev => prev.filter(icon => icon.id !== id))
  }

  const handleDragFromTable = (icon: { id: string, content: string }, info: any) => {
    if (Math.abs(info.offset.y) > 100) {
      if (craftedIdenticons.length >= MAX_IDENTICONS) {
        return;
      }
      const newPos = findAvailablePosition(info.point.x, info.point.y)
      setCraftedIdenticons(prev => [...prev, icon])
      setCraftingTable(prev => prev.filter(i => i.id !== icon.id))
      setPositions(prev => ({
        ...prev,
        [icon.id]: newPos
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div 
              className={`group relative cursor-pointer ${
                craftedIdenticons.length >= MAX_IDENTICONS ? 'opacity-50 cursor-not-allowed' : ''
              }`} 
            >
              {generateIdenticon(headerIdenticon, 5, 6)}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 hidden group-hover:block">
                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200/50 shadow-sm">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white/80 border-t border-l border-gray-200/50" />
                  <span className="text-xs whitespace-nowrap text-gray-600">
                    {headerIdenticon}
                  </span>
                </div>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-gray-800 cursor-default select-none">Ideconfy</h1>
          </div>
          <div className="flex space-x-4">
          <button className="text-gray-500 hover:text-gray-700 transition-colors" onClick={() => {
            window.open('https://buymeacoffee.com/etulastrada', '_blank')
          }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </button>
            <button className="text-gray-500 hover:text-gray-700 transition-colors" onClick={() => {
              window.open('https://github.com/etulastrada/ideconfy', '_blank')
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-between p-4 relative">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
        <div className="relative w-full flex-grow">
          {craftedIdenticons.map(icon => (
            <motion.div
              key={icon.id}
              drag
              dragMomentum={false}
              className="absolute cursor-move group"
              whileDrag={{ scale: 1.1 }}
              initial={positions[icon.id] || findAvailablePosition(100, 100)}
              animate={positions[icon.id]}
              onDragEnd={(_, info) => {
                const newPos = findAvailablePosition(info.point.x, info.point.y)
                setPositions(prev => ({
                  ...prev,
                  [icon.id]: newPos
                }))
              }}
            >
              {generateIdenticon(icon.content, 5, 20)}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                
                <div className="absolute z-50 bottom-0 left-1/2 -translate-x-1/2 flex gap-2 transition-all translate-y-[calc(100%+1rem)]"
                >
                  <button 
                    onClick={() => {
                      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
                      svgElement.setAttribute('width', '210')
                      svgElement.setAttribute('height', '210')
                      svgElement.setAttribute('viewBox', '0 0 210 210')
                      
                      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                      bgRect.setAttribute('width', '100%')
                      bgRect.setAttribute('height', '100%')
                      bgRect.setAttribute('fill', 'white')
                      svgElement.appendChild(bgRect)
                      
                      const hash = sha256(icon.content)
                      const color = '#' + hash.slice(0, 6)
                      const size = 5
                      const scale = 42

                      for (let i = 0; i < size; i++) {
                        for (let j = 0; j < Math.ceil(size / 2); j++) {
                          const index = i * size + j
                          if (parseInt(hash[index], 16) % 2 === 0) {
                            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                            rect.setAttribute('x', (j * scale).toString())
                            rect.setAttribute('y', (i * scale).toString())
                            rect.setAttribute('width', scale.toString())
                            rect.setAttribute('height', scale.toString())
                            rect.setAttribute('fill', color)
                            svgElement.appendChild(rect)

                            if (j < Math.floor(size / 2)) {
                              const mirrorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                              mirrorRect.setAttribute('x', ((size - j - 1) * scale).toString())
                              mirrorRect.setAttribute('y', (i * scale).toString())
                              mirrorRect.setAttribute('width', scale.toString())
                              mirrorRect.setAttribute('height', scale.toString())
                              mirrorRect.setAttribute('fill', color)
                              svgElement.appendChild(mirrorRect)
                            }
                          }
                        }
                      }
                      
                      handleDownloadPNG(svgElement, icon.content)
                    }}
                    className="group relative px-4 py-2 bg-white/30 backdrop-blur-sm border border-blue-400/30 
                               text-blue-600 rounded hover:bg-blue-50/50 text-xs whitespace-nowrap
                               transition-all duration-200 hover:border-blue-400/50"
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    Download PNG
                  </button>
                  <button 
                    onClick={() => handleCopySVG(icon.content)}
                    className="group relative px-4 py-2 bg-white/30 backdrop-blur-sm border border-blue-400/30 
                               text-blue-600 rounded hover:bg-blue-50/50 text-xs whitespace-nowrap
                               transition-all duration-200 hover:border-blue-400/50"
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-blue-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    Copy SVG
                  </button>
                  <button 
                    onClick={() => handleDelete(icon.id)}
                    className="group relative px-4 py-2 bg-white/30 backdrop-blur-sm border border-red-400/30 
                               text-red-600 rounded hover:bg-red-50/50 text-xs whitespace-nowrap
                               transition-all duration-200 hover:border-red-400/50"
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-red-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-red-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-red-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-red-400 group-hover:w-3 group-hover:h-3 transition-all" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="w-full max-w-4xl mb-8 grid grid-cols-4 gap-4">
          {craftingTable.map(icon => (
            <motion.div
              key={icon.id}
              drag
              dragMomentum={false}
              className="cursor-move bg-white/30 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50"
              whileDrag={{ scale: 1.1 }}
              onDragEnd={(_, info) => handleDragFromTable(icon, info)}
            >
              {generateIdenticon(icon.content, 5, 20)}
            </motion.div>
          ))}
        </div>
        <form onSubmit={handleCraft} className="w-full max-w-md mb-8 relative">
          <div className="relative group">
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400/50" />
            <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400/50" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400/50" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400/50" />
            <div className="bg-white/30 backdrop-blur-[2px] p-8 rounded-lg 
                          border border-gray-200/50 shadow-sm">
              <div className="flex gap-8 items-center">
                <div className="flex-1">
                  {generateIdenticon(text || headerIdenticon) || (
                    <div className="w-[200px] h-[200px] bg-gray-100/50 rounded-lg 
                                  flex items-center justify-center text-gray-400
                                  border border-dashed border-gray-300">
                      Preview
                    </div>
                  )}
                </div>
                <div className="text-blue-400/70 flex flex-col items-center gap-2 cursor-default select-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span className="text-xs">Press <kbd className="px-2 py-0.5 bg-white/50 rounded border border-gray-200/50 font-mono">⏎</kbd> to craft</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to generate Identicon"
                className="w-full px-4 py-2 text-lg text-gray-700 bg-white/40 backdrop-blur-sm rounded-lg 
                         focus:outline-none ransition-all
                         border border-gray-200/50 shadow-sm text-center"
              />
              <div className="mt-2 text-xs text-gray-500/80 flex items-center justify-center gap-2 px-2 cursor-default select-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Avoid using sensitive info - it may be decoded from the Identicon.
              </div>
            </div>
          </div>
        </form>
        <div className="w-full text-center text-sm text-gray-500 relative z-10 bg-gray-50/80 py-2 cursor-default select-none">
          Made with ❤️ by {rainbowText('etulastrada')}
        </div>
      </main>
    </div>
  )
}