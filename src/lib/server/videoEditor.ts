// =================================================================
// SCAI Cowork — montage vidéo réel (assemble plusieurs clips/images
// fournis par l'utilisateur en une seule vidéo, via ffmpeg)
// =================================================================
// Contrairement à la génération Sora/Veo (une seule scène créée par IA
// à partir d'un texte), ce module prend des ÉLÉMENTS RÉELS fournis par
// l'utilisateur (plusieurs vidéos et/ou images déjà téléversées) et les
// assemble dans l'ordre — le vrai "montage" demandé, pas une génération.
// ffmpeg est installé dans l'image Docker (voir Dockerfile) : gratuit,
// auto-hébergé, aucun compte tiers à configurer.
// =================================================================

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { logToolUsage } from './logToolUsage'
import { saveVideoOutputReady } from './saveCoworkOutput'

const MAX_CLIPS = 12
const IMAGE_CLIP_SECONDS = 3

function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${cmd} a dépassé le délai imparti`)) }, timeoutMs)
    child.stderr?.on('data', d => { stderr += d.toString() })
    child.on('error', err => { clearTimeout(timer); reject(err) })
    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`${cmd} a échoué (code ${code}) : ${stderr.slice(-500)}`))
    })
  })
}

async function downloadTo(url: string, destPath: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${url.slice(0, 80)}`)
  const contentType = res.headers.get('content-type') || ''
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(destPath, buf)
  return contentType
}

export async function assembleVideoForUser(
  userId: string, params: { clips: string[]; title?: string }
): Promise<{ title: string; fileUrl: string } | { error: string }> {
  const clips = (params.clips || []).filter(Boolean).slice(0, MAX_CLIPS)
  if (clips.length < 2) return { error: 'Un montage a besoin d\'au moins 2 éléments (vidéos ou images).' }

  const title = (params.title || 'Montage SCAI').slice(0, 150)
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scai-montage-'))

  try {
    const normalized: string[] = []

    for (let i = 0; i < clips.length; i++) {
      const rawPath = path.join(workDir, `raw-${i}`)
      const contentType = await downloadTo(clips[i], rawPath)
      const isImage = contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(clips[i])
      const normPath = path.join(workDir, `clip-${i}.mp4`)

      if (isImage) {
        // Image → mini-clip avec un lent zoom avant centré ("Ken Burns")
        // au lieu d'une image figée — c'est ce qui distingue une vraie
        // vidéo montée d'un simple diaporama, sans IA ni coût supplémentaire.
        const frames = IMAGE_CLIP_SECONDS * 30
        const zoompan = `scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='min(zoom+0.0018,1.2)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=30`
        await run('ffmpeg', [
          '-y', '-loop', '1', '-i', rawPath, '-t', String(IMAGE_CLIP_SECONDS),
          '-vf', zoompan,
          '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest',
          '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', normPath,
        ], 150_000)
      } else {
        // Vidéo réelle → uniformise résolution/codec pour que la
        // concaténation ne produise pas un fichier corrompu (formats
        // sources hétérogènes selon d'où vient chaque clip).
        await run('ffmpeg', [
          '-y', '-i', rawPath,
          '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30',
          '-c:v', 'libx264', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-pix_fmt', 'yuv420p',
          normPath,
        ])
      }
      normalized.push(normPath)
    }

    const listFile = path.join(workDir, 'list.txt')
    await fs.writeFile(listFile, normalized.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'))

    const outputPath = path.join(workDir, 'output.mp4')
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath], 180_000)

    const buffer = await fs.readFile(outputPath)
    logToolUsage(userId, 'video', 'Montage ffmpeg')
    const output = await saveVideoOutputReady(userId, title, buffer)
    if (!output) return { error: 'Montage réalisé mais impossible à sauvegarder — réessaie.' }

    return { title, fileUrl: output.url }
  } catch (e: any) {
    console.error('[videoEditor]', e?.message)
    return { error: `Montage impossible : ${e?.message || 'erreur inconnue'}` }
  } finally {
    fs.rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
