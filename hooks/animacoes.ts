// As animações em pixel, em SVG puro (SMIL, sem script). Sem dependências.
// A faixa tem 32 de altura: a linha do app não passa de cerca de 32 e encolhe o desenho que passar.
// Na largura, a faixa ocupa a linha toda: as posições vão em porcentagem. LARGURA é só a referência da faixa da pergunta.
export const LARGURA = 400
export const ALTURA = 32
export const NOMES = ['correndo', 'pensando', 'digitando', 'comando', 'lendo', 'editando', 'novelo', 'surgindo', 'perseguicao', 'pulando', 'encontro'] as const
export type Nome = (typeof NOMES)[number]
// O sorteio vale para o momento em que o Claude pensa.
export const SORTEIO: readonly Nome[] = ['pensando', 'novelo', 'surgindo', 'perseguicao', 'pulando', 'encontro']

export const CORES_GATO = ['laranja', 'cinza'] as const
export type Cor = (typeof CORES_GATO)[number]
// O gato é desenhado em laranja; o cinza troca os tons no fim, e os dois aparecem bem em fundo claro e escuro.
const TONS_CINZA: Record<string, string> = { '#e8a33d': '#9aa0a6', '#b5701f': '#6b7076', '#c98a2e': '#80858a', '#f4dcae': '#d3d6da' }
export function pintar(svg: string, cor: Cor): string {
  if (cor === 'laranja') return svg
  return Object.entries(TONS_CINZA).reduce((s, [de, para]) => s.split(de).join(para), svg)
}

const CORES: Record<string, string> = { O: '#e8a33d', D: '#b5701f', E: '#2b1a0a', P: '#e0567f', B: '#f4dcae', T: '#c98a2e', M: '#a0703f', H: '#6e4a2a', N: '#3a2616', L: '#f08a24', F: '#4caf50', G: '#8a96a3', K: '#16201e', V: '#8b6cd9', W: '#ffffff', U: '#4b3399', Y: '#e8c23d' }

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

// Ponto na faixa larga: [fração do ciclo, % da largura, px a mais, y]. A posição é a % somada aos px, e as duas andam
// juntas, então o desenho chega exato à ponta em qualquer largura.
type PontoLargo = [number, number, number, number]

function trilha(pontos: PontoLargo[], dur: number, conteudo: string): string {
  const f = (n: number) => +n.toFixed(4)
  const tempos = pontos.map(p => f(p[0])).join(';')
  const x = `<animate attributeName="x" values="${pontos.map(p => `${f(p[1])}%`).join(';')}" keyTimes="${tempos}" dur="${dur}s" repeatCount="indefinite"/>`
  return `<svg x="${f(pontos[0]?.[1] ?? 0)}%" overflow="visible">${x}<g>${caminho(pontos.map(p => [p[0], p[2], p[3]]), dur)}${conteudo}</g></svg>`
}

// Parado num ponto da faixa larga.
function em(porcento: number, px: number, y: number, conteudo: string): string {
  return `<svg x="${porcento}%" overflow="visible"><g transform="translate(${px} ${y})">${conteudo}</g></svg>`
}

// Leva u de 0 a 1 para um ponto entre a e b, cada um [%, px].
function entre(u: number, a: [number, number], b: [number, number]): [number, number] {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
}

