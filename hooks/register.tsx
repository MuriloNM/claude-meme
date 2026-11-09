import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { ALTURA, CORES_GATO, LARGURA, LARGURA_PEQUENA, animacaoDe, desenhar, desenharEsperando, desenharPequena, faseDaFaixa, sortear } from './animacoes'
import type { Cor, Nome } from './animacoes'
import { comandoDePreparo, pedidoDeAdicionar, TEXTO_DE_AJUDA } from './receita'
import { ACOES, ACOES_PADRAO, ALTURA_MEME, ALTURA_PERGUNTA, LARGURA_PREVIA, LIMITE_DESENHO, LIMITE_PREVIAS_POR_TELA, NOME_DA_ACAO, acaoDe, acoesValidas, dividirEmTelas, ehGif, escolherMeme, escolherPixel, nomeValido, quemNaPergunta, svgDoGif, svgNaPergunta, svgNoPainel } from './sorteio'
import type { MemeIndice } from './sorteio'
import { SUGESTOES, acharSugestao } from './sugestoes'
import { MODOS_TERMINAL, NOME_DO_MODO, animacaoDePixels, gatoDoTerminal, memeDoTerminal } from './terminal'
import type { AnimacaoTerminal, ModoTerminal, PixelsTerminal } from './terminal'

const atual = atom({ plugin: 'meme', key: 'atual' } as const, 'pensando' as Nome, { shape: 'atual-1' })
const ferramenta = atom({ plugin: 'meme', key: 'ferramenta' } as const, null as string | null, { shape: 'ferramenta-1' })
const semente = atom({ plugin: 'meme', key: 'semente' } as const, 0, { shape: 'semente-1' })
const vezDaPergunta = atom({ plugin: 'meme', key: 'vezDaPergunta' } as const, 0, { shape: 'vez-1' })
const cor = atom({ plugin: 'meme', key: 'cor' } as const, 'laranja' as Cor, { shape: 'cor-1' })
const indice = atom({ plugin: 'meme', key: 'indice' } as const, [] as MemeIndice[], { shape: 'indice-1' })
const PREPARO_VAZIO = { atual: null as string | null, feitos: 0, total: 0, falhas: [] as string[], faltando: [] as string[] }
const preparo = atom({ plugin: 'meme', key: 'preparo' } as const, PREPARO_VAZIO, { shape: 'preparo-1' })
// O meme com os ajustes abertos no painel.
const aberto = atom({ plugin: 'meme', key: 'aberto' } as const, null as string | null, { shape: 'aberto-1' })
// A tela de memes que o painel mostra.
const tela = atom({ plugin: 'meme', key: 'tela' } as const, 0, { shape: 'tela-1' })
const modoTerminal = atom({ plugin: 'meme', key: 'modoTerminal' } as const, 'desenho' as ModoTerminal, { shape: 'modo-terminal-1' })

const PAINEL = 'memes'
const TEMPO_POR_MEME = 180_000
const PROGRAMAS_NECESSARIOS = [['node', '--version'], ['ffmpeg', '-version'], ['ffprobe', '-version']]
// Onde o gatinho fica na faixa esticada acima da pergunta, para cair no meio do cartão, que é mais estreito que a faixa.
const POSICAO_ESPERANDO = 104

type Dados = { gif: string; pergunta: string | null; terminal?: AnimacaoTerminal | null }

const CHAVE_DO_DESENHO = 'animacao'
// A animação que está tocando no terminal. O relógio troca as células sem redesenhar a tela.
let tocando: { chave: string; quadro: number; parar: () => void } | null = null

// A fase mais recente, que só a linha normal conhece. Desenhar não pode gravar estado, por isso fica aqui.
let ultimaFase: string | null = null
// Os GIFs já lidos, para não reler o arquivo guardado a cada redesenho.
const lidos = new Map<string, Dados>()
// Um "Adicionar todos" por vez. Fica fora do estado porque a recarga do mod encerra o trabalho e zera esta variável junto.
let preparando = false

