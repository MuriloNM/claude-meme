// O que decide qual animação aparece: só contas, sem tocar no app, para o teste poder conferir.
import { PEQUENAS_PIXEL } from './animacoes'
import type { PequenaPixel } from './animacoes'

export const ACOES = ['enviando', 'pensando', 'escrevendo', 'comando', 'lendo', 'editando'] as const
export type Acao = (typeof ACOES)[number]
export const LARGURA_PREVIA = 72
export const NOME_DA_ACAO: Record<Acao, string> = {
  enviando: 'Enviando',
  pensando: 'Pensando',
  escrevendo: 'Escrevendo',
  comando: 'Comando',
  lendo: 'Lendo',
  editando: 'Editando',
}
// Um meme sem escolha entra nas ações mais curtas; pensando e escrevendo ficam com os desenhos.
export const ACOES_PADRAO: readonly Acao[] = ['enviando', 'comando', 'lendo', 'editando']

export type MemeIndice = {
  nome: string
  titulo: string
  largura: number
  acoes: string[]
  peso: number
  larguraPergunta: number | null
}

// A altura da linha de cima e o maior desenho que o app aceita.
export const ALTURA_MEME = 32
export const ALTURA_PERGUNTA = 64
export const LIMITE_DESENHO = 131072
// O ponto da faixa larga que cai no meio do cartão da pergunta.
const CENTRO_PERGUNTA = 135

export function acaoDe(modo: string, ferramenta: string | null): Acao {
  if (modo === 'requesting') return 'enviando'
  if (modo === 'responding') return 'escrevendo'
  if (modo === 'tool-input') return 'editando'
  if (modo !== 'tool-use') return 'pensando'
  if (ferramenta && /^(Edit|Write|NotebookEdit|MultiEdit)$/.test(ferramenta)) return 'editando'
  if (ferramenta && /^(Read|Grep|Glob|WebFetch|WebSearch|LS)$/.test(ferramenta)) return 'lendo'
  return 'comando'
}

// A mesma semente e a mesma ação dão sempre o mesmo resultado, para a animação não trocar a cada redesenho.
function posicao(semente: number, acao: string, tamanho: number): number {
  let soma = Math.abs(Math.floor(semente))
  for (const letra of acao) soma = (soma * 31 + letra.charCodeAt(0)) % 2147483647
  return soma % tamanho
}

// Sorteia entre os memes marcados nessa ação, respeitando o peso. Sem nenhum, a resposta é nula e entram os desenhos.
export function escolherMeme(indice: readonly MemeIndice[], acao: Acao, semente: number): MemeIndice | null {
  const urna = indice.filter(m => m.acoes.includes(acao)).flatMap(m => Array.from({ length: Math.max(1, m.peso) }, () => m))
  return urna[posicao(semente, acao, urna.length)] ?? null
}

export function escolherPixel(acao: Acao, semente: number): PequenaPixel {
  return PEQUENAS_PIXEL[posicao(semente, acao, PEQUENAS_PIXEL.length)] ?? 'bolinhas'
}

// Na pergunta, revezam o gatinho (nulo) e os memes preparados para esse lugar.
export function quemNaPergunta(indice: readonly MemeIndice[], vez: number): MemeIndice | null {
  const fila = [null, ...indice.filter(m => m.larguraPergunta !== null)]
  return fila[Math.abs(Math.floor(vez)) % fila.length] ?? null
}

export function svgDoGif(base64: string, largura: number, altura = ALTURA_MEME): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}"><image href="data:image/gif;base64,${base64}" width="${largura}" height="${altura}"/></svg>`
}

// O app não desenha um painel com GIFs demais de uma vez: cada tela leva só o que cabe nesse total de caracteres.
// O maior desenho já visto funcionando no app tem cerca de 127 mil.
export const LIMITE_PREVIAS_POR_TELA = 100_000

export function dividirEmTelas<T>(itens: readonly T[], tamanhoDe: (item: T) => number, limite: number): T[][] {
  const telas: T[][] = []
  let atual: T[] = []
  let soma = 0
  for (const item of itens) {
    const tamanho = tamanhoDe(item)
    if (atual.length > 0 && soma + tamanho > limite) {
      telas.push(atual)
      atual = []
      soma = 0
    }
    atual.push(item)
    soma += tamanho
  }
  if (atual.length > 0) telas.push(atual)
  return telas
}

// No painel, todo meme ocupa o mesmo espaço, para os nomes ficarem alinhados.
export function svgNoPainel(base64: string, largura: number): string {
  const espaco = Math.max(LARGURA_PREVIA, largura)
  const x = Math.round((espaco - largura) / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${espaco} ${ALTURA_MEME}" width="${espaco}" height="${ALTURA_MEME}"><image href="data:image/gif;base64,${base64}" x="${x}" width="${largura}" height="${ALTURA_MEME}"/></svg>`
}

// A faixa acima da pergunta estica e não aceita tamanho: o GIF vai num desenho largo, na posição do meio do cartão.
export function svgNaPergunta(base64: string, largura: number, larguraDaFaixa: number): string {
  const x = Math.round(CENTRO_PERGUNTA - largura / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraDaFaixa} ${ALTURA_PERGUNTA}" width="${larguraDaFaixa}" height="${ALTURA_PERGUNTA}"><image href="data:image/gif;base64,${base64}" x="${x}" y="0" width="${largura}" height="${ALTURA_PERGUNTA}"/></svg>`
}

export function ehGif(base64: string): boolean {
  return base64.startsWith('R0lGOD')
}

export function nomeValido(nome: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(nome)
}

// Só as ações conhecidas, sem repetir e na ordem de sempre.
export function acoesValidas(pedidas: readonly string[]): Acao[] {
  return ACOES.filter(a => pedidas.includes(a))
}