const chaoLinha = () => `<rect x="0.5%" y="${ALTURA - 2}" width="99%" height="1" fill="#e8a33d" opacity="0.25"/>`

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
  const A: [number, number] = [0, 44]
  const B: [number, number] = [100, -40]
  const bolaU = [
    [0, 0, 0],
    [0.07, 0, 0],
    ...saltos(0.07, 0.42, 0, 1, [17, 11, 6, 3]),
    [0.56, 1, 0],
    ...saltos(0.57, 0.9, 1, 0, [14, 8, 4]),
    [1, 0, 0],
  ] as [number, number, number][]
  const bola = bolaU.map(([t, u, y]): PontoLargo => [t, ...entre(u, A, B), y])
  const gato = ([[0, 0], [0.14, 0], [0.46, 1], [0.6, 1], [0.94, 0], [1, 0]] as [number, number][]).map(([t, u]): PontoLargo => [t, ...entre(u, [0, 14], [100, -76]), chao])
  const novelo = trilha(bola, T, `<circle cx="0" cy="${ALTURA - 7}" r="5" fill="#d94f8a"/><path d="M-3 ${ALTURA - 9}q3 3 6 0M-4 ${ALTURA - 6}q4 3 8 0" fill="none" stroke="#f6c4d9" stroke-width="1"/>`)
  const patinha = `<g>${visivel([[0.04, 0.09], [0.53, 0.58]], T)}${sprite(PATADA, 2)}</g>`
  const parado = `<g>${visivel([[0, 0.04], [0.09, 0.14], [0.46, 0.53], [0.58, 0.6], [0.94, 1]], T)}${sprite(SENTADO, 2)}</g>`
  const direita = `<g>${visivel([[0.14, 0.46]], T)}${passos('direita', 0.32)}</g>`
  const esquerda = `<g>${visivel([[0.6, 0.94]], T)}${passos('esquerda', 0.32)}</g>`
  return chaoLinha() + novelo + trilha(gato, T, parado + patinha + direita + esquerda)
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
    const p: PontoLargo[] = [
      [0, x, -16, FORA], [a, x, -16, FORA], [a + 0.04, x, -16, 16], [a + 0.09, x, -16, 16], [a + 0.13, x, -16, ALTO], [b - 0.05, x, -16, ALTO], [b, x, -16, FORA], [1, x, -16, FORA],
    ]
    return trilha(p, T, `${sprite(CABECA, 3)}<rect x="6" y="12" width="6" height="6" fill="${CORES.E}">${pisca}</rect><rect x="21" y="12" width="6" height="6" fill="${CORES.E}">${pisca}</rect>`)
  }
  return cabeca(12, 0.02, 0.3) + cabeca(50, 0.36, 0.64) + cabeca(88, 0.7, 0.97)
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
  return trilha([[0, 0, 6, 8], [1, 100, -34, 8]], 3, passos('direita', 0.24))
}

// Pensando: sentado, com bolinhas subindo até um balão de reticências.
function pensando(c: Companheiro): string {
  const T = 3
  const bola = (i: number, x: number, y: number, r: number) => surge(i, 5, `<circle cx="${x}" cy="${y}" r="${r}" fill="${CINZA_LINHA}"/>`, T)
  const balao = surge(2, 5, `<rect x="58" y="3" width="40" height="16" rx="7" fill="none" stroke="${CINZA_LINHA}" stroke-width="2"/>`, T)
  const pontos = [3, 4, 5].map((i, k) => surge(i, 5, `<rect x="${67 + k * 8}" y="10" width="4" height="3" fill="${CINZA_LINHA}"/>`, T)).join('')
  // Na outra ponta, o companheiro pensa junto: três pontinhos sobem em cima dele.
  const pontinhos = [0, 1, 2].map(i => surge(i, 3, `<rect x="${c.largura / 2 - 7 + i * 5}" y="-6" width="3" height="3" fill="${CINZA_LINHA}"/>`, T)).join('')
  const companheiro = em(100, -c.largura - 12, yDe(c), espelharSe(c, c.parado()) + pontinhos)
  return gatoSentado(14) + bola(0, 46, 20, 1.5) + bola(1, 52, 15, 2) + balao + pontos + companheiro
}

