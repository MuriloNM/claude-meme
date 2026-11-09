import { expect, test } from 'claude-code/testing'

import { ALTURA, LARGURA, LARGURA_PEQUENA, NOMES, PEQUENAS_PIXEL, animacaoDe, desenhar, desenharEsperando, desenharPequena, faseDaFaixa } from './animacoes'
import { FERRAMENTA_GUARDAR, comandoDePreparo, pedidoDeAdicionar } from './receita'
import { ACOES, ACOES_PADRAO, LIMITE_DESENHO, LIMITE_PREVIAS_POR_TELA, acaoDe, acoesValidas, dividirEmTelas, ehGif, escolherMeme, escolherPixel, nomeValido, quemNaPergunta, svgDoGif, svgNaPergunta } from './sorteio'
import type { MemeIndice } from './sorteio'
import { SUGESTOES, acharSugestao } from './sugestoes'
import { DESENHOS, TEXTOS, animacaoDePixels, celulasDePixels, desenhoDoTerminal, gatoDoTerminal, memeDoTerminal, textoDoTerminal } from './terminal'

const SPINNER = {
  plugin: 'meme',
  component: 'Spinner',
  requestId: 'agente',
  props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
} as const

const meme = (nome: string, acoes: string[], peso = 1, larguraPergunta: number | null = null): MemeIndice => ({ nome, titulo: nome, largura: 30, acoes, peso, larguraPergunta })

test('no app, a animação entra no lugar e o texto continua; no terminal fica tudo original', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>original</Text>
  })

  const app = await $.ui.mount({ ...SPINNER, surface: 'desktop' })
  expect((await app.find({ type: 'Text', text: /Working/ }))?.text).toBe('Working…')
  expect(await app.find({ type: 'Text', text: /original/ })).toBeUndefined()
  await app.unmount()

  const terminal = await $.ui.mount({ ...SPINNER, requestId: 'terminal', surface: 'terminal' })
  expect((await terminal.find({ type: 'Text', text: /original/ }))?.text).toBe('original')
  await terminal.unmount()
})

test('cada momento do Claude vira uma das seis ações', () => {
  expect(acaoDe('requesting', null)).toBe('enviando')
  expect(acaoDe('thinking', null)).toBe('pensando')
  expect(acaoDe('responding', null)).toBe('escrevendo')
  expect(acaoDe('tool-input', null)).toBe('editando')
  expect(acaoDe('tool-use', 'Bash')).toBe('comando')
  expect(acaoDe('tool-use', 'Grep')).toBe('lendo')
  expect(acaoDe('tool-use', 'Write')).toBe('editando')
})

test('o sorteio só usa memes marcados na ação, é estável e respeita o peso', () => {
  const lista = [meme('a', ['pensando']), meme('b', ['comando'], 3), meme('c', ['comando'])]
  expect(escolherMeme([], 'pensando', 5)).toBe(null)
  expect(escolherMeme(lista, 'lendo', 5)).toBe(null)
  expect(escolherMeme(lista, 'pensando', 99)?.nome).toBe('a')
  expect(escolherMeme(lista, 'comando', 7)?.nome).toBe(escolherMeme(lista, 'comando', 7)?.nome)
  const saiu = Array.from({ length: 4000 }, (_, n) => escolherMeme(lista, 'comando', n * 17)?.nome)
  const b = saiu.filter(n => n === 'b').length
  const c = saiu.filter(n => n === 'c').length
  expect(c).toBeGreaterThan(0)
  expect(b).toBeGreaterThan(c * 2)
})

test('sem meme na ação, sai um gatinho em pixel que existe', () => {
  for (const a of ACOES) expect(PEQUENAS_PIXEL.includes(escolherPixel(a, 12345))).toBe(true)
})

test('na pergunta revezam o gatinho e os memes preparados para isso', () => {
  const lista = [meme('a', []), meme('b', [], 1, 100)]
  expect(quemNaPergunta([], 3)).toBe(null)
  expect(quemNaPergunta(lista, 0)).toBe(null)
  expect(quemNaPergunta(lista, 1)?.nome).toBe('b')
  expect(quemNaPergunta(lista, 2)).toBe(null)
})

