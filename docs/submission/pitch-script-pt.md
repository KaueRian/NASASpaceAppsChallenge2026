# 🎤 Roteiro do Pitch de Palco (3 Minutos — PT-BR) & Estrutura de Slides (`pitch-script-pt.md`)

> **Regra do Regulamento HUBEE Vilhena (Art. 6.2):** Apenas **1 representante** sobe ao palco para apresentar em **até 3 minutos (180 segundos)**.  
> **Público-Alvo:** Banca avaliadora local de Vilhena (cientistas, Sebrae-RO, agronegócio, acadêmicos).

---

## 📊 Estrutura dos 7 Slides (PDF Local)

1. **Slide 1 — Capa & Gancho:** `EarthTrend Detective` — *Anomalia passageira ou tendência climática comprovada? Investigando 45 anos de dados da NASA em Rondônia e no mundo.*
2. **Slide 2 — O Problema:** Gráficos comuns enganam. Produtores rurais, gestores hídricos e escolas não têm como separar o ruído de um único ano atípico (El Niño) de uma mudança estrutural de longo prazo.
3. **Slide 3 — As 4 Perguntas do Desafio & O Nosso Motor Científico:**
   - *O que mudou?* (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT` via **NASA POWER / MERRA-2**).
   - *Como eliminamos o ruído sazonal?* **Estratificação de Janela Sazonal** (`Anual`, `Out–Mar`, `Abr–Set`).
   - *Quanto mudou?* **Estimador de Inclinação de Sen (*Sen's Slope*)**.
   - *É significativo?* **Teste Não-Paramétrico de Mann-Kendall** ($p < 0.01$ = Evidência Forte).
4. **Slide 4 — As Descobertas Reais nas 4 Escalas (`Vilhena → Rondônia → Brasil → Mundo`, `1981–2025`):**
   - **Caso #01 — Vilhena, RO (Estação Seca Abr–Set, `PRECTOTCORR`):** **`-234,5 mm`** em 45 anos (`-53,3 mm/década`, $p = 0,00013$).
   - **Caso #02 — Ariquemes, RO (Noites Tropicais, `T2M_MIN`):** **`+1,82 °C`** nas temperaturas mínimas noturnas ($p = 0,000001$).
   - **Caso #03 — Corumbá / Pantanal, MS (Brasil, `GWETROOT`):** **`-5,60 pontos (%)`** de umidade na zona radicular ($p = 0,000024$).
   - **Caso #04 — Svalbard (Contraste Ártico Global, `T2M`):** **`+3,50 °C`** — provando como processos globais geram velocidades e direções diferentes em cada região.
5. **Slide 5 — Demonstração Visual (`<Investigation />` + `<TrendChart />` + `<SatelliteTimelapse />` + `<EvidenceCard />`):**
   - Visualização no tema Dark Editorial com alternância *Linha / Barras / Faixas Climáticas*, busca ao vivo em frase natural para qualquer município brasileiro (Sugestão #2 do Manual da Banca) + Opções avançadas com varredura FDR das 4 variáveis, comparação orbital **Antes vs. Depois (`2000` vs. `2025`)** no NASA GIBS / MODIS e Cartão de Evidência arquival em PNG com QR Code.
6. **Slide 6 — Rigor Científico (`Correlação ≠ Causalidade`) & Missão Amazônia (ODS 6, 13 e 15):**
   - Nossa página **Metodologia Completa (`<MethodsPage />`, seções `01–07`)** ensina em sala de aula que significância estatística prova tendência direcional observada, sem confundir correlação com causa única isolada, dialogando com dados de cobertura vegetal (*MapBiomas*).
7. **Slide 7 — Encerramento & Chamada para Ação:** QR Code do app ao vivo + Cartão *Show Your Stripes* de Vilhena.

---

## 🗣️ Texto Falado do Pitch (180 Segundos Cronometrados)

### [0:00 – 0:30] 1. O Gancho Local (Slide 1 e 2)
> "Boa tarde, jurados! Todo produtor rural aqui de Vilhena e todo morador de Rondônia já fez a mesma pergunta nos últimos anos: *'A estação seca está ficando mais longa? As noites estão mais quentes? Ou isso é só um ano atípico de El Niño?'*  
> Olhar para um gráfico comum não responde isso, porque o olho humano confunde oscilação normal com tendência — e dados brutos de satélite da NASA são complexos demais para quem está no campo ou na sala de aula.  
> Para resolver esse desafio, nós criamos o **EarthTrend Detective**."

### [0:30 – 1:15] 2. Como Funciona & Rigor Estatístico (Slide 3)
> "Em vez de mais um dashboard genérico, construímos uma bancada de perícia climática.  
> Quando você abre um caso, nosso motor busca **45 anos de dados reais da NASA POWER e do modelo MERRA-2**, de 1981 a 2025.  
> Primeiro, nós resolvemos a maior armadilha da ciência de dados climáticos: **isolamos as janelas sazonais** — separando estação chuvosa de estação seca — para que o ciclo normal do ano não contamine a conta.  
> Depois, aplicamos dois métodos matemáticos consagrados: o **Estimador de Sen's Slope**, que calcula **o quanto mudou** sem ser distorcido por anos extremos, e o teste não-paramétrico de **Mann-Kendall**, que calcula o valor-$p$ e crava o carimbo no dossiê: **Evidência Forte (99% de confiança)**, **Evidência Confirmada (95%)** ou **Evidência Insuficiente**."

### [1:15 – 2:05] 3. O Que Descobrimos nas 4 Escalas (Slide 4 e 5)
> "E o que os dados reais da NASA revelaram partindo da nossa cidade para o mundo?  
> - **Caso #01, aqui em Vilhena:** entre abril e setembro, a nossa estação seca perdeu **234 milímetros de chuva** desde 1981 — uma queda de **53 milímetros por década**, com 99% de confiança estatística. Isso explica na matemática a pressão sobre a janela da safrinha!  
> - **Caso #02, em Rondônia (Ariquemes):** as temperaturas mínimas noturnas subiram **1,82 °C**, aumentando o estresse térmico humano e agrícola.  
> - **Caso #03, no Brasil (Corumbá, no Pantanal):** a umidade do solo na zona das raízes caiu **5,60 pontos percentuais** em 45 anos, agravando a vulnerabilidade às queimadas.  
> - E no **Caso #04, em Svalbard no Ártico**, o aquecimento chega a **3,50 °C** — demonstrando na prática o que o desafio da NASA pede: como processos globais geram velocidades e direções diferentes em cada ponto da Terra."

### [2:05 – 2:40] 4. Busca Ao Vivo, Missão Amazônia & Educação (Slide 6)
> "Seguindo exatamente a recomendação do Manual de Vilhena, qualquer pessoa pode pesquisar **qualquer município do Brasil ou do mundo ao vivo**, visualizar o **Timelapse de Satélite da NASA** para ver a mudança na paisagem além dos números, e consultar o nosso **Arquivo de Métodos**, que ensina para estudantes e pesquisadores a diferença fundamental entre **tendência estatística e causalidade**, conectando os dados da NASA ao contexto da Amazônia, ao *MapBiomas* e aos **ODS 6 (Água), 13 (Clima) e 15 (Vida Terrestre)**."

### [2:40 – 3:00] 5. Fechamento (Slide 7)
> "Com um clique, o usuário baixa o **Cartão de Evidência com as Climate Stripes** da sua cidade para usar na escola, na cooperativa ou na gestão pública.  
> O **EarthTrend Detective** já está no ar, em português e inglês, com 100% dos cálculos auditados por testes automatizados.  
> Contra o achismo climático, nós entregamos perícia científica com dados da NASA. Muito obrigado!"