// Respondendo: bate no teclado e o texto vai aparecendo.
function digitando(): string {
  const T = 3.5
  const teclado = `<rect x="48" y="24" width="34" height="5" fill="${CINZA_LINHA}"/>`
  // As letras vão de 92 px até perto da ponta direita, em qualquer largura.
  const n = 32
  const letras = Array.from({ length: n }, (_, i) => surge(i, n, em(...entre(i / (n - 1), [0, 92], [100, -12]).map(v => +v.toFixed(2)) as [number, number], 16, `<rect width="${i % 5 === 4 ? 3 : 8}" height="3" fill="${TINTA}"/>`), T)).join('')
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
  // A tela fica pequena, ao lado do gatinho: as linhas do comando correm nela.
  const tela = `<rect x="86" y="3" width="44" height="22" fill="#16201e" stroke="${CINZA_LINHA}" stroke-width="2"/><rect x="104" y="25" width="8" height="4" fill="${CINZA_LINHA}"/>`
  const linhas = [[8, 24], [13, 32], [18, 14]].map(([y, w], i) => surge(i, 3, `<rect x="91" y="${y}" width="${w}" height="2" fill="#35b87a"/>`, T)).join('')
  // Da tela sai uma esteira até a ponta direita. Os arquivos prontos, como builds, descem por ela até a caixa do fim.
  const esteira = `<rect x="134" y="${ALTURA - 3}" height="2" fill="${CINZA_LINHA}" width="100" style="width:calc(100% - 134px - 34px)"/>`
  const caixaFim = em(100, -32, 14, '<rect width="28" height="16" fill="#9c6b3f"/><rect width="28" height="3" fill="#c49a6c"/><rect x="12" width="4" height="16" fill="#c49a6c"/>')
  const CORES_BUILD = ['#35b87a', '#e8c23d', '#5b8def', '#e0567f']
  const VIAGEM = 4.8
  const arquivos = CORES_BUILD.map((cor, i) => {
    const comeco = `begin="-${(i * VIAGEM / CORES_BUILD.length).toFixed(2)}s"`
    const x = `<animate attributeName="x" values="0%;0%;100%;100%" keyTimes="0;0.08;0.92;1" dur="${VIAGEM}s" ${comeco} repeatCount="indefinite"/>`
    // Sai de dentro da tela subindo, anda na esteira e cai dentro da caixa.
    const anda = `<animateTransform attributeName="transform" type="translate" values="118 10;136 ${ALTURA - 15};-26 ${ALTURA - 15};-26 ${ALTURA - 4}" keyTimes="0;0.08;0.92;1" dur="${VIAGEM}s" ${comeco} repeatCount="indefinite"/>`
    const some = `<animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes="0;0.04;0.97" dur="${VIAGEM}s" ${comeco} repeatCount="indefinite"/>`
    const arquivo = `<rect width="10" height="12" fill="#f4f1e8" stroke="${CINZA_LINHA}" stroke-width="1"/><rect x="0" y="0" width="10" height="3" fill="${cor}"/><rect x="2" y="6" width="6" height="1" fill="${CINZA_LINHA}"/><rect x="2" y="8" width="4" height="1" fill="${CINZA_LINHA}"/>`
    return `<svg x="0%" overflow="visible">${x}<g opacity="0">${some}<g>${anda}${arquivo}</g></g></svg>`
  }).join('')
  return gatoBatendo(14, 0.3) + botoes + esteira + arquivos + tela + linhas + caixaFim
}

// Lendo ou buscando: anda entre as folhas, farejando cada uma.
function lendo(): string {
  const T = 9
  const folha = (x: number) => `<rect x="${x}" y="11" width="15" height="19" fill="#f4f1e8" stroke="${CINZA_LINHA}" stroke-width="1"/><rect x="${x + 3}" y="15" width="9" height="1" fill="${CINZA_LINHA}"/><rect x="${x + 3}" y="19" width="9" height="1" fill="${CINZA_LINHA}"/><rect x="${x + 3}" y="23" width="6" height="1" fill="${CINZA_LINHA}"/>`
  const folhas = [18, 34, 50, 66, 82].map(p => em(p, 0, 0, folha(0))).join('')
  const anda: PontoLargo[] = [[0, 0, 14, 8], [0.48, 100, -40, 8], [0.52, 100, -40, 8], [1, 0, 14, 8]]
  const fareja = `<g fill="${CINZA_LINHA}"><rect x="28" y="12" width="2" height="2"/><rect x="32" y="9" width="2" height="2"/><animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.5" dur="0.6s" repeatCount="indefinite"/></g>`
  const direita = `<g>${visivel([[0, 0.5]], T)}${passos('direita', 0.4)}${fareja}</g>`
  const esquerda = `<g opacity="0">${visivel([[0.5, 1]], T)}${passos('esquerda', 0.4)}</g>`
  return folhas + trilha(anda, T, direita + esquerda)
}

