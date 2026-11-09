// Os programas que o "Adicionar todos" usa. O app guarda a lista de pastas de programas de quando abriu, ou uma lista curta
// quando abre pelo ícone: o que foi instalado depois não aparece nela. Por isso, a cada clique, a busca lê as pastas
// atuais do sistema, sem exigir reiniciar. Só contas e dados, sem tocar no app, para o teste poder conferir.
export const PROGRAMAS_NECESSARIOS = [['node', '--version'], ['ffmpeg', '-version'], ['ffprobe', '-version']] as const

type Resultado = { exitCode: number; stdout: string }
type Rodar = (argv: readonly string[], init?: { env?: Record<string, string>; timeoutMs?: number }) => Promise<Resultado>
type Ambiente = { os?: string; shell?: string; caminho?: string }
export type Programas = { faltando: string[]; node?: string; ambiente?: Record<string, string> }

const TEMPO_DA_BUSCA = 15_000

// Em UTF-8, para não estragar uma pasta com acento no nome da pessoa.
const BUSCA_NO_WINDOWS = [
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8',
  "$c=@([Environment]::GetEnvironmentVariable('Path','Machine'),[Environment]::GetEnvironmentVariable('Path','User'),\"$env:ProgramFiles\\nodejs\",\"$env:LOCALAPPDATA\\Programs\\nodejs\",\"$env:LOCALAPPDATA\\Microsoft\\WinGet\\Links\",\"$env:ProgramData\\chocolatey\\bin\",\"$env:USERPROFILE\\scoop\\shims\")",
  "$p=\"$env:LOCALAPPDATA\\Microsoft\\WinGet\\Packages\"",
  "if(Test-Path $p){$c+=Get-ChildItem $p -Directory -Filter '*FFmpeg*' | Get-ChildItem -Recurse -Filter ffmpeg.exe | ForEach-Object DirectoryName}",
  "($c | Where-Object {$_}) -join ';'",
].join(';')

const PASTAS_COMUNS_FORA_DO_WINDOWS = ['/opt/homebrew/bin', '/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin']

function ehPastaCompleta(caminho: string, windows: boolean): boolean {
  return windows ? /^[a-z]:[\\/]/i.test(caminho) : caminho.startsWith('/')
}

// Só pastas completas: um item vazio ou relativo faria a busca olhar a pasta do projeto aberto.
export function juntarPastas(windows: boolean, ...listas: readonly (string | undefined)[]): string {
  const separador = windows ? ';' : ':'
  const pastas = listas.flatMap(l => (l ?? '').split(separador)).map(p => p.trim()).filter(p => ehPastaCompleta(p, windows))
  return [...new Set(pastas)].join(separador)
}

// As pastas de programas de agora: as gravadas no sistema, no Windows; as do shell da pessoa, nos outros.
export async function pastasAtuais(rodar: Rodar, ambiente: Ambiente): Promise<string | undefined> {
  const windows = ambiente.os === 'Windows_NT'
  const argv = windows
    ? ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', BUSCA_NO_WINDOWS]
    : [ambiente.shell || '/bin/sh', '-ilc', 'printf "\\n%s" "$PATH"']
  // O shell pode escrever outras coisas ao abrir: o que interessa é a última linha.
  const achadas = await rodar(argv, { timeoutMs: TEMPO_DA_BUSCA }).then(
    r => (r.exitCode === 0 ? r.stdout.trim().split(/\r?\n/).pop() : undefined),
    () => undefined,
  )
  const comuns = windows ? undefined : PASTAS_COMUNS_FORA_DO_WINDOWS.join(':')
  // O que o app já enxerga vem primeiro, para nenhum comando que já funcionava mudar de versão.
  return juntarPastas(windows, ambiente.caminho, achadas, comuns) || undefined
}

function enderecoDe(saida: string, windows: boolean): string | undefined {
  return saida.split(/\r?\n/).map(l => l.trim()).find(l => ehPastaCompleta(l, windows))
}

// Sempre pelo endereço completo: o app lembra até o fim da sessão que não achou um comando pelo nome, e aí instalar não mudaria nada.
// A busca fica só na lista de pastas, nunca na pasta do projeto aberto, onde um arquivo com o mesmo nome rodaria no lugar do programa.
export async function acharProgramas(rodar: Rodar, ambiente: Ambiente): Promise<Programas> {
  const windows = ambiente.os === 'Windows_NT'
  const pastas = await pastasAtuais(rodar, ambiente)
  const env = pastas ? { PATH: pastas } : undefined
  const faltando: string[] = []
  let node: string | undefined
  for (const [programa, versao] of PROGRAMAS_NECESSARIOS) {
    const busca = windows ? ['where.exe', `$PATH:${programa}.exe`] : ['/bin/sh', '-c', 'command -v "$1"', 'sh', programa]
    const achou = await rodar(busca, { env }).then(async r => {
      const endereco = r.exitCode === 0 ? enderecoDe(r.stdout, windows) : undefined
      if (!endereco) return undefined
      return (await rodar([endereco, versao], { env })).exitCode === 0 ? endereco : undefined
    }).catch(() => undefined)
    if (!achou) faltando.push(programa)
    if (programa === 'node') node = achou
  }
  return { faltando, node, ambiente: env }
}

// Para a pessoa, ffmpeg e ffprobe são a mesma instalação.
export function nomesParaInstalar(faltando: readonly string[]): string[] {
  return [...new Set(faltando.map(p => (p === 'node' ? 'Node.js' : 'ffmpeg')))]
}