// O que a linha de uma ferramenta em andamento diz: a animação fica só na linha principal.
function descricaoDe(tool: string, input: unknown): string {
  const d = (input as { description?: unknown } | null)?.description
  return typeof d === 'string' && d.length > 0 ? d : tool
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'meme',
      description: 'Abre o painel de memes; também: adicionar, remover, acoes, lista, sugestoes e cor',
      argumentHint: 'adicionar <nome ou link> | remover <nome> | acoes <nome> <ações> | lista | sugestoes | cor <laranja ou cinza> | terminal <desenho, texto ou original>',
    })
    await $.tool.register({
      name: 'guardar',
      description: 'Guarda no mod meme um meme já recortado em GIF, para entrar no sorteio. Use só depois de preparar o arquivo seguindo o pedido do comando /meme adicionar.',
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Identificador curto: letras minúsculas, números e hífen' },
          titulo: { type: 'string', description: 'Nome legível do meme' },
          arquivo: { type: 'string', description: `Caminho absoluto do GIF com ${ALTURA_MEME} de altura` },
          largura: { type: 'number', description: 'Largura desse GIF' },
          acoes: { type: 'array', items: { type: 'string', enum: [...ACOES] }, description: 'Ações em que o meme entra no sorteio' },
          peso: { type: 'number', description: 'Quantas vezes entra na urna; o padrão é 1' },
          arquivoPergunta: { type: 'string', description: `Opcional: caminho absoluto de um GIF com ${ALTURA_PERGUNTA} de altura, para aparecer acima das perguntas` },
          larguraPergunta: { type: 'number', description: 'Largura desse segundo GIF' },
        },
        required: ['nome', 'titulo', 'arquivo', 'largura'],
      },
    })
    const guardados = await $.store.get('indice')
    if (Array.isArray(guardados)) await update($, indice, () => guardados as MemeIndice[])
    const preferida = await $.store.get('cor')
    const corValida = CORES_GATO.find(c => c === preferida)
    if (corValida) await update($, cor, () => corValida)
    const modoPreferido = await $.store.get('modoTerminal')
    const modoValido = MODOS_TERMINAL.find(m => m === modoPreferido)
    if (modoValido) await update($, modoTerminal, () => modoValido)
    await update($, preparo, () => PREPARO_VAZIO)

    // Na primeira vez, o painel se apresenta com as sugestões.
    if (!(await $.store.get('apresentado'))) {
      await $.store.set('apresentado', true)
      void $.ui.open({ id: PAINEL, title: 'Memes' })
      $.ui.toast('Mod de memes instalado. Digite /meme para escolher seus memes.')
    }

    return next(e)
  })

  on('tool.call', { tool: 'mcp__meme__guardar' }, async ($, e) => {
    const m = e as unknown as { nome?: unknown; titulo?: unknown; arquivo?: unknown; largura?: unknown; acoes?: unknown; peso?: unknown; arquivoPergunta?: unknown; larguraPergunta?: unknown }
    const nome = typeof m.nome === 'string' ? m.nome : ''
    if (!nomeValido(nome)) return { deny: 'O nome precisa ter só letras minúsculas, números e hífen, com até 40 caracteres.' }
    if (typeof m.arquivo !== 'string' || typeof m.largura !== 'number' || m.largura <= 0) return { deny: 'Informe o arquivo e a largura.' }
    const lerGif = async (caminho: string, largura: number, altura: number): Promise<string> => {
      const { base64 } = (await $.fs.read(caminho, { as: 'bytes' })) as { base64: string }
      if (!ehGif(base64)) throw new Error(`${caminho} não é um GIF`)
      const tamanho = svgDoGif(base64, largura, altura).length
      if (tamanho > LIMITE_DESENHO) throw new Error(`${caminho} ficou com ${tamanho} caracteres, e o limite é ${LIMITE_DESENHO}: reduza a duração ou os quadros por segundo`)
      return base64
    }
    let dados: Dados
    try {
      const temPergunta = typeof m.arquivoPergunta === 'string' && typeof m.larguraPergunta === 'number'
      dados = {
        gif: await lerGif(m.arquivo, m.largura, ALTURA_MEME),
        pergunta: temPergunta ? await lerGif(m.arquivoPergunta as string, m.larguraPergunta as number, ALTURA_PERGUNTA) : null,
        terminal: null,
      }
      // A versão do terminal é um extra: se falhar, o meme continua valendo no app.
      if (acharSugestao(nome)?.terminal) {
        try {
          const r = await $.process.run(['node', `${$.plugin.root}/receita/terminal.mjs`, '--entrada', m.arquivo], { timeoutMs: TEMPO_POR_MEME })
          if (r.exitCode === 0) dados = { ...dados, terminal: animacaoDePixels(`meme-${nome}`, JSON.parse(r.stdout) as PixelsTerminal) }
        } catch {
          dados = { ...dados, terminal: null }
        }
      }
      await $.store.set(`meme:${nome}`, dados)
    } catch (erro) {
      return { deny: `O meme não foi guardado: ${erro instanceof Error ? erro.message : String(erro)}` }
    }
    const pedidas = Array.isArray(m.acoes) ? m.acoes.filter((a): a is string => typeof a === 'string') : []
    const acoes = pedidas.length > 0 ? acoesValidas(pedidas) : [...ACOES_PADRAO]
    const novo: MemeIndice = {
      nome,
      titulo: typeof m.titulo === 'string' && m.titulo ? m.titulo : nome,
      largura: m.largura,
      acoes,
      peso: typeof m.peso === 'number' && m.peso >= 1 ? Math.floor(m.peso) : 1,
      larguraPergunta: dados.pergunta ? (m.larguraPergunta as number) : null,
      temTerminal: Boolean(dados.terminal),
    }
    const lista =[...(await read($, indice)).filter(x => x.nome !== nome), novo]
    await $.store.set('indice', lista)
    await update($, indice, () => lista)
    lidos.set(nome, dados)

    return { result: `Meme "${novo.titulo}" guardado, nas ações: ${acoes.join(', ')}.` }
  })

  on('command.run', { command: 'meme' }, async ($, e) => {
    const [pedido = '', ...resto] = e.args.trim().split(/\s+/).filter(Boolean)
    const lista = await read($, indice)

    if (pedido === 'adicionar') {
      const alvo = resto[0]
      if (!alvo) return { text: 'Use: /meme adicionar <nome de uma sugestão ou link>' }
      const sugestao = acharSugestao(alvo)
      if (!sugestao && !/^https?:\/\//.test(alvo)) return { text: `Não conheço "${alvo}". Veja /meme sugestoes ou cole um link.` }
      // Pedido feito de dentro do comando não chegou ao modelo: sai logo depois, com o comando já encerrado, como o do botão.
      const pedidoAoModelo = pedidoDeAdicionar(sugestao?.link ?? alvo, $.plugin.root, sugestao)
      $.clock.after(300, () => void $.prompt.submit({ text: pedidoAoModelo }))

      return { text: `Pedi ao Claude para preparar ${sugestao?.titulo ?? 'esse meme'}.` }
    }
    if (pedido === 'remover') {
      const nome = resto[0]
      if (!nome || !lista.some(m => m.nome === nome)) return { text: 'Use: /meme remover <nome>. Veja os nomes em /meme lista.' }
      const novaLista = lista.filter(m => m.nome !== nome)
      await $.store.delete(`meme:${nome}`)
      await $.store.set('indice', novaLista)
      await update($, indice, () => novaLista)
      lidos.delete(nome)

      return { text: `Meme "${nome}" removido.` }
    }
    if (pedido === 'acoes') {
      const nome = resto[0]
      const acoes = acoesValidas(resto.slice(1).join(',').split(',').map(a => a.trim()))
      if (!nome || !lista.some(m => m.nome === nome)) return { text: 'Use: /meme acoes <nome> <ações>. Veja os nomes em /meme lista.' }
      if (acoes.length === 0) return { text: `Escolha entre: ${ACOES.join(', ')}.` }
      const novaLista = lista.map(m => (m.nome === nome ? { ...m, acoes } : m))
      await $.store.set('indice', novaLista)
      await update($, indice, () => novaLista)

      return { text: `"${nome}" agora entra em: ${acoes.join(', ')}.` }
    }
    if (pedido === 'lista') {
      return { text: lista.length === 0 ? 'Nenhum meme ainda. Veja /meme sugestoes.' : lista.map(m => `${m.nome}: ${m.titulo} (${m.acoes.join(', ')})`).join('\n') }
    }
    if (pedido === 'sugestoes') {
      return { text: SUGESTOES.map(s => `${s.nome}: ${s.titulo}`).join('\n') + '\n\nPara adicionar: /meme adicionar <nome>' }
    }
    if (pedido === 'cor') {
      const novaCor = CORES_GATO.find(c => c === resto[0])
      if (!novaCor) return { text: `Use: /meme cor ${CORES_GATO.join(' ou ')}` }
      await $.store.set('cor', novaCor)
      await update($, cor, () => novaCor)

      return { text: `Gatinho ${novaCor}.` }
    }
    if (pedido === 'terminal') {
      const novoModo = MODOS_TERMINAL.find(m => m === resto[0])
      if (!novoModo) return { text: `Use: /meme terminal ${MODOS_TERMINAL.join(', ')}` }
      await $.store.set('modoTerminal', novoModo)
      await update($, modoTerminal, () => novoModo)

      return { text: `No terminal: ${NOME_DO_MODO[novoModo]}.` }
    }
    if (pedido) return { text: TEXTO_DE_AJUDA }

    const aberto = await $.ui.open({ id: PAINEL, title: 'Memes' })

    return { text: aberto.isPlaced ? 'Painel aberto.' : TEXTO_DE_AJUDA }
  })

  on('prompt.submit', async ($, e, next) => {
    ultimaFase = 'requesting'
    const instante = await $.clock.now()
    await update($, semente, () => instante)
    await update($, atual, antes => sortear(antes, instante))

    return next(e)
  })

  // Guarda a ferramenta da vez, para a linha principal escolher a animação que combina com ela.
  on('tool.call', async ($, e, next) => {
    await update($, ferramenta, () => e.tool)
    if (e.tool === 'AskUserQuestion') {
      await update($, vezDaPergunta, antes => antes + 1)
    }
    try {
      return await next(e)
    } finally {
      await update($, ferramenta, () => null)
    }
  })

  // Com a pergunta aberta, o gatinho ou um meme preparado para isso espera acima do cartão.
  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => {
    if (e.surface !== 'desktop') {
      return next(e)
    }
    const cartao = await next(e)
    const { Box, Svg } = $.ui.resolve(e)
    const quem = quemNaPergunta(await read($, indice), await read($, vezDaPergunta))
    let dados = quem ? lidos.get(quem.nome) : undefined
    if (quem && !dados) {
      dados = (await $.store.get(`meme:${quem.nome}`)) as Dados | undefined
      if (dados) lidos.set(quem.nome, dados)
    }
    // O GIF só anima no modo de imagem; o gatinho em pixel, no modo normal.
    const desenho = quem && dados?.pergunta
      ? <Svg source={svgNaPergunta(dados.pergunta, quem.larguraPergunta ?? 100, LARGURA)} alt={`${quem.titulo} esperando sua resposta`} />
      : <Svg source={desenharEsperando(await read($, cor), 400, POSICAO_ESPERANDO)} alt="Gatinho esperando sua resposta" isInteractive />

    return (
      <Box flexDirection="column">
        {desenho}
        {cartao}
      </Box>
    )
  })

  // Enquanto uma ferramenta roda, a linha dela fica só com o texto; sem isso o app desenha as próprias bolinhas nela.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    // Sem resultado ainda vale também para "Criando": o Claude escrevendo o pedido da ferramenta, antes de ela rodar.
    const emAndamento = e.props.isRunning || (e.props.output === undefined && !e.props.isErrored && !e.props.isInterrupted)
    if (e.surface !== 'desktop' || !emAndamento) {
      return next(e)
    }
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>{descricaoDe(e.props.tool, e.props.input)}</Text>
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const rodando = e.props.calls.find(c => c.isRunning) ?? e.props.calls.find(c => c.output === undefined && !c.isErrored && !c.isInterrupted)
    if (e.surface !== 'desktop' || !e.props.isActive || !rodando) {
      return next(e)
    }
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>{descricaoDe(rodando.tool, rodando.input)}</Text>
  })

  // A linha de status: um meme marcado para a ação da vez ou, sem nenhum, um gatinho em pixel.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    // O terminal não desenha SVG: lá o desenho é uma grade de caracteres, ao lado da linha original com tempo e tokens.
    if (e.surface === 'terminal') {
      const modo = await read($, modoTerminal)
      if (modo === 'original') {
        return next(e)
      }
      const original = await next(e)
      const { Box, Raster } = $.ui.resolve(e)
      const s = await read($, semente)
      let animacao = gatoDoTerminal(modo, await read($, cor), s)
      if (modo === 'desenho') {
        const meme = memeDoTerminal((await read($, indice)).filter(m => m.temTerminal), s)
        let dados = meme ? lidos.get(meme.nome) : undefined
        if (meme && !dados) {
          dados = (await $.store.get(`meme:${meme.nome}`)) as Dados | undefined
          if (dados) lidos.set(meme.nome, dados)
        }
        if (dados?.terminal) animacao = dados.terminal
      }
      const atual = animacao
      if (tocando?.chave !== atual.chave) {
        tocando?.parar()
        tocando = null
        if (atual.quadros.length > 1) {
          const { requestId } = e
          const estado = { chave: atual.chave, quadro: 0, parar: () => {} }
          const relogio = $.clock.every(atual.ms, () => {
            estado.quadro = (estado.quadro + 1) % atual.quadros.length
            // Quando a linha sai da tela, o app recusa a troca: é a hora de parar o relógio.
            void $.ui.blit({ requestId, key: CHAVE_DO_DESENHO, cells: atual.quadros[estado.quadro] ?? '' }).then(
              r => { if ('deny' in r && r.deny) estado.parar() },
              () => estado.parar(),
            )
          })
          estado.parar = () => {
            relogio.cancel()
            if (tocando === estado) tocando = null
          }
          tocando = estado
        }
      }

      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Raster key={CHAVE_DO_DESENHO} columns={atual.colunas} rows={atual.linhas} cells={atual.quadros[tocando?.chave === atual.chave ? tocando.quadro : 0] ?? ''} />
          {original}
        </Box>
      )
    }
    if (e.surface !== 'desktop') {
      return next(e)
    }
    // A cada fase nova, a faixa é redesenhada para acompanhar.
    if (e.props.mode !== ultimaFase) {
      ultimaFase = e.props.mode
      $.ui.invalidate('ui.render')
    }
    const { Box, Svg, Text } = $.ui.resolve(e)
    const acao = acaoDe(e.props.mode, await read($, ferramenta))
    const s = await read($, semente)
    const texto = <Text dimColor>{e.props.message ?? e.props.word}{e.props.suffix}</Text>

    const meme = escolherMeme(await read($, indice), acao, s)
    let dados = meme ? lidos.get(meme.nome) : undefined
    if (meme && !dados) {
      dados = (await $.store.get(`meme:${meme.nome}`)) as Dados | undefined
      if (dados) lidos.set(meme.nome, dados)
    }
    // O GIF só aparece no modo de imagem; o desenho em pixel anima no modo normal.
    if (meme && dados) {
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Svg source={svgDoGif(dados.gif, meme.largura)} alt={meme.titulo} width={meme.largura} height={ALTURA} />
          {texto}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg source={desenharPequena(escolherPixel(acao, s), await read($, cor))} alt="Gatinho brincando" width={LARGURA_PEQUENA} height={ALTURA} isInteractive />
        {texto}
      </Box>
    )
  })

  // A faixa acima da caixa de mensagem: aparece do começo ao fim do trabalho, em qualquer estado do app.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !e.props.isWorking || e.props.hasSurvey) {
      return next(e)
    }
    const f = await read($, ferramenta)
    // Com a pergunta aberta, quem aparece é quem espera acima do cartão: a faixa sai para não haver dois.
    if (f === 'AskUserQuestion') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const nome = animacaoDe(faseDaFaixa(f, ultimaFase), f, await read($, atual), null)

    return <Svg source={desenhar(nome, await read($, cor))} alt={`Animação ${nome}`} width={LARGURA} height={ALTURA} isInteractive />
  })

  // O painel: os memes da pessoa, com o que tirar e quando aparecer, e as sugestões que ainda não entraram.
  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const elementos = $.ui.resolve(e)
    const { Box, Button, Text } = elementos
    // Nem toda superfície desenha imagem ou campo de texto: o terminal fica sem as prévias, o celular sem o campo.
    const Svg = 'Svg' in elementos ? elementos.Svg : null
    const Input = 'Input' in elementos ? elementos.Input : null
    const lista = await read($, indice)
    const restantes = SUGESTOES.filter(s => !lista.some(m => m.nome === s.nome))
    const andamento = await read($, preparo)
    const memeAberto = await read($, aberto)
    const corAtual = await read($, cor)
    const modoAtual = await read($, modoTerminal)
    const processados = andamento.feitos + andamento.falhas.length
    const pronto = andamento.total > 0 ? Math.round((processados / andamento.total) * 100) : 0
    const previas = new Map<string, string>()
    if (Svg) {
      for (const m of lista) {
        let dados = lidos.get(m.nome)
        if (!dados) {
          dados = (await $.store.get(`meme:${m.nome}`)) as Dados | undefined
          if (dados) lidos.set(m.nome, dados)
        }
        if (dados) previas.set(m.nome, svgNoPainel(dados.gif, m.largura))
      }
    }
    const telas = dividirEmTelas(lista, m => previas.get(m.nome)?.length ?? 0, LIMITE_PREVIAS_POR_TELA)
    const numeroDaTela = Math.min(await read($, tela), Math.max(0, telas.length - 1))
    const memesDaTela = telas[numeroDaTela] ?? []

    return (
      <Box flexDirection="column" gap="lg" padding="md">
        <Box flexDirection="row" alignItems="center" gap="md">
          {Svg && <Svg source={desenharPequena(escolherPixel('pensando', 0), corAtual)} alt="Gatinho brincando" width={LARGURA_PEQUENA} height={ALTURA} isInteractive />}
          <Box flexDirection="column" flexShrink={1}>
            <Text size="heading" weight="semibold">Sua espera mais divertida</Text>
            <Text size="caption" dimColor>Estes memes aparecem enquanto o Claude trabalha.</Text>
          </Box>
        </Box>

        {(restantes.length > 0 || andamento.total > 0 || andamento.faltando.length > 0) && (
        <Box flexDirection="column" gap="sm" padding="md" borderStyle="round" borderDimColor>
        {restantes.length > 0 && !andamento.atual && <Text weight="medium">{lista.length === 0 ? `Comece com ${restantes.length} memes prontos` : `Faltam ${restantes.length} sugestões`}</Text>}
        {restantes.length > 0 && !andamento.atual && <Text size="caption" dimColor>Um clique baixa dos links originais e prepara tudo aqui no seu computador, sem usar seu limite.</Text>}
        {restantes.length > 0 && !andamento.atual && (
          <Button
            key="adicionar-todos"
            variant="primary"
            label={`Adicionar todos (${restantes.length})`}
            onPress={() => {
              if (preparando) return
              preparando = true
              // O trabalho segue depois de o clique responder, e o painel acompanha pelo estado.
              void (async () => {
                try {
                  const faltando: string[] = []
                  for (const argv of PROGRAMAS_NECESSARIOS) {
                    const instalado = await $.process.run(argv).then(r => r.exitCode === 0, () => false)
                    if (!instalado) faltando.push(argv[0] ?? '')
                  }
                  if (faltando.length > 0) {
                    await update($, preparo, () => ({ ...PREPARO_VAZIO, faltando }))
                    return
                  }
                  const fila = SUGESTOES.filter(s => restantes.some(r => r.nome === s.nome))
                  const falhas: string[] = []
                  let feitos = 0
                  for (const s of fila) {
                    await update($, preparo, () => ({ atual: s.titulo, feitos, total: fila.length, falhas, faltando: [] }))
                    try {
                      const r = await $.process.run(comandoDePreparo(s, $.plugin.root), { timeoutMs: TEMPO_POR_MEME })
                      if (r.exitCode !== 0) throw new Error(r.stderr.trim())
                      const pronto = JSON.parse(r.stdout) as { gif: string; largura: number; pergunta: string | null; larguraPergunta: number | null; terminal?: PixelsTerminal | null }
                      if (!ehGif(pronto.gif) || svgDoGif(pronto.gif, pronto.largura).length > LIMITE_DESENHO) throw new Error('o desenho não serve')
                      const dados: Dados = { gif: pronto.gif, pergunta: pronto.pergunta, terminal: pronto.terminal ? animacaoDePixels(`meme-${s.nome}`, pronto.terminal) : null }
                      await $.store.set(`meme:${s.nome}`, dados)
                      const novo: MemeIndice = { nome: s.nome, titulo: s.titulo, largura: pronto.largura, acoes: acoesValidas([...s.acoes]), peso: s.peso ?? 1, larguraPergunta: pronto.larguraPergunta, temTerminal: Boolean(dados.terminal) }
                      const novaLista = [...(await read($, indice)).filter(x => x.nome !== s.nome), novo]
                      await $.store.set('indice', novaLista)
                      await update($, indice, () => novaLista)
                      lidos.set(s.nome, dados)
                      feitos += 1
                    } catch {
                      falhas.push(s.titulo)
                    }
                  }
                  await update($, preparo, () => ({ atual: null, feitos, total: fila.length, falhas, faltando: [] }))
                  $.ui.toast(`Memes prontos: ${feitos} de ${fila.length}.`)
                } finally {
                  preparando = false
                }
              })()
            }}
          />
        )}
        {andamento.atual && <Text weight="medium">Preparando {andamento.atual}…</Text>}
        {andamento.atual && (
          <Box flexDirection="column" gap="xs">
            <Box width="100%" height={1} backgroundColor="inactive">
              <Box width={`${pronto}%`} height={1} backgroundColor="#e8a33d" />
            </Box>
            <Text size="caption" dimColor>{processados + 1} de {andamento.total}. Pode continuar usando o Claude.</Text>
          </Box>
        )}
        {!andamento.atual && andamento.total > 0 && <Text size="caption" dimColor>Prontos: {andamento.feitos} de {andamento.total}.</Text>}
        {!andamento.atual && andamento.falhas.length > 0 && <Text size="caption" dimColor>Não deu: {andamento.falhas.join(', ')}. Use Adicionar nesses, e o Claude tenta ajustar.</Text>}
        {andamento.faltando.length > 0 && <Text>Falta instalar: {andamento.faltando.join(', ')}. Instale e clique de novo, ou use Adicionar para o Claude ajudar.</Text>}
        </Box>
        )}

        <Box flexDirection="column" gap="sm">
          <Text size="heading" weight="semibold">Seus memes{lista.length > 0 ? ` (${lista.length})` : ''}</Text>
          {lista.length === 0 && <Text dimColor>Nenhum ainda. Enquanto isso, aparecem os gatinhos em pixel.</Text>}
          {memesDaTela.map(m => (
            <Box key={`meme-${m.nome}`} flexDirection="column" gap="sm" paddingY="xs">
              <Box flexDirection="row" alignItems="center" gap="md">
                {Svg && previas.has(m.nome) && <Svg source={previas.get(m.nome) ?? ''} alt={m.titulo} width={Math.max(LARGURA_PREVIA, m.largura)} height={ALTURA_MEME} />}
                <Box flexDirection="column" flexGrow={1} flexShrink={1}>
                  <Text weight="medium">{m.titulo}</Text>
                  <Text size="caption" dimColor>{m.acoes.length > 0 ? m.acoes.map(a => NOME_DA_ACAO[a as keyof typeof NOME_DA_ACAO] ?? a).join(' · ') : 'Desligado: não aparece em nenhum momento'}</Text>
                </Box>
                <Button key={`ajustar-${m.nome}`} label={memeAberto === m.nome ? 'Fechar' : 'Ajustar'} onPress={() => void update($, aberto, atual => (atual === m.nome ? null : m.nome))} />
              </Box>
              {memeAberto === m.nome && (
                <Box flexDirection="column" gap="sm" padding="sm" borderStyle="round" borderDimColor>
                  <Text size="caption" dimColor>Quando aparece</Text>
                  <Box flexDirection="row" gap="sm" flexWrap="wrap">
                    {ACOES.map(a => (
                      <Button
                        key={`acao-${m.nome}-${a}`}
                        variant={m.acoes.includes(a) ? 'primary' : 'secondary'}
                        label={`${m.acoes.includes(a) ? '✓ ' : ''}${NOME_DA_ACAO[a]}`}
                        onPress={async () => {
                          const novaLista = (await read($, indice)).map(x => (x.nome === m.nome ? { ...x, acoes: x.acoes.includes(a) ? x.acoes.filter(y => y !== a) : acoesValidas([...x.acoes, a]) } : x))
                          await $.store.set('indice', novaLista)
                          await update($, indice, () => novaLista)
                        }}
                      />
                    ))}
                  </Box>
                  <Box flexDirection="row">
                    <Button
                      key={`remover-${m.nome}`}
                      label="Remover este meme"
                      dimColor
                      onPress={async () => {
                        const novaLista = (await read($, indice)).filter(x => x.nome !== m.nome)
                        await $.store.delete(`meme:${m.nome}`)
                        await $.store.set('indice', novaLista)
                        await update($, indice, () => novaLista)
                        await update($, aberto, () => null)
                        lidos.delete(m.nome)
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          ))}
          {telas.length > 1 && (
            <Box flexDirection="row" alignItems="center" gap="sm" flexWrap="wrap">
              {numeroDaTela > 0 && <Button key="tela-anterior" label="Voltar" onPress={() => void update($, tela, () => numeroDaTela - 1)} />}
              {numeroDaTela < telas.length - 1 && <Button key="tela-seguinte" label="Mais memes" onPress={() => void update($, tela, () => numeroDaTela + 1)} />}
              <Text size="caption" dimColor>Tela {numeroDaTela + 1} de {telas.length}</Text>
            </Box>
          )}
        </Box>

        {restantes.length > 0 && (
          <Box flexDirection="column" gap="sm">
            <Text size="heading" weight="semibold">Sugestões</Text>
            <Text size="caption" dimColor>Prefere escolher? Aqui o Claude prepara um por vez e confere o recorte, o que usa um pouco do seu limite.</Text>
            {restantes.map(s => (
              <Box key={`sugestao-${s.nome}`} flexDirection="row" alignItems="center" gap="md">
                <Box flexGrow={1} flexShrink={1}>
                  <Text>{s.titulo}</Text>
                </Box>
                <Button key={`adicionar-${s.nome}`} label="Adicionar" onPress={() => void $.prompt.submit({ text: pedidoDeAdicionar(s.link, $.plugin.root, s) })} />
              </Box>
            ))}
          </Box>
        )}

        <Box flexDirection="column" gap="sm">
          <Text size="heading" weight="semibold">Outro meme</Text>
          {Input
            ? (
              <Input
                key="novo-link"
                placeholder="Cole o link de um GIF ou vídeo"
                submitLabel="Adicionar"
                onSubmit={link => {
                  const limpo = link.trim()
                  if (!/^https?:\/\//.test(limpo)) {
                    $.ui.toast('Cole um link que comece com https://')
                    return
                  }
                  void $.prompt.submit({ text: pedidoDeAdicionar(limpo, $.plugin.root) })
                }}
              />
            )
            : <Text size="caption" dimColor>Digite /meme adicionar seguido do link.</Text>}
          <Text size="caption" dimColor>O Claude baixa, recorta e guarda aqui no seu computador.</Text>
        </Box>

        <Box flexDirection="row" alignItems="center" gap="sm" flexWrap="wrap">
          <Text size="caption" dimColor>Cor do gatinho</Text>
          {CORES_GATO.map(c => (
            <Button
              key={`cor-${c}`}
              variant={c === corAtual ? 'primary' : 'secondary'}
              label={`${c === corAtual ? '✓ ' : ''}${c === 'laranja' ? 'Laranja' : 'Cinza'}`}
              onPress={async () => {
                await $.store.set('cor', c)
                await update($, cor, () => c)
              }}
            />
          ))}
        </Box>

        <Box flexDirection="column" gap="xs">
          <Box flexDirection="row" alignItems="center" gap="sm" flexWrap="wrap">
            <Text size="caption" dimColor>No terminal</Text>
            {MODOS_TERMINAL.map(m => (
              <Button
                key={`terminal-${m}`}
                variant={m === modoAtual ? 'primary' : 'secondary'}
                label={`${m === modoAtual ? '✓ ' : ''}${NOME_DO_MODO[m]}`}
                onPress={async () => {
                  await $.store.set('modoTerminal', m)
                  await update($, modoTerminal, () => m)
                }}
              />
            ))}
          </Box>
          <Text size="caption" dimColor>Desenho usa 6 linhas e sorteia a cada mensagem, com Bongo Cat e Pop Cat se você os tiver. Texto usa 1 linha, para a tela não subir.</Text>
        </Box>
      </Box>
    )
  })
}