// Editando ou criando arquivo: rabisca uma linha com o lápis.
function editando(): string {
  const T = 8
  const n = 36
  // O risco vai de 48 px até 8 px antes da ponta. Cada ponto é [%, px]: o mesmo para o risco e para o lápis.
  const ponto = (i: number): [number, number] => entre(i / n, [0, 48], [100, -8])
  const y = (i: number) => (i % 2 === 0 ? 24 : 16)
  // Uma linha não mistura % e px nas pontas: o risco é feito de pontinhos, e cada um aparece quando o lápis passa.
  const POR_TRECHO = 6
  const tracos = Array.from({ length: n * POR_TRECHO }, (_, k) => {
    const u = k / POR_TRECHO
    const i = Math.floor(u)
    const [p, x] = ponto(u)
    const yy = y(i) + (y(i + 1) - y(i)) * (u - i)
    const a = +((u / n) * 0.9 + 0.001).toFixed(4)
    return `<g opacity="0">${visivel([[a, 1]], T)}${em(+p.toFixed(3), +x.toFixed(2), +(yy - 1).toFixed(2), `<rect width="2" height="2" fill="${TINTA}"/>`)}</g>`
  }).join('')
  const percurso: PontoLargo[] = [...Array.from({ length: n + 1 }, (_, i): PontoLargo => [(i / n) * 0.9, ...ponto(i), y(i)]), [1, ...ponto(n), y(n)]]
  const lapis = trilha(percurso, T, '<rect x="0" y="-10" width="3" height="9" fill="#e8c23d"/><rect x="0" y="-11" width="3" height="2" fill="#e0567f"/><rect x="1" y="-1" width="1" height="1" fill="#2b1a0a"/>')
  return gatoBatendo(14, 0.4) + tracos + lapis
}

// Os companheiros do gatinho: desenhos nossos, sorteados a cada pedido para a faixa variar.
export const COMPANHEIROS = ['capivara', 'robo', 'bolinha'] as const
export type NomeCompanheiro = (typeof COMPANHEIROS)[number]

type Companheiro = {
  largura: number
  altura: number
  // Parado, com o jeito próprio de cada um (piscar, cursor, chaves flutuando).
  parado: () => string
  andando: (dur: number, direcao: 'direita' | 'esquerda') => string
}

function alterna(a: string, b: string, dur: number): string {
  const liga = (de: number, ate: number) => `<animate attributeName="opacity" calcMode="discrete" values="${de};${ate}" keyTimes="0;0.5" dur="${dur}s" repeatCount="indefinite"/>`
  return `<g>${liga(1, 0)}${a}</g><g opacity="0">${liga(0, 1)}${b}</g>`
}

function espelharEm(largura: number, conteudo: string): string {
  return `<g transform="translate(${largura} 0) scale(-1 1)">${conteudo}</g>`
}

