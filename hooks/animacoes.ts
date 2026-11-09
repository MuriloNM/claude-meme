// As animações em pixel, em SVG puro (SMIL, sem script). Sem dependências.
// A faixa tem 400 x 32: a linha do app não passa de cerca de 32 de altura e encolhe o desenho que passar.
export const LARGURA = 400
export const ALTURA = 32
export const NOMES = ['correndo', 'pensando', 'digitando', 'comando', 'lendo', 'editando', 'novelo', 'surgindo'] as const
export type Nome = (typeof NOMES)[number]
// O sorteio vale para o momento em que o Claude pensa.
export const SORTEIO: readonly Nome[] = ['pensando', 'novelo', 'surgindo']

export const CORES_GATO = ['laranja', 'cinza'] as const
export type Cor = (typeof CORES_GATO)[number]
// O gato é desenhado em laranja; o cinza troca os tons no fim, e os dois aparecem bem em fundo claro e escuro.
const TONS_CINZA: Record<string, string> = { '#e8a33d': '#9aa0a6', '#b5701f': '#6b7076', '#c98a2e': '#80858a', '#f4dcae': '#d3d6da' }
export function pintar(svg: string, cor: Cor): string {
  if (cor === 'laranja') return svg
  return Object.entries(TONS_CINZA).reduce((s, [de, para]) => s.split(de).join(para), svg)
}

const CORES: Record<string, string> = { O: '#e8a33d', D: '#b5701f', E: '#2b1a0a', P: '#e0567f', B: '#f4dcae', T: '#c98a2e' }

// Desenha linhas de texto como pixels; cada letra é uma cor, ponto é vazio.
function sprite(linhas: string[], c: number, x0 = 0, y0 = 0): string {
  let s = ''
  linhas.forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const cor = CORES[linha[x] ?? '']
      let fim = x + 1
      while (fim < linha.length && linha[fim] === linha[x]) fim++
      if (cor) s += `<rect x="${x0 + x * c}" y="${y0 + y * c}" width="${(fim - x) * c}" height="${c}" fill="${cor}"/>`
      x = fim
    }
  })
  return s
}

// Mostra só dentro dos intervalos (fração do ciclo), sem transição.
function visivel(intervalos: [number, number][], dur: number): string {
  const tempos = [0]
  const valores = [0]
  for (const [a, b] of intervalos) {
    if (a === 0) valores[0] = 1
    else { tempos.push(a); valores.push(1) }
    tempos.push(b); valores.push(0)
  }
  if ((tempos[tempos.length - 1] ?? 0) < 1) { tempos.push(1); valores.push(valores[valores.length - 1] ?? 0) }
  return `<animate attributeName="opacity" calcMode="discrete" values="${valores.join(';')}" keyTimes="${tempos.join(';')}" dur="${dur}s" repeatCount="indefinite"/>`
}

// Caminho por pontos [fração, x, y].
function caminho(pontos: [number, number, number][], dur: number): string {
  const f = (n: number) => +n.toFixed(4)
  return `<animateTransform attributeName="transform" type="translate" values="${pontos.map(p => `${f(p[1])} ${f(p[2])}`).join(';')}" keyTimes="${pontos.map(p => f(p[0])).join(';')}" dur="${dur}s" repeatCount="indefinite"/>`
}

const CORPO = [
  '.......O...O.',
  '.......OO.OO.',
  '.......OOOOO.',
  'T......OEOEO.',
  'T......OOPOO.',
  'TT....OOOOOO.',
  '.TODODODOOOO.',
  '..ODODODOOOO.',
  '..OOOOOOOOOO.',
]
const SENTADO = [...CORPO, '..OOOOOOOOOO.', '..OOO....OOO.']
const PATADA = [...CORPO.slice(0, 7), '..ODODODOOOOOOO', '..OOOOOOOOOO.', '..OOOOOOOOOO.', '..OOO....OOO.']
const ANDA_A = [...CORPO, '..OOOOOOOOOO.', '...OO.....OO.']
const ANDA_B = [...CORPO, '..OOOOOOOOOO.', '.OO...OO..OO.']
const LADO_GATO = 26 // 13 pixels de 2

function espelhar(conteudo: string): string {
  return `<g transform="translate(${LADO_GATO} 0) scale(-1 1)">${conteudo}</g>`
}

