'use client'

// =================================================================
// Éditeur d'annotation d'image — ouvert en cliquant sur une image
// collée dans le composer SCAI, pour pouvoir entourer/annoter un
// détail avant l'envoi (comme l'outil d'annotation de Claude Code).
// Dessine directement sur un <canvas> et exporte le résultat aplati
// en data URL PNG — pas de dépendance externe.
// =================================================================

import { useEffect, useRef, useState } from 'react'
import { Pencil, Minus, ArrowUpRight, Square, Circle, Type, Undo2, Redo2, Trash2, X, Check } from 'lucide-react'

type Tool = 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text'

type Stroke =
  | { tool: 'pen'; color: string; points: { x: number; y: number }[] }
  | { tool: 'line' | 'arrow' | 'rect' | 'ellipse'; color: string; x0: number; y0: number; x1: number; y1: number }
  | { tool: 'text'; color: string; x: number; y: number; text: string }

const COLORS = ['#EF4444', '#22C55E', '#3B82F6', '#F5F5F5']

export default function ImageAnnotator({ src, onSave, onClose }: { src: string; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const drawingRef = useRef<Stroke | null>(null)
  const [, forceRender] = useState(0)

  // Charge l'image une fois, dimensionne le canvas sur sa taille réelle
  // (capée pour rester lisible sur un grand écran) puis dessine.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      const maxW = 900, maxH = 640
      const scale = Math.min(1, maxW / img.width, maxH / img.height)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      redraw()
    }
    img.src = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const redraw = () => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    for (const s of strokes) drawStroke(ctx, s)
    if (drawingRef.current) drawStroke(ctx, drawingRef.current)
  }

  useEffect(redraw, [strokes])

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (s.tool === 'pen') {
      if (s.points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    } else if (s.tool === 'line' || s.tool === 'arrow') {
      ctx.beginPath()
      ctx.moveTo(s.x0, s.y0)
      ctx.lineTo(s.x1, s.y1)
      ctx.stroke()
      if (s.tool === 'arrow') {
        const angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0)
        const head = 12
        ctx.beginPath()
        ctx.moveTo(s.x1, s.y1)
        ctx.lineTo(s.x1 - head * Math.cos(angle - Math.PI / 6), s.y1 - head * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(s.x1, s.y1)
        ctx.lineTo(s.x1 - head * Math.cos(angle + Math.PI / 6), s.y1 - head * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
      }
    } else if (s.tool === 'rect') {
      ctx.strokeRect(Math.min(s.x0, s.x1), Math.min(s.y0, s.y1), Math.abs(s.x1 - s.x0), Math.abs(s.y1 - s.y0))
    } else if (s.tool === 'ellipse') {
      const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2
      const rx = Math.abs(s.x1 - s.x0) / 2, ry = Math.abs(s.y1 - s.y0) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (s.tool === 'text') {
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText(s.text, s.x, s.y)
    }
  }

  const posFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = posFromEvent(e)
    if (tool === 'text') {
      const text = window.prompt('Texte à ajouter :')
      if (text && text.trim()) {
        setStrokes(prev => [...prev, { tool: 'text', color, x, y, text: text.trim() }])
        setRedoStack([])
      }
      return
    }
    if (tool === 'pen') drawingRef.current = { tool: 'pen', color, points: [{ x, y }] }
    else drawingRef.current = { tool, color, x0: x, y0: y, x1: x, y1: y }
  }

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const { x, y } = posFromEvent(e)
    const d = drawingRef.current
    if (d.tool === 'pen') d.points.push({ x, y })
    else if (d.tool !== 'text') { d.x1 = x; d.y1 = y }
    redraw()
  }

  const handleUp = () => {
    if (!drawingRef.current) return
    setStrokes(prev => [...prev, drawingRef.current as Stroke])
    setRedoStack([])
    drawingRef.current = null
  }

  const undo = () => {
    setStrokes(prev => {
      if (prev.length === 0) return prev
      setRedoStack(r => [...r, prev[prev.length - 1]])
      return prev.slice(0, -1)
    })
  }
  const redo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      setStrokes(s => [...s, prev[prev.length - 1]])
      return prev.slice(0, -1)
    })
  }
  const clearAll = () => { setStrokes([]); setRedoStack([]) }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/png'))
  }

  const tools: { id: Tool; icon: JSX.Element; title: string }[] = [
    { id: 'pen', icon: <Pencil size={16} />, title: 'Dessin libre' },
    { id: 'line', icon: <Minus size={16} />, title: 'Ligne' },
    { id: 'arrow', icon: <ArrowUpRight size={16} />, title: 'Flèche' },
    { id: 'rect', icon: <Square size={16} />, title: 'Rectangle' },
    { id: 'ellipse', icon: <Circle size={16} />, title: 'Ellipse' },
    { id: 'text', icon: <Type size={16} />, title: 'Texte' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl p-3 max-w-full max-h-full flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-[#2a2a2a] max-w-full cursor-crosshair touch-none"
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-[#111111] border border-[#2a2a2a] rounded-xl px-2 py-1.5">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.title}
              className={`p-2 rounded-lg transition-colors ${tool === t.id ? 'bg-[#D4AF37] text-black' : 'text-gray-300 hover:bg-[#1A1A1A]'}`}
            >
              {t.icon}
            </button>
          ))}
          <div className="w-px h-6 bg-[#2a2a2a] mx-1" />
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-6 bg-[#2a2a2a] mx-1" />
          <button onClick={undo} title="Annuler" className="p-2 rounded-lg text-gray-300 hover:bg-[#1A1A1A] disabled:opacity-30" disabled={strokes.length === 0}><Undo2 size={16} /></button>
          <button onClick={redo} title="Rétablir" className="p-2 rounded-lg text-gray-300 hover:bg-[#1A1A1A] disabled:opacity-30" disabled={redoStack.length === 0}><Redo2 size={16} /></button>
          <button onClick={clearAll} title="Tout effacer" className="p-2 rounded-lg text-gray-300 hover:bg-[#1A1A1A]"><Trash2 size={16} /></button>
          <div className="w-px h-6 bg-[#2a2a2a] mx-1" />
          <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:bg-[#1A1A1A]">
            <X size={14} /> Fermer
          </button>
          <button onClick={save} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-[#D4AF37] text-black hover:bg-[#e0bd4f]">
            <Check size={14} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