// Capivara de lado, olhando para a direita, com uma laranja na cabeça.
const CAPIVARA_CORPO = [
  '............LF..',
  '...........LLL..',
  '..........H..H..',
  '..MMMMMMMMMMMMM.',
  '.MMMMMMMMMMMEMMM',
  'MMMMMMMMMMMMMMMN',
  'MMMMMMMMMMMMMMMM',
  'MMMMMMMMMMMMMMM.',
  '.MMMMMMMMMMMMM..',
]
const CAPIVARA_A = [...CAPIVARA_CORPO, '.HH..HH..HH.HH..']
const CAPIVARA_B = [...CAPIVARA_CORPO, '..HH..HH.HH..HH.']
const capivara: Companheiro = {
  largura: 32,
  altura: 20,
  parado: () => {
    const pisca = `<rect x="24" y="8" width="2" height="2" fill="#a0703f" opacity="0"><animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes="0;0.9;0.96" dur="3.1s" repeatCount="indefinite"/></rect>`
    return sprite(CAPIVARA_A, 2) + pisca
  },
  andando: (dur, direcao) => {
    const passo = alterna(sprite(CAPIVARA_A, 2), sprite(CAPIVARA_B, 2, 0, -1), dur * 1.4)
    return direcao === 'esquerda' ? espelharEm(32, passo) : passo
  },
}

// Robozinho com uma tela no rosto: o olho é um cursor de terminal.
const ROBO_CORPO = [
  '.....PP.....',
  '......G.....',
  '.GGGGGGGGGG.',
  '.GKKKKKKKKG.',
  '.GKKKKKKKKG.',
  '.GKKKKKKKKG.',
  '.GGGGGGGGGG.',
  'GG.GGGGGG.GG',
  '...GGGGGG...',
]
const ROBO_A = [...ROBO_CORPO, '...G....G...']
const ROBO_B = [...ROBO_CORPO, '..G......G..']
const roboRosto = () => {
  const seta = '<g fill="#35b87a"><rect x="6" y="7" width="2" height="2"/><rect x="8" y="9" width="2" height="2"/><rect x="6" y="11" width="2" height="1"/></g>'
  const cursor = '<rect x="12" y="10" width="5" height="2" fill="#35b87a"><animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.5" dur="0.8s" repeatCount="indefinite"/></rect>'
  return seta + cursor
}
const robo: Companheiro = {
  largura: 24,
  altura: 20,
  parado: () => sprite(ROBO_A, 2) + roboRosto(),
  andando: dur => alterna(sprite(ROBO_A, 2) + roboRosto(), `<g transform="translate(0 -1)">${sprite(ROBO_B, 2)}${roboRosto()}</g>`, dur),
}

// Bolinha de código: um bichinho roxo que quica, com chaves { } flutuando em cima.
const BOLINHA_A = [
  '...VVVVV...',
  '..VVVVVVV..',
  '.VVVVVVVVV.',
  'VVWVVVVVWVV',
  'VVWVVVVVWVV',
  'VVVVVVVVVVV',
  'VVVVUUUVVVV',
  '.VVVVVVVVV.',
  '..VVVVVVV..',
]
// Achatada, como quando bate no chão.
const BOLINHA_B = [
  '..VVVVVVV..',
  '.VVVVVVVVV.',
  'VVWVVVVVWVV',
  'VVWVVVVVWVV',
  'VVVVVVVVVVV',
  'VVVVUUUVVVV',
  'VVVVVVVVVVV',
  '.VVVVVVVVV.',
]
const CHAVES = ['.UU...UU.', '.U.....U.', 'U.......U', '.U.....U.', '.UU...UU.']
const bolinha: Companheiro = {
  largura: 22,
  altura: 18,
  parado: () => {
    const flutua = `<g>${sprite(CHAVES, 2, 2, -12)}<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="1.4s" repeatCount="indefinite"/></g>`
    return sprite(BOLINHA_A, 2) + flutua
  },
  andando: dur => alterna(`<g transform="translate(0 -3)">${sprite(BOLINHA_A, 2)}</g>`, sprite(BOLINHA_B, 2, 0, 2), dur),
}

const QUEM: Record<NomeCompanheiro, Companheiro> = { capivara, robo, bolinha }
const yDe = (c: Companheiro) => ALTURA - 2 - c.altura

