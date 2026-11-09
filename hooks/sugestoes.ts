// Sugestões de memes. O pacote não traz nenhum destes arquivos: só o link de onde cada um já está publicado e o ajuste
// de recorte que funcionou. Os direitos são dos respectivos donos, e cada pessoa prepara a própria cópia, se quiser.
import { ACOES_PADRAO } from './sorteio'

export type Sugestao = {
  nome: string
  titulo: string
  link: string
  // verde: fundo verde; borda: fundo liso a partir das bordas; escuro: bicho escuro em fundo claro; nenhum: fica com o fundo.
  modo: 'verde' | 'borda' | 'escuro' | 'nenhum'
  recorte?: string
  largura?: number
  fps?: number
  duracao?: number
  acoes: readonly string[]
  peso?: number
  // A versão maior, que aparece acima das perguntas.
  pergunta?: { largura: number; fps: number }
  dica?: string
}

const PIN = 'https://in.pinterest.com/pin/'

export const SUGESTOES: readonly Sugestao[] = [
  { nome: 'nazare', titulo: 'Nazaré calculando', link: 'https://i.pinimg.com/originals/94/b6/6b/94b66bbce460c1ec882e191b13198dc9.gif', modo: 'nenhum', largura: 50, fps: 8, acoes: ['pensando', ...ACOES_PADRAO], peso: 4, pergunta: { largura: 100, fps: 6 } },
  { nome: 'bongo', titulo: 'Bongo Cat', link: 'https://media1.tenor.com/m/4gUr5zLU9tIAAAAd/bongo-cat.gif', modo: 'borda', recorte: '630:290:0:175', largura: 70, acoes: ['escrevendo'] },
  { nome: 'travolta', titulo: 'John Travolta procurando', link: 'https://media.giphy.com/media/1OYRPI5DZsCJO/giphy.gif', modo: 'verde', recorte: '510:544:100:34', largura: 30, fps: 8, acoes: ACOES_PADRAO },
  { nome: 'pop', titulo: 'Pop Cat', link: `${PIN}1009932285282377394/`, modo: 'verde', recorte: '512:630:85:90', largura: 26, fps: 8, duracao: 3, acoes: ACOES_PADRAO },
  { nome: 'oiia', titulo: 'OIIA Cat', link: 'https://images.wondershare.com/filmora/article-images/oiia-cat-02.gif', modo: 'verde', recorte: '692:790:165:130', largura: 28, fps: 10, acoes: ACOES_PADRAO },
  { nome: 'tapa', titulo: 'Gato dando tapa', link: `${PIN}1085156472702523944/`, modo: 'verde', recorte: '520:640:4:100', largura: 26, fps: 8, acoes: ACOES_PADRAO },
  { nome: 'teclado', titulo: 'Gato no teclado', link: 'https://usagif.com/wp-content/uploads/cat-typing-5.gif', modo: 'nenhum', largura: 56, acoes: ACOES_PADRAO },
  { nome: 'danca', titulo: 'Gatinho dançando', link: `${PIN}455567318574638711/`, modo: 'verde', recorte: '640:788:90:265', largura: 26, fps: 8, duracao: 5.5, acoes: ACOES_PADRAO, dica: 'O fim do vídeo mostra um ícone de pausa: não passe de 5,5 segundos.' },
  { nome: 'gatinhos', titulo: 'Dois gatinhos dançando', link: `${PIN}970314682257398997/`, modo: 'verde', recorte: '680:420:20:600', largura: 52, fps: 8, acoes: ACOES_PADRAO, dica: 'O recorte deixa de fora a marca d\'água.' },
  { nome: 'pato', titulo: 'Pato andando', link: `${PIN}892909063604868507/`, modo: 'verde', recorte: '240:350:260:225', largura: 22, fps: 8, duracao: 3, acoes: ACOES_PADRAO },
  { nome: 'vibrando', titulo: 'Gato balançando a cabeça', link: `${PIN}861383866235287692/`, modo: 'verde', recorte: '712:712:0:6', largura: 32, fps: 8, duracao: 4, acoes: ACOES_PADRAO },
  { nome: 'olhos', titulo: 'Gato de olhos arregalados', link: `${PIN}1142436630479448688/`, modo: 'verde', recorte: '630:720:55:0', largura: 28, fps: 8, duracao: 4, acoes: ACOES_PADRAO, dica: 'O recorte deixa de fora a marca d\'água.' },
  { nome: 'tigela', titulo: 'Gato batendo na tigela', link: `${PIN}921267667519614692/`, modo: 'verde', recorte: '520:640:140:365', largura: 26, fps: 8, duracao: 6, acoes: ACOES_PADRAO },
  { nome: 'arcoiris', titulo: 'Gato arco-íris', link: 'https://media.giphy.com/media/GkD4U3VfiIbzcBhQNu/giphy.gif', modo: 'borda', largura: 32, acoes: ACOES_PADRAO },
  { nome: 'lixa', titulo: 'Gato preto com a lixa', link: 'https://media.giphy.com/media/l3UcFqCm4r6ix9dpS/giphy.gif', modo: 'escuro', largura: 32, acoes: ACOES_PADRAO, dica: 'Confira no fundo escuro: sem contorno, ele pode sumir.' },
  { nome: 'fofo', titulo: 'Gato fofo', link: 'https://media.giphy.com/media/gXXFrjHFJIMoqKr8UT/giphy.gif', modo: 'nenhum', largura: 32, acoes: ACOES_PADRAO },
]

export function acharSugestao(nome: string): Sugestao | undefined {
  return SUGESTOES.find(s => s.nome === nome)
}
