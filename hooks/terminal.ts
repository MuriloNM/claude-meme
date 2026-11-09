// O que aparece no terminal, onde não há GIF: uma grade de caracteres coloridos. Cada caractere de bloco vale dois pixels
// de altura, e o texto puro ocupa uma linha só. Só contas e dados, sem tocar no app, para o teste poder conferir.
import type { Cor } from './animacoes'

export const MODOS_TERMINAL = ['desenho', 'texto', 'original'] as const
export type ModoTerminal = (typeof MODOS_TERMINAL)[number]
export const NOME_DO_MODO: Record<ModoTerminal, string> = { desenho: 'Desenho', texto: 'Texto', original: 'Original' }

export type AnimacaoTerminal = { chave: string; colunas: number; linhas: number; ms: number; quadros: readonly string[] }
// O que a receita devolve: os pixels de cada quadro, em hexadecimal; vazio é transparente.
export type PixelsTerminal = { l: number; a: number; ms: number; quadros: readonly (readonly string[])[] }

const COR_PADRAO_DO_TERMINAL = 0x01000000
const ESPACO = 0x20
const METADE_DE_CIMA = 0x2580
const METADE_DE_BAIXO = 0x2584
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function paraBase64(bytes: readonly number[]): string {
  let saida = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    saida += ALFABETO[a >> 2]
    saida += ALFABETO[((a & 3) << 4) | (b >> 4)]
    saida += i + 1 < bytes.length ? ALFABETO[((b & 15) << 2) | (c >> 6)] : '='
    saida += i + 2 < bytes.length ? ALFABETO[c & 63] : '='
  }
  return saida
}

// As células do terminal: três números de 32 bits por caractere (o caractere, a cor da frente e a do fundo).
function empacotar(celulas: readonly (readonly [number, number, number])[]): string {
  const bytes: number[] = []
  for (const celula of celulas) {
    for (const valor of celula) bytes.push(valor & 255, (valor >>> 8) & 255, (valor >>> 16) & 255, (valor >>> 24) & 255)
  }
  return paraBase64(bytes)
}

export function celulasDePixels(pixels: readonly (number | null)[], largura: number, altura: number): string {
  const celulas: [number, number, number][] = []
  for (let y = 0; y < altura; y += 2) {
    for (let x = 0; x < largura; x++) {
      const cima = pixels[y * largura + x] ?? null
      const baixo = pixels[(y + 1) * largura + x] ?? null
      if (cima === null && baixo === null) celulas.push([ESPACO, COR_PADRAO_DO_TERMINAL, COR_PADRAO_DO_TERMINAL])
      else if (cima === null && baixo !== null) celulas.push([METADE_DE_BAIXO, baixo, COR_PADRAO_DO_TERMINAL])
      else if (cima !== null && baixo === null) celulas.push([METADE_DE_CIMA, cima, COR_PADRAO_DO_TERMINAL])
      else if (cima !== null && baixo !== null) celulas.push([METADE_DE_CIMA, cima, baixo])
    }
  }
  return empacotar(celulas)
}

export function animacaoDePixels(chave: string, p: PixelsTerminal): AnimacaoTerminal {
  return {
    chave,
    colunas: p.l,
    linhas: p.a / 2,
    ms: p.ms,
    quadros: p.quadros.map(q => celulasDePixels(q.map(c => (c ? parseInt(c, 16) : null)), p.l, p.a)),
  }
}

const PALETAS: Record<Cor, Record<string, number>> = {
  laranja: { O: 0xe8a33d, D: 0xb5701f, E: 0x2b1a0a, P: 0xe0567f, B: 0xf4dcae, Z: 0x9aa0a6 },
  cinza: { O: 0x9aa0a6, D: 0x6b7076, E: 0x2b1a0a, P: 0xe0567f, B: 0xd5d8db, Z: 0x6b7076 },
}

const LARGURA_GATO = 24
const ALTURA_GATO = 12

