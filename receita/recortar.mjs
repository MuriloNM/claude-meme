// Reduz um GIF ou vídeo para a altura pedida, apaga o fundo e monta uma folha para conferir. Precisa de ffmpeg.
//
// node recortar.mjs --entrada arquivo --saida pronto.gif [opções]
//   --modo verde|borda|escuro|nenhum   como apagar o fundo (padrão: nenhum)
//   --recorte L:A:X:Y                  área útil, em pixels do original
//   --largura N                        largura final (padrão: proporcional)
//   --altura N                         altura final (padrão: 32)
//   --fps N                            quadros por segundo (padrão: 8)
//   --duracao N                        usa só os primeiros N segundos
//   --tolerancia N                     borda: distância da cor do fundo (padrão: 38); escuro: brilho máximo do bicho (padrão: 110)
//   --faixa DE:ATE                     escuro: parte da largura em que o bicho pode estar, de 0 a 1 (padrão: 0.08:0.82)
//   --cores N                          tamanho da paleta (padrão: 64 no modo nenhum, 48 nos outros)
//   --folha arquivo.png                folha de 8 quadros sobre fundo escuro e claro
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opcao = (nome, padrao) => { const i = args.indexOf('--' + nome); return i >= 0 ? args[i + 1] : padrao }
const entrada = opcao('entrada'), saida = opcao('saida')
if (!entrada || !saida) { console.error('Use --entrada e --saida.'); process.exit(2) }
const modo = opcao('modo', 'nenhum')
if (!['verde', 'borda', 'escuro', 'nenhum'].includes(modo)) { console.error('Modo desconhecido: ' + modo); process.exit(2) }
const recorte = opcao('recorte'), fps = opcao('fps', '8'), duracao = opcao('duracao'), folha = opcao('folha')
const AF = Number(opcao('altura', '32'))

const rodar = (prog, a) => { const r = spawnSync(prog, a, { maxBuffer: 1 << 30 }); if (r.status !== 0) throw new Error(String(r.stderr).slice(0, 400)); return r.stdout }
const [lo, ao] = String(rodar('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', entrada])).trim().split(',').map(Number)
const [lc, ac] = recorte ? recorte.split(':').map(Number) : [lo, ao]
const par = n => Math.max(2, Math.round(n / 2) * 2)
const LF = Number(opcao('largura', 0)) || par((lc * AF) / ac)
const L = LF * 2, A = AF * 2

const bruto = rodar('ffmpeg', ['-v', 'error', ...(duracao ? ['-t', duracao] : []), '-i', entrada, '-vf', `${recorte ? `crop=${recorte},` : ''}fps=${fps},scale=${L}:${A}:flags=area,format=rgba`, '-f', 'rawvideo', '-'])
const quadros = Math.floor(bruto.length / (L * A * 4))
const fim = Buffer.alloc(quadros * LF * AF * 4)