function passos(c: string, dur: number): string {
  const a = `<g>${sprite(ANDA_A, 2)}<animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.5" dur="${dur}s" repeatCount="indefinite"/></g>`
  const b = `<g opacity="0">${sprite(ANDA_B, 2)}<animate attributeName="opacity" calcMode="discrete" values="0;1" keyTimes="0;0.5" dur="${dur}s" repeatCount="indefinite"/></g>`
  return c === 'esquerda' ? espelhar(a + b) : a + b
}

// Saltos que perdem altura entre dois pontos do chão.
function saltos(t0: number, t1: number, x0: number, x1: number, alturas: number[]): [number, number, number][] {
  const pontos: [number, number, number][] = []
  const n = alturas.length
  alturas.forEach((h, i) => {
    for (let k = 0; k < 8; k++) {
      const q = (i + k / 8) / n
      const u = k / 8
      pontos.push([t0 + (t1 - t0) * q, x0 + (x1 - x0) * q, -h * 4 * u * (1 - u)])
    }
  })
  pontos.push([t1, x1, 0])
  return pontos
}

// O gatinho dá uma patada no novelo, corre atrás, devolve e volta correndo.
function novelo(): string {
  const T = 9
  const chao = ALTURA - 2 - 22
  const bola = [
    [0, 44, 0],
    [0.07, 44, 0],
    ...saltos(0.07, 0.42, 44, 340, [17, 11, 6, 3]).slice(0),
    [0.56, 340, 0],
    ...saltos(0.57, 0.9, 340, 44, [14, 8, 4]).slice(0),
    [1, 44, 0],
  ] as [number, number, number][]
  const gato: [number, number, number][] = [[0, 14, chao], [0.14, 14, chao], [0.46, 304, chao], [0.6, 304, chao], [0.94, 14, chao], [1, 14, chao]]
  const novelo = `<g>${caminho(bola, T)}<circle cx="0" cy="${ALTURA - 7}" r="5" fill="#d94f8a"/><path d="M-3 ${ALTURA - 9}q3 3 6 0M-4 ${ALTURA - 6}q4 3 8 0" fill="none" stroke="#f6c4d9" stroke-width="1"/></g>`
  const patinha = `<g>${visivel([[0.04, 0.09], [0.53, 0.58]], T)}${sprite(PATADA, 2)}</g>`
  const parado = `<g>${visivel([[0, 0.04], [0.09, 0.14], [0.46, 0.53], [0.58, 0.6], [0.94, 1]], T)}${sprite(SENTADO, 2)}</g>`
  const direita = `<g>${visivel([[0.14, 0.46]], T)}${passos('direita', 0.32)}</g>`
  const esquerda = `<g>${visivel([[0.6, 0.94]], T)}${passos('esquerda', 0.32)}</g>`
  const chaoLinha = `<rect x="4" y="${ALTURA - 2}" width="${LARGURA - 8}" height="1" fill="#e8a33d" opacity="0.25"/>`
  return chaoLinha + novelo + `<g>${caminho(gato, T)}${parado}${patinha}${direita}${esquerda}</g>`
}

const CABECA = [
  'O.........O',
  'OO.......OO',
  'OOOOOOOOOOO',
  'ODOOOOOOODO',
  'OOOOOOOOOOO',
  'OOOOOOOOOOO',
  'OOOOOPOOOOO',
  'OOOOEEEOOOO',
  '.OOOOOOOOO.',
]

// O gatinho surge de baixo em três pontos da faixa, espia, pisca e desce.
function surgindo(): string {
  const T = 8
  const FORA = ALTURA + 2
  const ALTO = 4
  const pisca = '<animate attributeName="height" calcMode="discrete" values="6;2;6" keyTimes="0;0.9;0.96" dur="1.9s" repeatCount="indefinite"/>'
  const cabeca = (x: number, a: number, b: number) => {
    const y = 0
    const p: [number, number, number][] = [
      [0, x, FORA], [a, x, FORA], [a + 0.04, x, 16], [a + 0.09, x, 16], [a + 0.13, x, ALTO], [b - 0.05, x, ALTO], [b, x, FORA], [1, x, FORA],
    ]
    return `<g>${caminho(p, T)}${sprite(CABECA, 3, 0, y)}<rect x="6" y="12" width="6" height="6" fill="${CORES.E}">${pisca}</rect><rect x="21" y="12" width="6" height="6" fill="${CORES.E}">${pisca}</rect></g>`
  }
  return cabeca(50, 0.02, 0.3) + cabeca(185, 0.36, 0.64) + cabeca(320, 0.7, 0.97)
}

