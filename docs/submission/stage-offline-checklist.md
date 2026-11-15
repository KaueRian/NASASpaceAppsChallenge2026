# 🎒 Pacote Offline de Palco & Exportação PDF (`[13H]`)

Este guia garante que os slides em **PT-BR** do **GeoTrend** fiquem idênticos no projetor do HUBEE em formato **PDF 16:9** e funcionem **100% offline** (inclusive sem internet ou sem leitor de PDF instalado no notebook do palco).

---

## 1. Como Gerar `slides-pt.pdf` em 10 Segundos

O arquivo [`docs/submission/slides-pt.html`](slides-pt.html) já vem com regra de página exata **`@page { size: 13.333in 7.5in; margin: 0; }`** e CSS de contraste Dark Editorial travado para impressão.

### Opção A — Pelo Chrome / Edge (Mais rápida)
1. Abra [`docs/submission/slides-pt.html`](slides-pt.html) no Chrome ou Edge.
2. Clique no botão terracota **"Exportar PDF 16:9"** (ou pressione **`Ctrl + P`** / `Cmd + P`).
3. Configure exatamente:
   - **Destino:** `Salvar como PDF`
   - **Páginas:** `Todas` (`7` páginas)
   - **Margens:** `Nenhuma` (*None*)
   - **Mais definições → Gráficos de segundo plano:** **MARCADO** *(obrigatório para manter o fundo `#121212`!)*
4. Salve como **`slides-pt.pdf`**.

### Opção B — Via Linha de Comando (Windows / macOS / Linux)
```bash
google-chrome --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=slides-pt.pdf docs/submission/slides-pt.html
```

---

## 2. Atalhos Durante Ensaios e no Palco (`slides-pt.html`)
- **`←` / `→` ou `Espaço`:** Avança ou volta os 7 slides.
- **`F`:** Entra/sai de Tela Cheia para apresentar direto no navegador se precisar de contingência.
- **`N`:** Abre/fecha as **Notas do Orador (180s cronometradas)** no canto superior direito durante o ensaio `[14H]` *(oculto automaticamente no PDF exportado)*.
- **`G`:** Alterna entre modo Slide Único e Visão Geral em rolagem.

---

## 3. Pasta Offline Obrigatória no Notebook de Palco + Pendrive Backup

Antes de subir ao palco no HUBEE (`15:30–17:00`), copie esta pasta completa para a Área de Trabalho do notebook de palco e um pendrive de backup:

```text
geotrend-palco-offline/
├── slides-pt.pdf                     # PDF exportado em 16:9 (7 páginas)
├── slides-pt.html                    # Backup interativo offline (funciona em qualquer navegador sem internet)
├── geotrend-demo-30s.mp4             # Vídeo de 30s com legendas em inglês ([12H])
├── brand/
│   ├── slide-cover-16x9.png          # Capa reserva 1920x1080
│   └── logo-wordmark-dark.png        # Logo oficial GeoTrend
└── screenshots-en/                   # 4–7 capturas EN da UI live em https://geotrend.earth ([11H])
```

### Checklist Rápido Pré-Palco
- [ ] Conferir que **`slides-pt.pdf`** abre em tela cheia (`Ctrl + L` / `F11`) com fundo `#121212` íntegro e QR Code de `https://geotrend.earth` visível no Slide 07.
- [ ] Testar o QR Code do Slide 07 apontando a câmera de um celular para `https://geotrend.earth`.
- [ ] Verificar que `slides-pt.html` foi regerado caso algum dado mude (`npm run build:slides`).