const andando = (a: string, b: string, c: string): string[] => [
  '.................O...O..',
  '.................OO.OO..',
  '.D...............OOOOO..',
  '.DD..............OEOEO..',
  '..D..............OOPOO..',
  '..D' + 'O'.repeat(18) + 'B..',
  '...' + 'O'.repeat(17) + 'B...',
  '...' + 'O'.repeat(18) + '...',
  '...' + 'O'.repeat(17) + '....',
  a,
  b,
  c,
]

const sentado = (olho: string, cauda: readonly string[]): string[] => [
  '...O......O.............',
  '...OO....OO.............',
  '...OOOOOOOO.............',
  `...O${olho}OOOO${olho}O.............`,
  '...OOOOPOOO.............',
  '...OOOOOOOO.............',
  '....OOOOOO..............',
  ...cauda,
]
const CAUDA_A = ['....OOBBOO..D...........', '....OOOOOO..D...........', '....OOOOOOO.D...........', '....OOOOOOOOD...........', '....OO..OOOOD...........']
const CAUDA_B = ['....OOBBOO...D..........', '....OOOOOO...D..........', '....OOOOOOO.D...........', '....OOOOOOOOD...........', '....OO..OOOOD...........']
const CAUDA_C = ['....OOBBOO....D.........', '....OOOOOO...D..........', '....OOOOOOO.D...........', '....OOOOOOOOD...........', '....OO..OOOOD...........']

// De frente para o novelo: a pata sai do corpo, encosta na bola e a bola vai embora.
const GATO_DO_NOVELO = [
  '......O....O............',
  '......OO..OO............',
  '......OOOOOO............',
  '......OEOOEO............',
  '......OOPOOO............',
  '.....OOOOOOO............',
  '...OOOOOOOO.............',
  '..OOOOOOOOO.............',
  '..OOOOOOOOO.............',
  '.DOOOOOOOOO.............',
  '.DOOOOOOOOO.............',
  '.DOO..OO.OO.............',
]
const BOLA = ['.PPP.', 'PPBPP', 'PBPPP', 'PPPBP', '.PPP.']

function novelo(x: number, y: number, pata: boolean): string[] {
  return GATO_DO_NOVELO.map((linha, ly) => linha.split('').map((c, lx) => {
    const daBola = BOLA[ly - y]?.[lx - x]
    if (daBola && daBola !== '.') return daBola
    return pata && (ly === 8 || ly === 9) && lx >= 11 && lx <= 13 ? 'O' : c
  }).join(''))
}

const VAZIA = '.'.repeat(LARGURA_GATO)
const DORMINDO = [
  VAZIA,
  VAZIA,
  VAZIA,
  '..................O...O.',
  '.....D' + 'O'.repeat(9) + '...OOOOO.',
  '....D' + 'O'.repeat(18) + '.',
  '...D' + 'O'.repeat(15) + 'DODO.',
  '..D' + 'O'.repeat(17) + 'POO.',
  '..D' + 'O'.repeat(20) + '.',
  '..D' + 'O'.repeat(20) + '.',
  '..D' + 'O'.repeat(19) + '..',
  '...' + 'O'.repeat(18) + '...',
]

function dormindo(zs: readonly (readonly [number, number])[]): string[] {
  return DORMINDO.map((linha, y) => linha.split('').map((c, x) => (zs.some(([zx, zy]) => zx === x && zy === y) ? 'Z' : c)).join(''))
}

export const DESENHOS: Record<string, { ms: number; quadros: readonly (readonly string[])[] }> = {
  andando: {
    ms: 170,
    quadros: [
      andando('...OO.OO........OO.OO...', '..OO...OO......OO...OO..', '..O.....O......O.....O..'),
      andando('...OO.OO........OO.OO...', '...OO.OO........OO.OO...', '...O...O........O...O...'),
      andando('....OOO..........OOO....', '....OOO..........OOO....', '....O.O..........O.O....'),
      andando('...OO.OO........OO.OO...', '...OO.OO........OO.OO...', '...O...O........O...O...'),
    ],
  },
  piscando: {
    ms: 250,
    quadros: [
      ...Array.from({ length: 5 }, () => sentado('E', CAUDA_A)),
      sentado('D', CAUDA_A),
      sentado('E', CAUDA_B),
      sentado('E', CAUDA_C),
      sentado('E', CAUDA_B),
    ],
  },
  novelo: {
    ms: 170,
    quadros: [novelo(19, 7, false), novelo(17, 7, false), novelo(15, 7, false), novelo(14, 6, true), novelo(16, 5, false), novelo(18, 6, false)],
  },
  dormindo: {
    ms: 600,
    quadros: [dormindo([[20, 2]]), dormindo([[20, 2], [21, 0]]), dormindo([[21, 0]]), dormindo([])],
  },
}

