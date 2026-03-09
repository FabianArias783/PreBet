const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const jsScript = `
  <script>
    let allMatches = [];
    let currentFilter = "all";

    function formatDate(dateStr) {
      const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
      return new Date(dateStr).toLocaleDateString("es-ES", options);
    }

    function formatTime(isoStr) {
      return new Date(isoStr).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }

    function getFormHTML(formString) {
      if (!formString) return "";
      return Array.from(formString).map(char => {
        let cls = char === "W" ? "f-w" : char === "D" ? "f-d" : "f-l";
        return \`<div class="f-dot \${cls}" title="\${char}"></div>\`;
      }).join("");
    }

    function renderMatches() {
      const container = document.getElementById("matches-container");
      container.innerHTML = "";

      let filtered = allMatches;
      if (currentFilter === "value") {
        filtered = allMatches.filter(m => m.value.home.hasValue || m.value.draw.hasValue || m.value.away.hasValue);
      } else if (currentFilter !== "all") {
        filtered = allMatches.filter(m => m.league === currentFilter);
      }

      if (filtered.length === 0) {
        container.innerHTML = \`<div style="text-align:center; padding: 2rem; color: var(--muted);">No hay partidos que coincidan con los filtros.</div>\`;
        return;
      }

      filtered.forEach((match, index) => {
        const hasValueBadge = (match.value.home.hasValue || match.value.draw.hasValue || match.value.away.hasValue)
          ? \`<span class="value-badge">VALUE</span>\` : "";

        const card = document.createElement("div");
        card.className = "match-card";

        // El evento para abrir y cerrar (toggle class 'open' en match-card)
        card.innerHTML = \`
          <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="league-info">
              <span>\${match.leagueFlag}</span> <span>\${match.league}</span>
            </div>
            <div class="teams-info">
              <div class="team" style="text-align: right; justify-content: flex-end;">
                \${match.homeTeam}
                <div class="form-dots" style="margin-left: 0.5rem;">\${getFormHTML(match.homeStats.formString)}</div>
              </div>
              <div class="vs">vs</div>
              <div class="team">
                <div class="form-dots" style="margin-right: 0.5rem;">\${getFormHTML(match.awayStats.formString)}</div>
                \${match.awayTeam}
              </div>
            </div>
            <div class="quick-probs">
              <div class="qp-item"><span class="qp-lbl">1</span><span style="color:var(--acc)">\${Math.round(match.probs.home)}%</span></div>
              <div class="qp-item"><span class="qp-lbl">X</span><span style="color:var(--warn)">\${Math.round(match.probs.draw)}%</span></div>
              <div class="qp-item"><span class="qp-lbl">2</span><span style="color:var(--acc2)">\${Math.round(match.probs.away)}%</span></div>
              \${hasValueBadge}
            </div>
            <div class="time">\${formatTime(match.kickoff)}</div>
          </div>

          <div class="card-expanded">
            <div class="col-probs">
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--muted); margin-bottom: 1rem; letter-spacing: 1px;">Probabilidad Modelo Poisson</div>

              <div class="prob-bar-container">
                <div class="pb-lbl"><span>\${match.homeTeam}</span> <span>\${match.probs.home}%</span></div>
                <div class="pb-track"><div class="pb-fill fill-home" style="width: \${match.probs.home}%"></div></div>
              </div>
              <div class="prob-bar-container">
                <div class="pb-lbl"><span>Empate</span> <span>\${match.probs.draw}%</span></div>
                <div class="pb-track"><div class="pb-fill fill-draw" style="width: \${match.probs.draw}%"></div></div>
              </div>
              <div class="prob-bar-container">
                <div class="pb-lbl"><span>\${match.awayTeam}</span> <span>\${match.probs.away}%</span></div>
                <div class="pb-track"><div class="pb-fill fill-away" style="width: \${match.probs.away}%"></div></div>
              </div>

              <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; font-size: 0.85rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <span style="color: var(--muted)">xG Esperados (Ajustados):</span>
                <span><strong style="color: var(--acc)">\${match.probs.homeXG}</strong> - <strong style="color: var(--acc2)">\${match.probs.awayXG}</strong></span>
              </div>
            </div>

            <div class="col-value">
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--muted); margin-bottom: 1rem; letter-spacing: 1px;">Análisis de Valor (Edge)</div>

              <table class="value-table">
                <tr><th>Mercado</th><th>Cuota Casa</th><th>Cuota Justa</th><th>Ventaja</th></tr>
                <tr>
                  <td>Local</td>
                  <td>\${match.bookOdds.home.toFixed(2)}</td>
                  <td>\${match.value.home.realOdds.toFixed(2)}</td>
                  <td class="\${match.value.home.hasValue ? 'v-positive' : 'v-negative'}">\${match.value.home.edge > 0 ? "+" : ""}\${match.value.home.edge}%</td>
                </tr>
                <tr>
                  <td>Empate</td>
                  <td>\${match.bookOdds.draw.toFixed(2)}</td>
                  <td>\${match.value.draw.realOdds.toFixed(2)}</td>
                  <td class="\${match.value.draw.hasValue ? 'v-positive' : 'v-negative'}">\${match.value.draw.edge > 0 ? "+" : ""}\${match.value.draw.edge}%</td>
                </tr>
                <tr>
                  <td>Visita</td>
                  <td>\${match.bookOdds.away.toFixed(2)}</td>
                  <td>\${match.value.away.realOdds.toFixed(2)}</td>
                  <td class="\${match.value.away.hasValue ? 'v-positive' : 'v-negative'}">\${match.value.away.edge > 0 ? "+" : ""}\${match.value.away.edge}%</td>
                </tr>
              </table>
            </div>

            <div class="col-ai">
              <div class="ai-analysis">
                <div class="ai-title"><div class="dot" style="width:6px; height:6px;"></div> Análisis Cualitativo AI</div>
                <div class="ai-text">\${match.aiSummary}</div>
              </div>
            </div>

            <div class="markets-pills">
              <div class="pill">Over 2.5 Goles: <span class="pill-val">\${match.probs.over25}%</span></div>
              <div class="pill">Ambos Anotan (BTTS): <span class="pill-val">\${match.probs.btts}%</span></div>
            </div>
          </div>
        \`;

        container.appendChild(card);
      });
    }

    function setupFilters() {
      const filterContainer = document.getElementById("filters-container");
      // Obtener ligas únicas
      const leagues = [...new Set(allMatches.map(m => m.league))];

      leagues.forEach(league => {
        const btn = document.createElement("button");
        btn.className = "filter-btn";
        btn.dataset.filter = league;
        btn.textContent = league;
        btn.addEventListener("click", handleFilterClick);
        filterContainer.appendChild(btn);
      });

      // Añadir listeners a los botones existentes
      document.querySelectorAll(".filter-btn").forEach(btn => {
        if (!btn.dataset.listenerAdded) {
          btn.addEventListener("click", handleFilterClick);
          btn.dataset.listenerAdded = "true";
        }
      });
    }

    function handleFilterClick(e) {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.dataset.filter;
      renderMatches();
    }

    async function fetchMatches() {
      try {
        const response = await fetch('/api/matches');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();

        allMatches = data.matches;

        if (data.isDemo) {
          document.getElementById('demo-banner').style.display = 'block';
        }

        const valueMatches = allMatches.filter(m => m.value.home.hasValue || m.value.draw.hasValue || m.value.away.hasValue);

        document.getElementById('count-total').innerText = allMatches.length;
        document.getElementById('count-value').innerText = valueMatches.length;
        document.getElementById('today-date').innerText = \`Actualizado: \${formatDate(data.generated)}\`;

        setupFilters();
        renderMatches();
      } catch (error) {
        console.error('Error fetching matches:', error);
        document.getElementById("matches-container").innerHTML = \`<div style="text-align:center; padding: 2rem; color: var(--red);">Error al cargar los datos. Por favor, intenta de nuevo más tarde.</div>\`;
      }
    }

    // Inicializar al cargar
    document.addEventListener("DOMContentLoaded", fetchMatches);
  </script>
`;

html = html.replace(/<script>[\s\S]*?<\/script>/, jsScript);
fs.writeFileSync('public/index.html', html);
console.log("Updated public/index.html");