const CINZA_LINHA = '#8a8f95'
// O que o gatinho escreve e rabisca: não pode ser cinza, senão se confunde com o gatinho cinza.
const TINTA = '#2fa8a0'

// Sentado, balançando a cauda e piscando.
function gatoSentado(x: number): string {
  const corpo = SENTADO.map(l => l.replace(/T/g, '.'))
  const quadro = (linhas: string[], de: number, ate: number) => `<g>${sprite(linhas, 2, 0, 6)}<animate attributeName="opacity" calcMode="discrete" values="${de};${ate}" keyTimes="0;0.5" dur="1.2s" repeatCount="indefinite"/></g>`
  const cauda = quadro(['T..', 'T..', 'TT.', '.T.'], 1, 0) + quadro(['...', 'TT.', '.TT', '..T'], 0, 1)
  const olhos = `<g fill="${CORES.O}" opacity="0"><rect x="16" y="6" width="2" height="2"/><rect x="20" y="6" width="2" height="2"/><animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes="0;0.92;0.97" dur="2.6s" repeatCount="indefinite"/></g>`
  return `<g transform="translate(${x} 8)">${cauda}${sprite(corpo, 2)}${olhos}</g>`
}

// Sentado, batendo a pata sem parar.
function gatoBatendo(x: number, dur: number): string {
  const liga = (de: number, ate: number) => `<animate attributeName="opacity" calcMode="discrete" values="${de};${ate}" keyTimes="0;0.5" dur="${dur}s" repeatCount="indefinite"/>`
  return `<g transform="translate(${x} 8)"><g>${liga(1, 0)}${sprite(SENTADO, 2)}</g><g>${liga(0, 1)}${sprite(PATADA, 2)}</g></g>`
}

// Aparece em sequência ao longo do ciclo, como algo sendo escrito.
function surge(i: number, total: number, conteudo: string, dur: number): string {
  const a = +(((i + 1) / (total + 3)).toFixed(3))
  return `<g opacity="0">${conteudo}${visivel([[a, 0.97]], dur)}</g>`
}

const INTERROGACAO = ['.PPP.', 'P...P', '....P', '...P.', '..P..', '.....', '..P..']

// Com uma pergunta aberta: sentado e com o ponto de interrogação pulando. Acima da pergunta o app não aceita tamanho e
// estica o desenho: a largura grande mantém o gatinho pequeno, no canto.
export function desenharEsperando(cor: Cor = 'laranja', largura = 70, x = 4): string {
  const pula = `<animateTransform attributeName="transform" type="translate" values="${x + 34} 6;${x + 34} 2;${x + 34} 6" dur="1s" repeatCount="indefinite"/>`
  return pintar(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} 32" width="${largura}" height="32" shape-rendering="crispEdges">${gatoSentado(x)}<g>${pula}${sprite(INTERROGACAO, 2)}</g></svg>`, cor)
}

// Enviando o pedido: corre de uma ponta à outra.
function correndo(): string {
  const T = 3
  const p: [number, number, number][] = [[0, 6, 8], [1, LARGURA - 34, 8]]
  return `<g>${caminho(p, T)}${passos('direita', 0.24)}</g>`
}

// Pensando: sentado, com bolinhas subindo até um balão de reticências.
function pensando(): string {
  const T = 3
  const bola = (i: number, x: number, y: number, r: number) => surge(i, 5, `<circle cx="${x}" cy="${y}" r="${r}" fill="${CINZA_LINHA}"/>`, T)
  const balao = surge(2, 5, `<rect x="58" y="3" width="40" height="16" rx="7" fill="none" stroke="${CINZA_LINHA}" stroke-width="2"/>`, T)
  const pontos = [3, 4, 5].map((i, k) => surge(i, 5, `<rect x="${67 + k * 8}" y="10" width="4" height="3" fill="${CINZA_LINHA}"/>`, T)).join('')
  return gatoSentado(14) + bola(0, 46, 20, 1.5) + bola(1, 52, 15, 2) + balao + pontos
}

// Respondendo: bate no teclado e o texto vai aparecendo.
function digitando(): string {
  const T = 3.5
  const teclado = `<rect x="48" y="24" width="34" height="5" fill="${CINZA_LINHA}"/>`
  const letras = Array.from({ length: 14 }, (_, i) => surge(i, 14, `<rect x="${92 + i * 12}" y="16" width="${i % 4 === 3 ? 4 : 9}" height="3" fill="${TINTA}"/>`, T)).join('')
  return gatoBatendo(14, 0.28) + teclado + letras
}