// No encontro e no pensando, a capivara parada olha para o gatinho, à esquerda.
function espelharSe(c: Companheiro, conteudo: string): string {
  return c === capivara ? espelharEm(c.largura, conteudo) : conteudo
}

// Estrelinhas amarelas que piscam no alto.
const ESTRELA = ['..Y..', 'Y.Y.Y', '.YYY.', 'Y.Y.Y', '..Y..']
const EXCLAMACAO = ['P', 'P', 'P', '.', 'P']
const CORACAO = ['.PP.PP.', 'PPPPPPP', 'PPPPPPP', '.PPPPP.', '..PPP..', '...P...']

// O companheiro atravessa a faixa com o gatinho atrás; na ponta, leva um susto e é a vez dele de correr atrás.
function perseguicao(c: Companheiro): string {
  const T = 9
  const ida = 0.42
  const pausa = 0.52
  const linear = (pts: [number, number, number][], y: number): PontoLargo[] => pts.map(([t, p, x]) => [t, p, x, y])
  const companheiro = linear([[0, 0, 40], [ida, 100, -40], [pausa, 100, -40], [0.96, 0, 40], [1, 0, 40]], yDe(c))
  const gato = linear([[0, 0, -30], [ida, 100, -80], [pausa, 100, -80], [0.96, 0, -30], [1, 0, -30]], 8)
  const susto = `<g opacity="0">${visivel([[ida + 0.01, pausa]], T)}${sprite(EXCLAMACAO, 2, c.largura / 2 - 1, -12)}</g>`
  const corpo = `<g>${visivel([[0, ida]], T)}${c.andando(0.3, 'direita')}</g><g opacity="0">${visivel([[ida, pausa]], T)}${espelharSe(c, c.parado())}</g><g opacity="0">${visivel([[pausa, 1]], T)}${c.andando(0.3, 'esquerda')}</g>${susto}`
  const gatoDireita = `<g>${visivel([[0, ida]], T)}${passos('direita', 0.28)}</g>`
  const gatoSentado2 = `<g opacity="0">${visivel([[ida, pausa]], T)}${sprite(SENTADO, 2)}</g>`
  const gatoEsquerda = `<g opacity="0">${visivel([[pausa, 1]], T)}${passos('esquerda', 0.22)}</g>`
  return chaoLinha() + trilha(gato, T, gatoDireita + gatoSentado2 + gatoEsquerda) + trilha(companheiro, T, corpo)
}

// O companheiro pula de caixa em caixa até a ponta e volta, com estrelinhas piscando no alto.
function pulando(c: Companheiro): string {
  const T = 10
  // Cada parada: [%, px, altura da caixa]. As caixas ficam nas paradas do meio.
  const paradas: [number, number, number][] = [[0, 6, 0], [18, 0, 4], [36, 0, 7], [54, 0, 5], [72, 0, 8], [100, -40, 0]]
  const caixas = paradas.filter(p => p[2] > 0).map(([p, x, h]) => em(p, x - 1, ALTURA - 2 - h, `<rect width="35" height="${h}" fill="#9c6b3f"/><rect width="35" height="2" fill="#c49a6c"/>`)).join('')
  const topo = (h: number) => yDe(c) - h
  const pulos = (lista: [number, number, number][], t0: number, t1: number): PontoLargo[] => {
    const pts: PontoLargo[] = []
    const n = lista.length - 1
    for (let i = 0; i < n; i++) {
      const [pa, xa, ha] = lista[i]!
      const [pb, xb, hb] = lista[i + 1]!
      // Fica um pouco parado em cada caixa antes de pular.
      const ta = t0 + (t1 - t0) * (i / n)
      const tb = t0 + (t1 - t0) * ((i + 1) / n)
      const tp = ta + (tb - ta) * 0.35
      pts.push([ta, pa, xa, topo(ha)], [tp, pa, xa, topo(ha)])
      for (let k = 1; k < 8; k++) {
        const u = k / 8
        const [p, x] = entre(u, [pa, xa], [pb, xb])
        pts.push([tp + (tb - tp) * u, p, x, topo(ha + (hb - ha) * u) - 6 * 4 * u * (1 - u)])
      }
    }
    const ult = lista[n]!
    pts.push([t1, ult[0], ult[1], topo(ult[2])])
    return pts
  }
  const caminhoTodo = [...pulos(paradas, 0, 0.46), ...pulos([...paradas].reverse(), 0.5, 0.96), [1, 0, 6, topo(0)] as PontoLargo]
  const estrelas = [10, 27, 45, 63, 81, 93].map((p, i) => {
    const a = +((i * 0.15) % 0.9).toFixed(3)
    return `<g opacity="0">${visivel([[a, +(a + 0.12).toFixed(3)]], 2.4)}${em(p, 0, 1, sprite(ESTRELA, 2))}</g>`
  }).join('')
  return chaoLinha() + caixas + estrelas + trilha(caminhoTodo, T, c.parado())
}

