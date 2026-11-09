declare module 'claude-code' {
  interface PluginState {
    'meme': {
      atual: Shaped<'correndo' | 'pensando' | 'digitando' | 'comando' | 'lendo' | 'editando' | 'novelo' | 'surgindo'>
      ferramenta: Shaped<string | null>
      semente: Shaped<number>
      vezDaPergunta: Shaped<number>
      cor: Shaped<'laranja' | 'cinza'>
      indice: Shaped<{ nome: string; titulo: string; largura: number; acoes: string[]; peso: number; larguraPergunta: number | null }[]>
      aberto: Shaped<string | null>
      tela: Shaped<number>
      preparo: Shaped<{ atual: string | null; feitos: number; total: number; falhas: string[]; faltando: string[] }>
    }
  }
}
