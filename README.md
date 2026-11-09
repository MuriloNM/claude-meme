# claude-meme

Mod do Claude Code que troca as bolinhas de trabalho no app desktop por gatinhos em pixel e pelos memes que você escolher.

## Instalar

No app desktop: clique no **+** ao lado da caixa de mensagem, depois em **Plugins**, **Add marketplace** com `MuriloNM/claude-meme` e **Add plugin**.

No terminal do Claude Code:

```
/plugin install meme --marketplace MuriloNM/claude-meme
```

Ou de um shell:

```bash
claude plugin install meme --marketplace MuriloNM/claude-meme
```

## Como funciona

Logo depois de instalar, o mod mostra gatinhos em pixel. Para usar memes, digite `/meme`: abre um painel com as sugestões, onde você também tira os que não quiser e escolhe em quais ações cada um aparece.

O botão **Adicionar todos** baixa as sugestões dos links originais, recorta e guarda na sua máquina em um clique, sem usar seu limite de uso. Ele precisa do [Node.js](https://nodejs.org) e do [ffmpeg](https://ffmpeg.org) instalados; o painel avisa se faltar algum.

O botão **Adicionar** de cada sugestão e o comando `/meme adicionar` pedem ao Claude para baixar, recortar, conferir o resultado e guardar. Isso usa um pouco do seu limite, mas ele ajusta o recorte se o arquivo tiver mudado, e funciona com qualquer link. Se faltar o ffmpeg, o Claude explica como instalar e espera o seu ok.

| Comando | O que faz |
| --- | --- |
| `/meme` | Abre o painel com seus memes e as sugestões |
| `/meme sugestoes` | Lista os memes sugeridos |
| `/meme adicionar <nome ou link>` | O Claude prepara e guarda o meme |
| `/meme remover <nome>` | Tira um meme |
| `/meme acoes <nome> <ações>` | Escolhe quando ele aparece |
| `/meme lista` | Mostra seus memes |
| `/meme cor <laranja ou cinza>` | Muda a cor do gatinho em pixel |

As ações são `enviando`, `pensando`, `escrevendo`, `comando`, `lendo` e `editando`. Quando mais de um meme está na mesma ação, sai um por sorteio. Sem nenhum meme na ação, aparece um gatinho em pixel.

Na linha com tempo e seta, no selo de espera e nos pedidos de permissão continua o desenho do próprio app, porque o mod não alcança esses lugares. No terminal, a animação original fica como está.

## Direitos dos memes

Este repositório não contém nenhum GIF de terceiros: só os desenhos em pixel, feitos para o mod, e links para onde as sugestões já estão publicadas. Os memes pertencem aos respectivos donos. A cópia que o Claude prepara fica só na sua máquina, para uso pessoal; não a redistribua. Se você é dono de um desses conteúdos e quer tirar um link da lista, abra uma issue.

## Licença

Código e desenhos em pixel: [MIT](LICENSE).