// O gatinho e o companheiro vêm das pontas, se encontram no meio, sobe um coração, e cada um volta para o seu lado.
function encontro(c: Companheiro): string {
  const T = 9
  const chega = 0.38
  const sai = 0.62
  const y = yDe(c)
  const companheiro: PontoLargo[] = [[0, 100, -40, y], [chega, 50, 6, y], [sai, 50, 6, y], [1, 100, -40, y]]
  const gato: PontoLargo[] = [[0, 0, 6, 8], [chega, 50, -32, 8], [sai, 50, -32, 8], [1, 0, 6, 8]]
  const coracao = `<g opacity="0">${visivel([[chega + 0.03, sai - 0.02]], T)}${trilha([[0, 50, -7, 10], [chega, 50, -7, 10], [sai, 50, -7, -2], [1, 50, -7, -2]], T, sprite(CORACAO, 2))}</g>`
  const gatoAnda = `<g>${visivel([[0, chega]], T)}${passos('direita', 0.3)}</g><g opacity="0">${visivel([[chega, sai]], T)}${sprite(SENTADO, 2)}</g><g opacity="0">${visivel([[sai, 1]], T)}${passos('esquerda', 0.3)}</g>`
  const anda = `<g>${visivel([[0, chega]], T)}${c.andando(0.3, 'esquerda')}</g><g opacity="0">${visivel([[chega, sai]], T)}${espelharSe(c, c.parado())}</g><g opacity="0">${visivel([[sai, 1]], T)}${c.andando(0.3, 'direita')}</g>`
  return chaoLinha() + trilha(gato, T, gatoAnda) + trilha(companheiro, T, anda) + coracao
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

const DESENHOS: Record<Nome, (c: Companheiro) => string> = { correndo, pensando, digitando, comando, lendo, editando, novelo, surgindo, perseguicao, pulando, encontro }

// Sem viewBox e com largura 100%: a faixa ocupa a linha toda, e o pixel fica com o mesmo tamanho em qualquer largura.
export function desenhar(nome: Nome, cor: Cor = 'laranja', companheiro: NomeCompanheiro = 'capivara'): string {
  return pintar(`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${ALTURA}" shape-rendering="crispEdges">${DESENHOS[nome](QUEM[companheiro])}</svg>`, cor)
}

// O companheiro da vez: troca a cada pedido, junto com a cena.
export function companheiroDe(semente: number): NomeCompanheiro {
  return COMPANHEIROS[Math.abs(Math.floor(semente / 7)) % COMPANHEIROS.length] ?? 'capivara'
}

// Sorteia outra, nunca a mesma de agora; a semente vem de fora para o teste poder fixá-la.
export function sortear(atual: Nome | null, semente: number): Nome {
  const opcoes = SORTEIO.filter(n => n !== atual)
  return opcoes[Math.abs(Math.floor(semente)) % opcoes.length] ?? 'pensando'
}
