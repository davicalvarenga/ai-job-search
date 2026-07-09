<p align="center">
  <img src="claude_animation.gif" alt="Assistente de Busca de Emprego com IA" width="200">
</p>

# AI Job Search — Guia em Português (Brasil) 🇧🇷

> 🌐 **English version:** [README.md](README.md)

Um framework de candidatura a vagas movido a IA, construído sobre o [Claude Code](https://claude.com/claude-code). Faça um fork, preencha seu perfil, e deixe o Claude avaliar vagas, adaptar seu currículo, escrever cartas de apresentação e te preparar para entrevistas.

Este fork adapta o projeto original de [Mads Lorentzen](https://github.com/MadsLorentzen/ai-job-search) (feito para o mercado dinamarquês) ao **mercado brasileiro**, adicionando integrações com **Gupy** e **Vagas.com** e ajustando o fluxo para gerar currículos e cartas no idioma da vaga.

> Nota: este é um projeto open source independente, sem afiliação com a Anthropic. Claude Code é citado apenas como a ferramenta que o fluxo utiliza.

## O que é isto

Um fluxo de trabalho estruturado que transforma o Claude Code em um assistente completo de candidatura a vagas. O núcleo (montagem de perfil, avaliação de compatibilidade e o pipeline redator-revisor) é **independente de país e idioma** — funciona em português naturalmente.

```
/setup          /scrape              /apply <url>
  |                |                     |
  v                v                     v
Preencha        Busca vagas          Avalia compatibilidade
seu perfil      nos portais          Pontua e recomenda
  |                |                     |
  v                v                     v
Perfil          Apresenta vagas      Redige CV + Carta
pronto          com nota de fit      (LaTeX, sob medida)
                   |                     |
                   v                     v
                Escolha uma          Agente revisor critica
                -> /apply            -> Revisa -> Saída final
```

**O que você ganha na prática:**

- **Avaliação honesta de compatibilidade** antes de cada candidatura — o sistema pontua a vaga contra seu perfil (habilidades, experiência, cultura, localização) e diz onde você é forte e onde tem lacunas, sem inventar nada.
- **CV e carta de apresentação em LaTeX**, adaptados a cada vaga, compilados em PDF e inspecionados visualmente (o CV sai com exatamente 2 páginas, a carta com 1).
- **Verificação de ATS**: o texto embutido no PDF é extraído e conferido do jeito que um robô de triagem (como o da Gupy) realmente lê — contato como texto literal, palavras-chave da vaga cobertas honestamente.
- **Regra de honestidade obrigatória**: nenhuma habilidade ou experiência é fabricada. Lacunas reais ficam visíveis; o sistema nunca "enche" o CV de palavra-chave que você não tem.
- **Idioma automático**: vaga em português gera CV e carta em português; vaga em inglês, em inglês.

## Pré-requisitos

- [Claude Code](https://claude.com/claude-code) (CLI da Anthropic — requer assinatura ou API key)
- Python 3.10+
- [Bun](https://bun.sh) (para as ferramentas de busca de vagas)
- Distribuição LaTeX com `lualatex` e `xelatex`: [MiKTeX](https://miktex.org/) (Windows), [TeX Live](https://tug.org/texlive/) (Linux), [MacTeX](https://tug.org/mactex/) (macOS) ou [TinyTeX](https://yihui.org/tinytex/). O CV compila com `lualatex`; a carta com `xelatex` (o `cover.cls` exige `fontspec`). Instalação mínima? Veja os pacotes extras em [SETUP.md](SETUP.md#minimal-tex-install-tinytexbasictex).
- Opcional: `pdftotext` do [poppler](https://poppler.freedesktop.org/) (Windows: `choco install poppler`; Ubuntu/Debian: `apt install poppler-utils`; macOS: `brew install poppler`) — usado na verificação de ATS do CV compilado. Se faltar, a checagem degrada graciosamente para revisão visual.

## Começando

### 1. Fork e clone

```bash
gh repo fork davicalvarenga/ai-job-search --clone
cd ai-job-search
```

(Ou faça o fork pelo site do GitHub e `git clone` normalmente.)

### 2. Instale as ferramentas de busca

Os três portais mais úteis para o Brasil têm **zero dependências de runtime** — rodam só com `bun`. O `bun install` apenas baixa tipos de desenvolvimento:

```bash
cd .agents/skills/gupy-search/cli && bun install && cd ../../../..
cd .agents/skills/vagas-com-search/cli && bun install && cd ../../../..
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
```

No PowerShell:

```powershell
$tools = @("gupy-search", "vagas-com-search", "linkedin-search")
foreach ($tool in $tools) {
  Set-Location ".agents/skills/$tool/cli"
  bun install
  Set-Location "..\..\..\.."
}
```

Os portais dinamarqueses do projeto original (`jobindex-search`, `jobnet-search` etc.) continuam no repositório — você pode ignorá-los ou removê-los do seu fork.

### 3. Monte seu perfil

```bash
claude
# Dentro do Claude Code:
/setup
```

O `/setup` oferece três caminhos: ler sua pasta `documents/` (PDF do currículo, export do LinkedIn, diplomas, cartas de referência, candidaturas antigas), importar um CV colado no chat, ou uma entrevista guiada. Ele detecta o que você tem e pergunta. Pode responder em português — o fluxo inteiro funciona no idioma que você usar.

> **A profundidade do perfil é o que mais importa.** Não liste só cargos: descreva o que você de fato fez, com projetos, ferramentas e resultados. "Automatizei a abertura de chamados integrando GLPI ao Rocket.Chat com n8n" rende candidaturas muito melhores que "automação de processos".

### 4. Busque vagas

```bash
/scrape
```

Busca nos portais configurados vagas compatíveis com seu perfil, remove duplicatas entre execuções e apresenta os resultados ordenados por compatibilidade. Se vierem vagas demais, rode `/rank` para pontuar todas em lote e receber uma lista curta ranqueada.

### 5. Candidate-se

```bash
/apply https://portal.gupy.io/job/eyJqb2JJZCI6...
```

Se a URL não puder ser acessada (alguns portais bloqueiam acesso automatizado), cole a descrição da vaga diretamente:

```bash
/apply <cole aqui a descrição completa da vaga>
```

Isso roda o fluxo completo: avaliar compatibilidade → redigir CV + carta → revisão por um segundo agente → revisar → compilar e inspecionar os PDFs → verificação de ATS → entrega final com checklist.

## Portais brasileiros

### Gupy (`gupy-search`)

Busca no Portal de Vagas público da Gupy (portal.gupy.io) — o maior ATS de recrutamento do Brasil, usado por milhares de empresas. Sem autenticação, sem API key.

```bash
# Vagas de desenvolvedor júnior, remotas
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "desenvolvedor júnior" --remote remote --format table

# Estágios de TI publicados nos últimos 14 dias
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "estágio TI" --remote remote --jobage 14 --format table

# Vagas presenciais numa cidade específica
bun run .agents/skills/gupy-search/cli/src/cli.ts search -l "Goiânia" --format table
```

Dica: o filtro `--location` casa exatamente com o campo `city` da Gupy — combinar cidade estreita com busca estreita pode zerar os resultados. Para "na minha cidade **ou** remoto", faça duas buscas.

### Vagas.com (`vagas-com-search`)

Busca nas páginas públicas do Vagas.com — um dos maiores portais generalistas do Brasil, forte em **estágio e trainee**.

```bash
bun run .agents/skills/vagas-com-search/cli/src/cli.ts search -q "estágio desenvolvimento" --format table
```

> ⚠️ **Uso pessoal apenas.** O `robots.txt` do Vagas.com bloqueia nominalmente crawlers da Anthropic. O skill acessa apenas as páginas públicas de busca, mas mantenha o volume baixo, não use comercialmente nem para coleta em massa, e reavalie se os termos do site mudarem. Uso por sua conta e risco — detalhes em `.agents/skills/vagas-com-search/SKILL.md`.

### LinkedIn (`linkedin-search`)

Usa os endpoints públicos e não autenticados `jobs-guest` do LinkedIn. Funciona para qualquer lugar do mundo via flag de localização:

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "desenvolvedor júnior" -l "Goiânia, Goiás, Brazil" --format table
```

Também é **uso pessoal apenas** — acesso automatizado é contra os Termos de Serviço do LinkedIn, então mantenha o volume baixo.

### Outros portais (Catho, InfoJobs, Indeed…)

Rode `/add-portal` com a URL do portal. O comando investiga o site (padrão de URL de busca, estrutura dos resultados, robots.txt), gera um skill de CLI com a mesma estrutura dos existentes e testa uma busca real antes de registrar. Portais que exigem login são recusados; portais com termos restritivos ganham aviso de uso pessoal no skill gerado.

## Outros comandos

| Comando | O que faz |
|---------|-----------|
| `/rank` | Pontua em lote todas as vagas recém-raspadas e devolve uma lista curta ranqueada, com pontos fortes e lacunas honestas por vaga |
| `/interview` | Monta um pacote de preparação para entrevista de uma candidatura registrada: pesquisa a empresa e os entrevistadores, mapeia perguntas prováveis para seus exemplos STAR e oferece simulação de entrevista |
| `/outcome` | Registra o resultado de uma candidatura (entrevista, oferta, rejeição, silêncio) e arquiva os materiais enviados em `documents/applications/` |
| `/expand` | Enriquece seu perfil varrendo fontes públicas já vinculadas (GitHub, portfólio) e ementas de cursos e certificações citados |
| `/upskill` | Analisa a lacuna entre seu perfil e as vagas rastreadas e gera um plano de estudos priorizado, com recursos pesquisados na web |
| `/add-template` | Registra seu próprio template LaTeX de CV ou carta no lugar dos padrões |
| `/add-portal` | Gera um skill de busca para um portal de vagas do seu mercado |
| `/reset` | Apaga os dados do perfil para começar do zero (pede confirmação explícita) |

## Privacidade: seus dados pessoais e o Git

Este repositório foi desenhado para ser publicado **sem** vazar seus dados:

- Os arquivos de perfil commitados contêm apenas placeholders (`[YOUR_NAME]`, `[YOUR_PHONE]`…). Seus dados reais vivem só na sua cópia local.
- O `.gitignore` já exclui CVs direcionados (`cv/main_*.tex`), cartas geradas (`cover_letters/cover_*.tex`), PDFs, a pasta `documents/` e o tracker de candidaturas.
- **Nunca use `git add -A` / `git commit -am`** depois de preencher o perfil — os arquivos de perfil são rastreados e um add descuidado publica seu telefone e endereço no histórico (que é praticamente irreversível depois de publicado).
- Proteção extra recomendada — diga ao git para ignorar suas modificações locais nesses arquivos:

```bash
git update-index --skip-worktree CLAUDE.md cv/main_example.tex \
  .claude/skills/job-application-assistant/01-candidate-profile.md \
  .claude/skills/job-application-assistant/02-behavioral-profile.md \
  .claude/skills/job-application-assistant/04-job-evaluation.md \
  .claude/skills/job-application-assistant/05-cv-templates.md \
  .claude/skills/job-application-assistant/07-interview-prep.md \
  .claude/skills/job-scraper/search-queries.md
```

Para voltar a rastrear (ex.: para atualizar o template), troque por `--no-skip-worktree`.

## Estrutura de arquivos

```
ai-job-search/
├── CLAUDE.md                          # Perfil principal + regras do fluxo
├── .claude/
│   ├── commands/                      # /setup /apply /rank /interview /outcome …
│   └── skills/
│       ├── job-application-assistant/ # Perfil, avaliação de fit, templates, entrevista
│       ├── job-scraper/               # Orquestração da busca de vagas
│       └── upskill/                   # Análise de lacunas de habilidades
├── .agents/skills/
│   ├── gupy-search/                   # Gupy (Brasil) 🇧🇷
│   ├── vagas-com-search/              # Vagas.com (Brasil) 🇧🇷
│   ├── linkedin-search/               # LinkedIn (qualquer país)
│   └── job*-search/                   # Portais dinamarqueses (projeto original)
├── cv/main_example.tex                # Template de CV (moderncv, estilo banking)
├── cover_letters/                     # Template de carta (cover.cls + fontes)
├── templates/                         # Templates próprios via /add-template
├── documents/                         # Seus materiais de carreira (ignorado pelo git)
└── SETUP.md                           # Guia de instalação detalhado
```

## Dicas para melhores resultados

- **Detalhe seu perfil.** É o fator número um da qualidade. Descreva projetos, ferramentas e conquistas mensuráveis em cada experiência — inclusive estágios e trabalhos fora de TI, que frequentemente rendem bons exemplos comportamentais.
- **Habilidades em contexto.** "Integrei APIs REST do GLPI ao Nextcloud Talk com n8n" diz muito mais que "n8n, APIs REST".
- **Deixe o sistema descobrir caminhos.** Ao descrever no `/setup` o que te dá energia e o que te drena, o fluxo passa a sugerir tipos de vaga que você talvez não tenha considerado.
- **Registre os resultados.** Depois de algumas candidaturas resolvidas via `/outcome`, rode `/setup` de novo — ele calibra o framework de avaliação com o que realmente gerou entrevistas.

## Contribuindo

Adaptações para o mercado brasileiro (novos portais, melhorias nos skills Gupy/Vagas.com, correções na documentação em português) são bem-vindas aqui via issue ou PR. Melhorias no framework central pertencem ao [projeto original](https://github.com/MadsLorentzen/ai-job-search) — leia o [CONTRIBUTING.md](CONTRIBUTING.md) para entender o que é mergeado lá e o que vive em forks.

Mantém um fork adaptado a outro mercado? Registre na thread de [Community forks & adaptations](https://github.com/MadsLorentzen/ai-job-search/discussions/78) do projeto original.

## Créditos

- [Mads Lorentzen](https://github.com/MadsLorentzen) — autor do framework original
- [Mikkel Krogholm](https://github.com/mikkelkrogsholm) — skills de CLI de busca de vagas
- Construído com [Claude Code](https://claude.com/claude-code) da [Anthropic](https://anthropic.com)

## Licença

MIT
