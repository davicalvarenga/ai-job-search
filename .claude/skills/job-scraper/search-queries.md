# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`; Danish demos and any skill you add with `/add-portal` are included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

## Search Sites

Primary (mercado brasileiro):
- **gupy.io** - maior plataforma de recrutamento (ATS) do Brasil; coberto pela CLI `gupy-search`
- **vagas.com.br** - um dos maiores portais generalistas do Brasil; coberto pela CLI `vagas-com-search`
- **linkedin.com/jobs** - vagas no LinkedIn (filtro: Brasil / Brasília); coberto pela CLI `linkedin-search`

Secondary (páginas de carreira de empresas via Google):
- Buscas diretas no Google com filtros `site:` para empresas-alvo específicas

## Query Categories

Queries são agrupadas por prioridade. Cada query deve ser combinada com termos de localização (Brasília, DF, remoto) onde o portal suportar.

### Priority 1: Backend Python

Alinhado com a direção de carreira mais desejada por Laura (transição para Backend).

```
site:gupy.io "desenvolvedor backend" Python Brasília
site:vagas.com.br "desenvolvedor backend" Python Brasília OR remoto
site:linkedin.com/jobs "backend developer" Python Brasil
```

### Priority 2: IA / LLM / Dados

Alinhado com os projetos pessoais em LangChain/LLM e as certificações em Data Fundamentals.

```
site:gupy.io "engenheiro de IA" OR "desenvolvedor IA" LLM Brasília OR remoto
site:vagas.com.br "analista de dados" OR "cientista de dados" Python Brasil
site:linkedin.com/jobs "AI engineer" OR "LLM" Python Brasil
```

### Priority 3: Full Stack / Python (adjacent)

Papéis adjacentes que aproveitam tanto a experiência em Front-End quanto o Python.

```
site:gupy.io "desenvolvedor full stack" Python React Brasília OR remoto
site:vagas.com.br "desenvolvedor full stack" Python Brasil
```

### Priority 4: Front-End / Desenvolvimento Web (broader net)

Rede mais ampla, aproveitando a experiência profissional atual em Front-End/No-Code.

```
site:gupy.io "desenvolvedor front-end" OR "desenvolvedor web" Brasília OR remoto
site:vagas.com.br "desenvolvedor front-end" React Brasil
site:linkedin.com/jobs "front-end developer" React Brasil
```

## Location Filter

Laura não deseja se mudar de cidade. Áreas aceitáveis:
- Brasília, DF e região (presencial ou híbrido)
- Remoto (qualquer localização da empresa, dentro do Brasil ou fora, desde que 100% remoto)
- Qualquer vaga que exija mudança de cidade/relocação: **excluir (deal-breaker)**

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
