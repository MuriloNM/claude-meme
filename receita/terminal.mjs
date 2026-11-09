// Reduz um meme já recortado para o terminal: 6 linhas, ou 12 pixels de altura. Devolve os pixels e o tempo de cada quadro.
// Precisa de ffmpeg. node terminal.mjs --entrada pronto.gif
import { spawnSync } from 'node:child_process'
import { constants, setPriority } from 'node:os'

const LINHAS = 6
const MAXIMO_DE_QUADROS = 24
const args = process.argv.slice(2)
const i = args.indexOf('--entrada')
const entrada = i >= 0 ? args[i + 1] : undefined
if (!entrada) { console.error('Use --entrada.'); process.exit(2) }

try { setPriority(constants.priority.PRIORITY_BELOW_NORMAL) } catch { /* sem permissão, segue na prioridade normal */ }

const medir = (campos, secao) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...(secao === 'stream' ? ['-select_streams', 'v:0'] : []), '-show_entries', `${secao}=${campos}`, '-of', 'csv=p=0', entrada], { encoding: 'utf8' })
  if (r.status !== 0) { console.error(String(r.stderr).trim()); process.exit(1) }
  return r.stdout.trim()
}
const [largura, altura] = medir('width,height', 'stream').split(',').map(Number)
const duracao = Number(medir('duration', 'format')) || 1
const a = LINHAS * 2
const l = Math.max(2, Math.round((largura * a) / altura))

const r = spawnSync('ffmpeg', ['-v', 'error', '-i', entrada, '-vf', `scale=${l}:${a}:flags=area,format=rgba`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 })
if (r.status !== 0) { console.error(String(r.stderr).trim()); process.exit(1) }

const total = Math.floor(r.stdout.length / (l * a * 4))
const lidos = []
for (let q = 0; q < total; q++) {
  const pixels = []
  for (let p = 0; p < l * a; p++) {
    const b = (q * l * a + p) * 4
    pixels.push(r.stdout[b + 3] < 128 ? '' : [r.stdout[b], r.stdout[b + 1], r.stdout[b + 2]].map(v => v.toString(16).padStart(2, '0')).join(''))
  }
  // O ffmpeg repete quadros para fechar o tempo do GIF: sem isso, o bicho fica parado em cada pose.
  if (lidos.length === 0 || pixels.join() !== lidos[lidos.length - 1].join()) lidos.push(pixels)
}
const passo = Math.max(1, Math.ceil(lidos.length / MAXIMO_DE_QUADROS))
const quadros = lidos.filter((_, n) => n % passo === 0)
const ms = Math.max(60, Math.min(500, Math.round((duracao * 1000) / quadros.length)))
console.log(JSON.stringify({ l, a, ms, quadros }))