// Rodando comando: aperta botões, e as linhas saem na tela.
function comando(): string {
  const T = 3
  const botoes = ['#35b87a', '#e8c23d', '#e0567f'].map((cor, i) => {
    const a = +((i / 3).toFixed(3))
    const b = +(((i + 1) / 3).toFixed(3))
    return `<rect x="${50 + i * 10}" y="20" width="7" height="7" fill="${CINZA_LINHA}"/><rect x="${50 + i * 10}" y="20" width="7" height="7" fill="${cor}" opacity="0">${visivel([[a === 0 ? 0 : a, b]], 0.9)}</rect>`
  }).join('')
  const tela = `<rect x="88" y="4" width="130" height="25" fill="#16201e" stroke="${CINZA_LINHA}" stroke-width="2"/>`
  const linhas = [[96, 9, 60], [96, 15, 96], [96, 21, 40]].map(([x, y, w], i) => surge(i, 3, `<rect x="${x}" y="${y}" width="${w}" height="2" fill="#35b87a"/>`, T)).join('')
  return gatoBatendo(14, 0.3) + botoes + tela + linhas
}

// Lendo ou buscando: anda entre as folhas, farejando cada uma.
function lendo(): string {
  const T = 9
  const folha = (x: number) => `<rect x="${x}" y="11" width="15" height="19" fill="#f4f1e8" stroke="${CINZA_LINHA}" stroke-width="1"/><rect x="${x + 3}" y="15" width="9" height="1" fill="${CINZA_LINHA}"/><rect x="${x + 3}" y="19" width="9" height="1" fill="${CINZA_LINHA}"/><rect x="${x + 3}" y="23" width="6" height="1" fill="${CINZA_LINHA}"/>`
  const folhas = [70, 150, 230, 310].map(folha).join('')
  const anda: [number, number, number][] = [[0, 14, 8], [0.48, 340, 8], [0.52, 340, 8], [1, 14, 8]]
  const fareja = `<g fill="${CINZA_LINHA}"><rect x="28" y="12" width="2" height="2"/><rect x="32" y="9" width="2" height="2"/><animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.5" dur="0.6s" repeatCount="indefinite"/></g>`
  const direita = `<g>${visivel([[0, 0.5]], T)}${passos('direita', 0.4)}${fareja}</g>`
  const esquerda = `<g opacity="0">${visivel([[0.5, 1]], T)}${passos('esquerda', 0.4)}</g>`
  return folhas + `<g>${caminho(anda, T)}${direita}${esquerda}</g>`
}

// Editando ou criando arquivo: rabisca uma linha com o lápis.
function editando(): string {
  const T = 6
  const n = 23
  const passo = 14
  const pontos = Array.from({ length: n + 1 }, (_, i): [number, number] => [48 + i * passo, i % 2 === 0 ? 24 : 16])
  const tamanho = +(n * Math.hypot(passo, 8)).toFixed(1)
  const risco = `<polyline points="${pontos.map(p => p.join(',')).join(' ')}" fill="none" stroke="${TINTA}" stroke-width="2" stroke-dasharray="${tamanho}" stroke-dashoffset="${tamanho}" shape-rendering="auto"><animate attributeName="stroke-dashoffset" values="${tamanho};0;0" keyTimes="0;0.9;1" dur="${T}s" repeatCount="indefinite"/></polyline>`
  const percurso: [number, number, number][] = [...pontos.map((p, i): [number, number, number] => [(i / n) * 0.9, p[0], p[1]]), [1, pontos[n]![0], pontos[n]![1]]]
  const lapis = `<g>${caminho(percurso, T)}<rect x="0" y="-10" width="3" height="9" fill="#e8c23d"/><rect x="0" y="-11" width="3" height="2" fill="#e0567f"/><rect x="1" y="-1" width="1" height="1" fill="#2b1a0a"/></g>`
  return gatoBatendo(14, 0.4) + risco + lapis
}

// As pequenas, para a linha de status: em pixel, 80 por 32.
export const LARGURA_PEQUENA = 80
export const PEQUENAS_PIXEL = ['bolinhas', 'deitado', 'caixa', 'borboleta'] as const
export type PequenaPixel = (typeof PEQUENAS_PIXEL)[number]