// Opacidade de cada ponto do quadro, de 0 a 1.
function opacidades(base) {
  const px = (x, y) => base + (y * L + x) * 4
  const alfa = new Float32Array(L * A).fill(1)
  if (modo === 'nenhum') return alfa
  if (modo === 'verde') {
    for (let y = 0; y < A; y++) for (let x = 0; x < L; x++) {
      const i = px(x, y), verde = bruto[i + 1] - Math.max(bruto[i], bruto[i + 2])
      alfa[y * L + x] = verde >= 90 ? 0 : verde <= 30 ? 1 : (90 - verde) / 60
    }
    return alfa
  }
  const borda = []
  for (let x = 0; x < L; x++) borda.push([x, 0], [x, A - 1])
  for (let y = 0; y < A; y++) borda.push([0, y], [L - 1, y])
  let apagavel
  if (modo === 'escuro') {
    // Bicho escuro em fundo claro e complicado: fica só o que é escuro e está ligado ao centro de baixo, dentro da faixa pedida.
    const limite = Number(opcao('tolerancia', '110'))
    const [de, ate] = opcao('faixa', '0.08:0.82').split(':').map(Number)
    const esquerda = Math.round(L * de), direita = Math.round(L * ate)
    const escuro = i => 0.3 * bruto[i] + 0.59 * bruto[i + 1] + 0.11 * bruto[i + 2] <= limite
    const corpo = new Uint8Array(L * A)
    const sementes = []
    for (let x = Math.round(L * 0.3); x < L * 0.65; x++) sementes.push([x, A - 1], [x, A - 3])
    while (sementes.length) {
      const [x, y] = sementes.pop()
      if (x < esquerda || y < 0 || x >= direita || y >= A || corpo[y * L + x] || !escuro(px(x, y))) continue
      corpo[y * L + x] = 1
      sementes.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    apagavel = i => { const p = (i - base) / 4; return !corpo[p] }
  } else {
    // A cor de fundo é a mais comum nas bordas deste quadro.
    const conta = new Map()
    for (const [x, y] of borda) { const i = px(x, y); const c = (bruto[i] >> 4) + ',' + (bruto[i + 1] >> 4) + ',' + (bruto[i + 2] >> 4); conta.set(c, (conta.get(c) ?? 0) + 1) }
    const [r0, g0, b0] = [...conta.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(n => Number(n) * 16 + 8)
    const tol = Number(opcao('tolerancia', '38')) ** 2 * 3
    apagavel = i => { const dr = bruto[i] - r0, dg = bruto[i + 1] - g0, db = bruto[i + 2] - b0; return dr * dr + dg * dg + db * db <= tol }
  }
  // Só apaga o que está ligado à borda: buracos fechados, como olhos, ficam.
  const pilha = borda.filter(([x, y]) => apagavel(px(x, y)))
  const visto = new Uint8Array(L * A)
  while (pilha.length) {
    const [x, y] = pilha.pop()
    if (x < 0 || y < 0 || x >= L || y >= A || visto[y * L + x]) continue
    visto[y * L + x] = 1
    if (!apagavel(px(x, y))) continue
    alfa[y * L + x] = 0
    pilha.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  return alfa
}

for (let q = 0; q < quadros; q++) {
  const base = q * L * A * 4
  const alfa = opacidades(base)
  for (let y = 0; y < AF; y++) for (let x = 0; x < LF; x++) {
    // Pesa cada ponto pela opacidade, para a cor apagada não manchar a borda.
    let r = 0, g = 0, b = 0, peso = 0
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const xx = x * 2 + dx, yy = y * 2 + dy, i = base + (yy * L + xx) * 4, a = alfa[yy * L + xx]
      const verdeLimpo = modo === 'verde' ? Math.min(bruto[i + 1], Math.max(bruto[i], bruto[i + 2])) : bruto[i + 1]
      r += bruto[i] * a; g += verdeLimpo * a; b += bruto[i + 2] * a; peso += a
    }
    const j = q * LF * AF * 4 + (y * LF + x) * 4
    if (peso >= 2) { fim[j] = r / peso; fim[j + 1] = g / peso; fim[j + 2] = b / peso; fim[j + 3] = 255 }
  }
}

const pasta = mkdtempSync(join(tmpdir(), 'claude-meme-'))
try {
  const cru = join(pasta, 'quadros.rgba')
  writeFileSync(cru, fim)
  const cores = opcao('cores', modo === 'nenhum' ? '64' : '48')
  const transparente = modo === 'nenhum' ? '' : ':reserve_transparent=1'
  const uso = modo === 'nenhum' ? 'dither=none' : 'dither=none:alpha_threshold=128'
  rodar('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${LF}x${AF}`, '-framerate', fps, '-i', cru,
    '-filter_complex', `split[a][b];[a]palettegen=max_colors=${cores}${transparente}:stats_mode=diff[p];[b][p]paletteuse=${uso}`, saida])
  if (folha) {
    const passo = Math.max(1, Math.floor(quadros / 8))
    const cel = `select=not(mod(n\\,${passo})),scale=${LF * 4}:${AF * 4}:flags=neighbor,tile=8x1`
    const tam = `${LF * 32}x${AF * 4}`
    rodar('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=0x191919:s=${tam}:d=1`, '-i', saida, '-i', saida, '-f', 'lavfi', '-i', `color=c=0xffffff:s=${tam}:d=1`,
      '-filter_complex', `[1:v]${cel}[t];[0:v][t]overlay=0:0[e];[2:v]${cel}[u];[3:v][u]overlay=0:0[c];[e][c]vstack`, '-frames:v', '1', folha])
  }
} finally {
  rmSync(pasta, { recursive: true, force: true })
}
const bytes = statSync(saida).size
console.log(JSON.stringify({ quadros, largura: LF, altura: AF, kb: Math.round(bytes / 1024), caracteres: Math.ceil(bytes / 3) * 4 }))
