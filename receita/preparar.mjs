// Prepara uma sugestão sem usar o modelo: baixa só a mídia do link, recorta e devolve o GIF em base64 na saída. Precisa de ffmpeg.
// Nada do que vem do link é executado, e a pasta temporária é apagada no fim.
//
// node preparar.mjs --link URL --limite N [--modo --recorte --largura --fps --duracao] [--largura-pergunta N --fps-pergunta N] [--folha arquivo.png]
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { constants, setPriority, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAXIMO_DOWNLOAD = 60 * 1024 * 1024
const TEMPO_DOWNLOAD = 60_000
const FOLGA_DO_DESENHO = 400
const CABECALHO = { 'User-Agent': 'Mozilla/5.0' }

const args = process.argv.slice(2)
const opcao = (nome, padrao) => { const i = args.indexOf('--' + nome); return i >= 0 ? args[i + 1] : padrao }
const falhar = mensagem => { console.error(mensagem); process.exit(1) }

const link = opcao('link')
const limite = Number(opcao('limite', '131072'))
if (!link || !link.startsWith('https://')) falhar('Use --link com um endereço https.')

// Quem prepara meme em segundo plano não disputa o computador com a pessoa.
try { setPriority(constants.priority.PRIORITY_BELOW_NORMAL) } catch { /* sem permissão, segue na prioridade normal */ }

async function buscar(url) {
  const resposta = await fetch(url, { headers: CABECALHO, redirect: 'follow', signal: AbortSignal.timeout(TEMPO_DOWNLOAD) })
  if (!resposta.ok) throw new Error(`o link respondeu ${resposta.status}`)
  if (Number(resposta.headers.get('content-length') ?? 0) > MAXIMO_DOWNLOAD) throw new Error('o arquivo é grande demais')
  const partes = []
  let total = 0
  for await (const parte of resposta.body) {
    total += parte.length
    if (total > MAXIMO_DOWNLOAD) throw new Error('o arquivo é grande demais')
    partes.push(parte)
  }
  return { tipo: resposta.headers.get('content-type') ?? '', dados: Buffer.concat(partes) }
}

function ehMidia(b) {
  const gif = b.subarray(0, 4).toString('latin1') === 'GIF8'
  const mp4 = b.subarray(4, 8).toString('latin1') === 'ftyp'
  const webm = b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3
  return gif || mp4 || webm
}

// Numa página, como a de um pin, procura o vídeo ou o GIF. Os recortes das sugestões valem para o vídeo de 720p, quando existe.
function acharMidia(html) {
  const texto = html.replace(/\\u002F/gi, '/').replace(/\\\//g, '/')
  const achados = [...new Set(texto.match(/https:\/\/[a-z0-9.-]*pinimg\.com\/[^"'\\\s)]+/gi) ?? [])]
  const videos = achados.filter(u => /\.mp4(\?|$)/.test(u) && !u.includes('/thumbnails/'))
  return videos.find(u => u.includes('/720p/')) ?? videos[0] ?? achados.find(u => /\/originals\/.*\.gif(\?|$)/.test(u))
}

async function baixar() {
  const primeira = await buscar(link)
  if (ehMidia(primeira.dados)) return primeira.dados
  const endereco = primeira.tipo.includes('html') ? acharMidia(primeira.dados.toString('utf8')) : undefined
  if (!endereco) throw new Error('o link não levou a um GIF ou vídeo')
  const midia = await buscar(endereco)
  if (!ehMidia(midia.dados)) throw new Error('o link não levou a um GIF ou vídeo')
  return midia.dados
}

// Recorta e, se passar do limite do desenho, tenta de novo com menos quadros por segundo.
function recortar(entrada, saida, altura, largura, fpsInicial, folha) {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'recortar.mjs')
  for (let fps = fpsInicial; fps >= 3; fps -= 1) {
    const extras = []
    for (const nome of ['modo', 'recorte', 'duracao']) if (opcao(nome)) extras.push('--' + nome, opcao(nome))
    if (largura) extras.push('--largura', String(largura))
    if (folha) extras.push('--folha', folha)
    const r = spawnSync(process.execPath, [script, '--entrada', entrada, '--saida', saida, '--altura', String(altura), '--fps', String(fps), ...extras], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error('o recorte falhou: ' + String(r.stderr).trim().slice(0, 300))
    const medida = JSON.parse(r.stdout)
    if (medida.caracteres + FOLGA_DO_DESENHO <= limite) return { base64: readFileSync(saida).toString('base64'), largura: medida.largura }
  }
  throw new Error('o desenho não coube no limite, mesmo com poucos quadros')
}

const pasta = mkdtempSync(join(tmpdir(), 'claude-meme-'))
try {
  const entrada = join(pasta, 'original.bin')
  writeFileSync(entrada, await baixar())
  const fps = Number(opcao('fps', '8'))
  const pequeno = recortar(entrada, join(pasta, 'pronto.gif'), 32, Number(opcao('largura', 0)) || null, fps, opcao('folha'))
  const larguraPergunta = Number(opcao('largura-pergunta', 0))
  const grande = larguraPergunta
    ? recortar(entrada, join(pasta, 'grande.gif'), 64, larguraPergunta, Number(opcao('fps-pergunta', '6')))
    : null
  console.log(JSON.stringify({ gif: pequeno.base64, largura: pequeno.largura, pergunta: grande?.base64 ?? null, larguraPergunta: grande?.largura ?? null }))
} catch (erro) {
  // Sem process.exit aqui: depois de usar a rede, ele derruba o Node no Windows.
  console.error(erro instanceof Error ? erro.message : String(erro))
  process.exitCode = 1
} finally {
  rmSync(pasta, { recursive: true, force: true })
}