test('as animações em pixel têm o tamanho certo e animam', () => {
  for (const nome of NOMES) {
    const svg = desenhar(nome)
    expect(svg).toContain(`viewBox="0 0 ${LARGURA} ${ALTURA}"`)
    expect(svg).toContain('<animate')
    expect(svg).not.toContain('NaN')
    expect(svg.length).toBeLessThan(LIMITE_DESENHO)
  }
  for (const nome of PEQUENAS_PIXEL) {
    const svg = desenharPequena(nome)
    expect(svg).toContain(`viewBox="0 0 ${LARGURA_PEQUENA} ${ALTURA}"`)
    expect(svg).toContain('<animate')
    expect(desenharPequena(nome, 'cinza')).not.toContain('#e8a33d')
  }
  expect(desenharEsperando('cinza')).toContain('#9aa0a6')
  expect(desenharEsperando()).toContain('#e0567f')
})

test('a faixa segue a fase', () => {
  expect(animacaoDe('requesting', null, 'novelo', null)).toBe('correndo')
  expect(animacaoDe('thinking', null, 'novelo', null)).toBe('novelo')
  expect(animacaoDe('tool-use', 'Grep', 'novelo', null)).toBe('lendo')
  expect(faseDaFaixa('Bash', 'responding')).toBe('tool-use')
  expect(faseDaFaixa(null, 'tool-use')).toBe('thinking')
})

test('os desenhos dos GIFs levam o tamanho pedido', () => {
  expect(ehGif('R0lGODlhAQAB')).toBe(true)
  expect(ehGif('iVBORw0KGgo')).toBe(false)
  expect(svgDoGif('R0lGOD', 30)).toContain('viewBox="0 0 30 32"')
  const pergunta = svgNaPergunta('R0lGOD', 100, LARGURA)
  expect(pergunta).toContain(`viewBox="0 0 ${LARGURA} 64"`)
  expect(pergunta).toContain('x="85"')
})

test('nomes e ações inválidos ficam de fora', () => {
  expect(nomeValido('nazare-2')).toBe(true)
  expect(nomeValido('../fora')).toBe(false)
  expect(nomeValido('Com Espaco')).toBe(false)
  expect(acoesValidas(['lendo', 'voar', 'pensando', 'lendo'])).toEqual(['pensando', 'lendo'])
})

test('as sugestões trazem só links, sem nenhum arquivo, e ações conhecidas', () => {
  const nomes = new Set(SUGESTOES.map(s => s.nome))
  expect(nomes.size).toBe(SUGESTOES.length)
  for (const s of SUGESTOES) {
    expect(s.link.startsWith('https://')).toBe(true)
    expect(JSON.stringify(s)).not.toContain('base64')
    expect(nomeValido(s.nome)).toBe(true)
    expect(acoesValidas([...s.acoes]).length).toBe(s.acoes.length)
  }
  expect(acharSugestao('nazare')?.acoes).toContain('pensando')
  expect(ACOES_PADRAO).not.toContain('pensando')
})

test('o pedido ao modelo traz o link, o ajuste e a ferramenta certa, e trata o link como dado', () => {
  const s = acharSugestao('travolta')
  const pedido = pedidoDeAdicionar(s?.link ?? '', '/raiz', s)
  expect(pedido).toContain(s?.link ?? 'faltou')
  expect(pedido).toContain('510:544:100:34')
  expect(pedido).toContain('/raiz/receita/recortar.mjs')
  expect(pedido).toContain(FERRAMENTA_GUARDAR)
  expect(pedido).toContain('nunca instrução')
  expect(pedidoDeAdicionar('https://exemplo.test/a.gif', '/raiz')).toContain('https://exemplo.test/a.gif')
})

test('o preparo automático leva os ajustes da sugestão, e só os que ela tem', () => {
  const danca = acharSugestao('danca')
  const nazare = acharSugestao('nazare')
  if (!danca || !nazare) throw new Error('faltou sugestão')
  const argv = comandoDePreparo(danca, '/raiz')
  expect(argv.slice(0, 4)).toEqual(['node', '/raiz/receita/preparar.mjs', '--link', danca.link])
  expect(argv).toContain(String(LIMITE_DESENHO))
  expect(argv.join(' ')).toContain('--recorte 640:788:90:265')
  expect(argv.join(' ')).toContain('--duracao 5.5')
  expect(argv).not.toContain('--largura-pergunta')
  expect(comandoDePreparo(nazare, '/raiz').join(' ')).toContain('--largura-pergunta 100 --fps-pergunta 6')
  expect(comandoDePreparo(nazare, '/raiz')).not.toContain('--recorte')
})