// Quatro bolinhas trocando nas diagonais. De vez em quando o gatinho salta e derruba todas.
function bolinhas(): string {
  const T = 8
  const PASSOS = 16
  const momento = 0.72
  const CANTOS: [number, number][] = [[50, 8], [62, 8], [62, 20], [50, 20]]
  const lugar = [0, 1, 2, 3]
  const trilhas: [number, number, number][][] = lugar.map(l => [[0, CANTOS[l]![0], CANTOS[l]![1]]])
  for (let p = 0; p < PASSOS; p++) {
    const [a, b] = p % 2 === 0 ? [0, 2] : [1, 3]
    const u = lugar.indexOf(a)
    const v = lugar.indexOf(b)
    lugar[u] = b
    lugar[v] = a
    lugar.forEach((l, n) => trilhas[n]!.push([(p + 0.4) / PASSOS, CANTOS[l]![0], CANTOS[l]![1]], [(p + 1) / PASSOS, CANTOS[l]![0], CANTOS[l]![1]]))
  }
  const cor = '#d97757'
  const bola = (rastro: [number, number, number][]) => `<g>${caminho(rastro, T)}<rect x="0" y="0" width="5" height="5" fill="${cor}"/></g>`
  const girando = `<g>${visivel([[0, momento], [0.96, 1]], T)}${trilhas.map(bola).join('')}</g>`
  const queda = (x: number, y: number, dx: number): [number, number, number][] => [[0, x, y], [momento, x, y], [momento + 0.035, x + dx * 0.5, 27], [momento + 0.06, x + dx * 0.75, 21], [momento + 0.085, x + dx, 27], [momento + 0.1, x + dx * 1.1, 24], [momento + 0.115, x + dx * 1.2, 27], [1, x + dx * 1.2, 27]]
  const noChao = `<g opacity="0">${visivel([[momento, 0.96]], T)}${([[50, 8, -8], [62, 8, 7], [62, 20, 3], [50, 20, -5]] as [number, number, number][]).map(([x, y, dx]) => bola(queda(x, y, dx))).join('')}</g>`
  const anda: [number, number, number][] = [[0, -30, 8], [0.62, -30, 8], [0.69, 8, 0], [momento, 36, 8], [0.86, 36, 8], [0.96, -30, 8], [1, -30, 8]]
  const voando = `<g opacity="0">${visivel([[0.62, momento]], T)}${sprite(ANDA_B, 2)}</g>`
  const pousado = `<g opacity="0">${visivel([[momento, 0.86]], T)}${sprite(SENTADO, 2)}</g>`
  const sai = `<g opacity="0">${visivel([[0.86, 0.96]], T)}${passos('esquerda', 0.28)}</g>`
  return girando + noChao + `<g>${caminho(anda, T)}${voando}${pousado}${sai}</g>`
}

const DEITADO_BASE = [
  '.....O....O..O.O',
  '.....O....O..OOO',
  '....BBBBBBBOEOEO',
  '...OBBBBBBBOOPOO',
  'T..OOOOOOOOOOOOO',
  'TT.OODODODOOOOO.',
  '.TTOOOOOOOOOOO..',
]
const PATA_FRENTE = ['.....O..........', '.....O....O.....', ...DEITADO_BASE]
const PATA_TRAS = ['..........O.....', '.....O....O.....', ...DEITADO_BASE]

// Deitado de costas no chão, passando o novelo de uma pata para a outra.
function deitado(): string {
  const T = 1.4
  const X = 22
  const Y = ALTURA - 19
  const liga = (de: number, ate: number) => `<animate attributeName="opacity" calcMode="discrete" values="${de};${ate}" keyTimes="0;0.5" dur="${T}s" repeatCount="indefinite"/>`
  const gato = `<g transform="translate(${X} ${Y})"><g>${liga(1, 0)}${sprite(PATA_FRENTE, 2)}</g><g>${liga(0, 1)}${sprite(PATA_TRAS, 2)}</g></g>`
  const pataA = X + 10
  const pataB = X + 20
  const voo: [number, number, number][] = [[0, pataA, Y - 4], [0.25, (pataA + pataB) / 2, 1], [0.5, pataB, Y - 4], [0.75, (pataA + pataB) / 2, 1], [1, pataA, Y - 4]]
  const bola = `<g>${caminho(voo, T)}<rect x="0" y="0" width="6" height="6" fill="#d94f8a"/><rect x="1" y="1" width="3" height="1" fill="#f6c4d9"/></g>`
  const chao = `<rect x="14" y="${ALTURA - 1}" width="52" height="1" fill="${CORES.O}" opacity="0.3"/>`
  return chao + gato + bola
}