export const TEXTOS: Record<string, { ms: number; quadros: readonly string[] }> = {
  piscando: { ms: 300, quadros: ['=^.^=', '=^.^=', '=^.^=', '=^.^=', '=^-^=', '=^.^=', '=^o^='] },
  correndo: { ms: 200, quadros: ['~(=^.^)    ', ' ~(=^.^)   ', '  ~(=^.^)  ', '   ~(=^.^) ', '    ~(=^.^)', '   (^.^=)~ ', '  (^.^=)~  ', ' (^.^=)~   '] },
}

function celulasDeTexto(texto: string, cor: number): string {
  return empacotar(texto.split('').map((c): [number, number, number] => [c.charCodeAt(0), cor, COR_PADRAO_DO_TERMINAL]))
}

// As células só são montadas uma vez por desenho e cor.
const prontos = new Map<string, AnimacaoTerminal>()

export function desenhoDoTerminal(nome: string, cor: Cor): AnimacaoTerminal {
  const chave = `desenho-${nome}-${cor}`
  const pronto = prontos.get(chave)
  if (pronto) return pronto
  const desenho = DESENHOS[nome] ?? DESENHOS.piscando
  const paleta = PALETAS[cor]
  const animacao: AnimacaoTerminal = {
    chave,
    colunas: LARGURA_GATO,
    linhas: ALTURA_GATO / 2,
    ms: desenho?.ms ?? 250,
    quadros: (desenho?.quadros ?? []).map(q => celulasDePixels(q.join('').split('').map(c => paleta[c] ?? null), LARGURA_GATO, ALTURA_GATO)),
  }
  prontos.set(chave, animacao)
  return animacao
}

export function textoDoTerminal(nome: string, cor: Cor): AnimacaoTerminal {
  const chave = `texto-${nome}-${cor}`
  const pronto = prontos.get(chave)
  if (pronto) return pronto
  const texto = TEXTOS[nome] ?? TEXTOS.piscando
  const animacao: AnimacaoTerminal = {
    chave,
    colunas: texto?.quadros[0]?.length ?? 5,
    linhas: 1,
    ms: texto?.ms ?? 300,
    quadros: (texto?.quadros ?? []).map(q => celulasDeTexto(q, PALETAS[cor].O ?? 0xe8a33d)),
  }
  prontos.set(chave, animacao)
  return animacao
}

// No terminal o texto aparece quase todo de uma vez, então uma ação como "escrevendo" mal existe. O sorteio é por mensagem:
// entram os gatinhos e os memes com versão do terminal, e a resposta nula quer dizer que saiu um gatinho.
export function memeDoTerminal<T>(memes: readonly T[], semente: number): T | null {
  const quantosGatos = Object.keys(DESENHOS).length
  const n = Math.abs(Math.floor(semente)) % (quantosGatos + memes.length)
  return n < quantosGatos ? null : (memes[n - quantosGatos] ?? null)
}

// O gatinho da mensagem fica o mesmo até o fim dela, para a linha não trocar de desenho a cada ferramenta.
export function gatoDoTerminal(modo: Exclude<ModoTerminal, 'original'>, cor: Cor, semente: number): AnimacaoTerminal {
  const n = Math.abs(Math.floor(semente))
  if (modo === 'texto') {
    const nomes = Object.keys(TEXTOS)
    return textoDoTerminal(nomes[n % nomes.length] ?? 'piscando', cor)
  }
  const nomes = Object.keys(DESENHOS)
  return desenhoDoTerminal(nomes[n % nomes.length] ?? 'piscando', cor)
}