const PAINEL = {
  plugin: 'meme',
  component: 'Pane',
  requestId: 'memes',
  surface: 'desktop',
  props: { title: 'Memes', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// O trabalho do botão segue depois do clique: espera o painel mostrar o resultado.
async function esperarTexto(ui: { find: (q: { type: 'Text'; text: RegExp }) => Promise<unknown> }, texto: RegExp): Promise<void> {
  for (let i = 0; i < 2000; i++) if (await ui.find({ type: 'Text', text: texto })) return
  throw new Error(`o painel não mostrou ${texto}`)
}

test('adicionar todos prepara as sugestões, guarda as que deram certo e aponta as que falharam', async ($, on) => {
  const guardados = new Map<string, unknown>()
  on('store.set', (_, e) => { guardados.set(e.key, e.value); return { value: undefined } })
  on('store.get', (_, e) => ({ value: guardados.get(e.key) }))
  on('process.run', (_, e) => {
    const argv = e.argv as readonly string[]
    if (argv[0] !== 'node' || argv[1] === '--version') return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    if (argv.includes(acharSugestao('fofo')?.link ?? 'faltou')) return { value: { exitCode: 1, stdout: '', stderr: 'o link não levou a um GIF ou vídeo', isStdoutTruncated: false, isStderrTruncated: false } }
    return { value: { exitCode: 0, stdout: JSON.stringify({ gif: 'R0lGODlh', largura: 30, pergunta: null, larguraPergunta: null }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const ui = await $.ui.mount(PAINEL)
  expect((await ui.find({ key: 'adicionar-todos' }))?.text).toBe(`Adicionar todos (${SUGESTOES.length})`)
  await ui.press({ key: 'adicionar-todos' })
  await esperarTexto(ui, new RegExp(`Prontos: ${SUGESTOES.length - 1} de ${SUGESTOES.length}`))

  expect(await ui.find({ type: 'Text', text: /Não deu: Gato fofo/ })).toBeDefined()
  expect(guardados.has('meme:bongo')).toBe(true)
  expect(guardados.has('meme:fofo')).toBe(false)
  expect((guardados.get('indice') as MemeIndice[]).find(m => m.nome === 'bongo')?.acoes).toEqual(['escrevendo'])
  // Só falta o que falhou, e o botão continua lá para tentar de novo.
  expect((await ui.find({ key: 'adicionar-todos' }))?.text).toBe('Adicionar todos (1)')
  await ui.unmount()
})

test('sem o ffmpeg, adicionar todos avisa o que falta e não baixa nada', async ($, on) => {
  const chamados: string[] = []
  on('process.run', (_, e) => {
    const argv = e.argv as readonly string[]
    chamados.push(argv.join(' '))
    if (argv[0] === 'ffmpeg') throw new Error('não encontrado')
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const ui = await $.ui.mount(PAINEL)
  await ui.press({ key: 'adicionar-todos' })
  await esperarTexto(ui, /Falta instalar: ffmpeg\./)

  expect(chamados.some(c => c.includes('preparar.mjs'))).toBe(false)
  await ui.unmount()
})

test('no painel, os ajustes ficam recolhidos e o meme aparece com prévia e resumo', async ($, on) => {
  const indiceGuardado = [meme('nazare', ['pensando', 'lendo'])]
  const guardados = new Map<string, unknown>([['indice', indiceGuardado], ['meme:nazare', { gif: 'R0lGODlh', pergunta: null }]])
  on('command.register', () => ({ value: { command: 'meme' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__meme__guardar' } }))
  on('store.set', (_, e) => { guardados.set(e.key, e.value); return { value: undefined } })
  on('store.get', (_, e) => ({ value: e.key === 'apresentado' ? true : guardados.get(e.key) }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount(PAINEL)
  expect(await ui.find({ type: 'Text', text: /Pensando · Lendo/ })).toBeDefined()
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  expect(await ui.find({ key: 'acao-nazare-lendo' })).toBeUndefined()

  await ui.press({ key: 'ajustar-nazare' })
  expect((await ui.find({ key: 'acao-nazare-lendo' }))?.text).toBe('✓ Lendo')
  await ui.press({ key: 'acao-nazare-lendo' })
  expect((guardados.get('indice') as MemeIndice[])[0]?.acoes).toEqual(['pensando'])
  await ui.unmount()
})

test('o terminal abre o painel sem prévias nem erro', async ($, on) => {
  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Seus memes/ })).toBeDefined()
  await ui.unmount()
})

test('as telas respeitam o limite, sem perder ninguém, e um item grande fica sozinho', () => {
  const tamanhoDe = (n: number) => n
  expect(dividirEmTelas([60, 30, 30, 200, 10], tamanhoDe, 100)).toEqual([[60, 30], [30], [200], [10]])
  expect(dividirEmTelas([], tamanhoDe, 100)).toEqual([])
})

test('com muitos memes, cada tela do painel leva só o que cabe, e o botão mostra os outros', async ($, on) => {
  const grande = 'R0lGODlh' + 'A'.repeat(49_000)
  const nomes = ['a', 'b', 'c', 'd', 'e']
  const guardados = new Map<string, unknown>([['indice', nomes.map(n => meme(n, ['lendo']))], ...nomes.map((n): [string, unknown] => [`meme:${n}`, { gif: grande, pergunta: null }])])
  on('command.register', () => ({ value: { command: 'meme' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__meme__guardar' } }))
  on('store.get', (_, e) => ({ value: e.key === 'apresentado' ? true : guardados.get(e.key) }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount(PAINEL)
  expect(LIMITE_PREVIAS_POR_TELA).toBeLessThan(127_000)
  expect(await ui.find({ key: 'ajustar-a' })).toBeDefined()
  expect(await ui.find({ key: 'ajustar-b' })).toBeDefined()
  expect(await ui.find({ key: 'ajustar-c' })).toBeUndefined()
  expect(await ui.find({ key: 'tela-anterior' })).toBeUndefined()

  await ui.press({ key: 'tela-seguinte' })
  expect(await ui.find({ key: 'ajustar-a' })).toBeUndefined()
  expect(await ui.find({ key: 'ajustar-c' })).toBeDefined()
  expect(await ui.find({ key: 'tela-anterior' })).toBeDefined()
  await ui.unmount()
})

const SPINNER_NO_TERMINAL = { ...SPINNER, requestId: 'linha', surface: 'terminal' } as const

test('os pixels viram meio-blocos com as duas cores, e o vazio fica com o fundo do terminal', () => {
  // Um caractere, 2 pixels: frente vermelha, fundo azul. Três números de 32 bits.
  expect(celulasDePixels([0xff0000, 0x0000ff], 1, 2)).toBe('gCUAAAAA/wD/AAAA')
  // Só o de baixo: meio-bloco de baixo, e o fundo fica o do terminal.
  expect(celulasDePixels([null, 0x00ff00], 1, 2)).toBe('hCUAAAD/AAAAAAAB')
  // Nada: espaço, com as duas cores do terminal.
  expect(celulasDePixels([null, null], 1, 2)).toBe('IAAAAAAAAAEAAAAB')
})

test('os gatinhos do terminal têm 24 por 12 pixels em todos os quadros, e as células batem com o tamanho', () => {
  for (const [nome, d] of Object.entries(DESENHOS)) {
    for (const q of d.quadros) {
      expect(q.length).toBe(12)
      for (const linha of q) expect(linha.length).toBe(24)
    }
    const a = desenhoDoTerminal(nome, 'laranja')
    expect(a.linhas).toBe(6)
    // 12 bytes por caractere, em base64: 16 caracteres.
    expect(a.quadros[0]?.length).toBe(24 * 6 * 16)
    expect(desenhoDoTerminal(nome, 'cinza').quadros[0]).not.toBe(a.quadros[0])
  }
  for (const [nome, t] of Object.entries(TEXTOS)) {
    const larguras = new Set(t.quadros.map(q => q.length))
    expect(larguras.size).toBe(1)
    expect(textoDoTerminal(nome, 'laranja').linhas).toBe(1)
  }
})

test('o gatinho da mensagem não muda com a ação, e o modo decide o tamanho', () => {
  expect(gatoDoTerminal('desenho', 'laranja', 7).chave).toBe(gatoDoTerminal('desenho', 'laranja', 7).chave)
  expect(gatoDoTerminal('desenho', 'laranja', 7).linhas).toBe(6)
  expect(gatoDoTerminal('texto', 'laranja', 7).linhas).toBe(1)
})

test('os pixels de um meme viram animação do terminal', () => {
  const a = animacaoDePixels('meme-x', { l: 2, a: 2, ms: 100, quadros: [['ff0000', '', '', '00ff00'], ['', '', '', '']] })
  expect(a).toMatchObject({ chave: 'meme-x', colunas: 2, linhas: 1, ms: 100 })
  expect(a.quadros.length).toBe(2)
})

test('o preparo pede a versão do terminal só para os memes que ficam bons nela', () => {
  const bongo = acharSugestao('bongo')
  const nazare = acharSugestao('nazare')
  if (!bongo || !nazare) throw new Error('faltou sugestão')
  expect(comandoDePreparo(bongo, '/raiz')).toContain('--terminal')
  expect(comandoDePreparo(nazare, '/raiz')).not.toContain('--terminal')
  expect(SUGESTOES.filter(s => s.terminal).map(s => s.nome).sort()).toEqual(['bongo', 'pop'])
})

test('no terminal, o desenho entra ao lado da linha original', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>original</Text>
  })
  const ui = await $.ui.mount(SPINNER_NO_TERMINAL)
  expect(await ui.find({ type: 'Raster' })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /original/ }))?.text).toBe('original')
  await ui.unmount()
})

test('no modo original, o terminal fica sem desenho', async ($, on) => {
  on('command.register', () => ({ value: { command: 'meme' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__meme__guardar' } }))
  on('store.get', (_, e) => ({ value: e.key === 'apresentado' ? true : e.key === 'modoTerminal' ? 'original' : undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>original</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(SPINNER_NO_TERMINAL)
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /original/ }))?.text).toBe('original')
  await ui.unmount()
})

test('um meme com versão do terminal entra no sorteio de lá; sem ela, fica o gatinho', async ($, on) => {
  const meme6 = { chave: 'meme-bongo', colunas: 2, linhas: 1, ms: 100, quadros: ['IAAAAAAAAAEAAAABIAAAAAAAAAEAAAAB', 'IAAAAAAAAAEAAAABIAAAAAAAAAEAAAAB'] }
  const guardados = new Map<string, unknown>([
    ['apresentado', true],
    ['indice', [{ ...meme('bongo', ['pensando']), temTerminal: true }, meme('nazare', ['pensando'], 50)]],
    ['meme:bongo', { gif: 'R0lGOD', pergunta: null, terminal: meme6 }],
    ['meme:nazare', { gif: 'R0lGOD', pergunta: null }],
  ])
  on('command.register', () => ({ value: { command: 'meme' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__meme__guardar' } }))
  on('store.get', (_, e) => ({ value: guardados.get(e.key) }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>original</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount(SPINNER_NO_TERMINAL)
  const r = (await ui.find({ type: 'Raster' })) as { props?: { columns?: number } } | undefined
  expect(r).toBeDefined()
  await ui.unmount()
})

test('no terminal, o sorteio mistura gatinhos e memes, e sem meme sai sempre gatinho', () => {
  expect(memeDoTerminal([], 123)).toBe(null)
  const saiu = Array.from({ length: 600 }, (_, n) => memeDoTerminal(['bongo', 'pop'], n))
  expect(saiu.filter(m => m === 'bongo').length).toBe(100)
  expect(saiu.filter(m => m === 'pop').length).toBe(100)
  expect(saiu.filter(m => m === null).length).toBe(400)
  expect(memeDoTerminal(['bongo', 'pop'], 7)).toBe(memeDoTerminal(['bongo', 'pop'], 7))
})