// Surgindo de dentro de uma caixa, espiando e voltando.
function caixa(): string {
  const T = 3.2
  const sobe: [number, number, number][] = [[0, 29, 24], [0.2, 29, 24], [0.3, 29, 4], [0.75, 29, 4], [0.85, 29, 24], [1, 29, 24]]
  const cabeca = `<g>${caminho(sobe, T)}${sprite(CABECA, 2)}<rect x="4" y="8" width="4" height="4" fill="${CORES.E}"/><rect x="14" y="8" width="4" height="4" fill="${CORES.E}"/></g>`
  const frente = '<rect x="22" y="20" width="36" height="12" fill="#9c6b3f"/><rect x="22" y="20" width="36" height="2" fill="#c49a6c"/><rect x="38" y="20" width="4" height="12" fill="#c49a6c"/>'
  return cabeca + frente
}

// Sentado, tentando pegar uma borboleta.
function borboleta(): string {
  const T = 4
  const voo: [number, number, number][] = [[0, 44, 16], [0.2, 54, 6], [0.4, 70, 12], [0.6, 62, 22], [0.8, 48, 8], [1, 44, 16]]
  const asas = '<animate attributeName="opacity" calcMode="discrete" values="1;0.35" keyTimes="0;0.5" dur="0.24s" repeatCount="indefinite"/>'
  const inseto = `<g>${caminho(voo, T)}<g>${asas}<rect x="-4" y="-3" width="3" height="3" fill="#e0567f"/><rect x="2" y="-3" width="3" height="3" fill="#e0567f"/></g><rect x="0" y="-3" width="1" height="5" fill="${CINZA_LINHA}"/></g>`
  return gatoBatendo(8, 1.6) + inseto
}

const DESENHOS_PEQUENOS: Record<PequenaPixel, () => string> = { bolinhas, deitado, caixa, borboleta }

export function desenharPequena(nome: PequenaPixel, cor: Cor = 'laranja'): string {
  return pintar(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_PEQUENA} ${ALTURA}" width="${LARGURA_PEQUENA}" height="${ALTURA}" shape-rendering="crispEdges">${DESENHOS_PEQUENOS[nome]()}</svg>`, cor)
}

// A fase que a faixa mostra: ferramenta rodando vale sobre tudo; ferramenta já terminada volta a pensar.
export function faseDaFaixa(ferramenta: string | null, ultima: string | null): string {
  if (ferramenta) return 'tool-use'
  if (ultima === 'tool-use' || ultima === 'tool-input') return 'thinking'
  return ultima ?? 'requesting'
}

// Qual animação combina com o que o Claude está fazendo agora. A fixada por comando vale sobre todas.
export function animacaoDe(modo: string, ferramenta: string | null, sorteada: Nome, fixa: Nome | null): Nome {
  if (fixa) return fixa
  if (modo === 'requesting') return 'correndo'
  if (modo === 'responding') return 'digitando'
  if (modo === 'tool-input') return 'editando'
  if (modo !== 'tool-use') return sorteada
  if (ferramenta && /^(Edit|Write|NotebookEdit|MultiEdit)$/.test(ferramenta)) return 'editando'
  if (ferramenta && /^(Read|Grep|Glob|WebFetch|WebSearch|LS)$/.test(ferramenta)) return 'lendo'
  return 'comando'
}

const DESENHOS: Record<Nome, () => string> = { correndo, pensando, digitando, comando, lendo, editando, novelo, surgindo }

export function desenhar(nome: Nome, cor: Cor = 'laranja'): string {
  return pintar(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA} ${ALTURA}" width="${LARGURA}" height="${ALTURA}" shape-rendering="crispEdges">${DESENHOS[nome]()}</svg>`, cor)
}

// Sorteia outra, nunca a mesma de agora; a semente vem de fora para o teste poder fixá-la.
export function sortear(atual: Nome | null, semente: number): Nome {
  const opcoes = SORTEIO.filter(n => n !== atual)
  return opcoes[Math.abs(Math.floor(semente)) % opcoes.length] ?? 'pensando'
}
