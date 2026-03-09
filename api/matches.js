const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

// Ligas para consultar
const LEAGUES = {
  39: "Premier League",
  140: "La Liga"
};

const LEAGUE_FLAGS = {
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
  "Serie A": "🇮🇹",
  "Bundesliga": "🇩🇪",
  "Champions League": "🇪🇺",
  "Liga MX": "🇲🇽",
  "Ligue 1": "🇫🇷",
  "Europa League": "🇪🇺"
};

const LEAGUE_AVG_GOALS = 2.65;

// Modo demo de partidos
const DEMO_MATCHES = [
  { league: "La Liga", leagueId: 140, hForm: "WWWDW", aForm: "WDWWL", h: "Real Madrid", a: "Atlético Madrid", time: "20:00" },
  { league: "La Liga", leagueId: 140, hForm: "WWDWW", aForm: "DLWDW", h: "Barcelona", a: "Athletic Bilbao", time: "17:30" },
  { league: "Premier League", leagueId: 39, hForm: "WWWWL", aForm: "DWWLD", h: "Arsenal", a: "Chelsea", time: "16:00" },
  { league: "Premier League", leagueId: 39, hForm: "WWWDW", aForm: "LLDLD", h: "Liverpool", a: "Everton", time: "18:30" },
  { league: "Serie A", leagueId: 135, hForm: "WWDWW", aForm: "WLDWW", h: "Inter Milan", a: "AC Milan", time: "20:45" },
  { league: "Bundesliga", leagueId: 78, hForm: "WWWWW", aForm: "WDWLW", h: "Bayern Munich", a: "Borussia Dortmund", time: "18:30" },
  { league: "Champions League", leagueId: 2, hForm: "WDWWL", aForm: "WWDWW", h: "PSG", a: "Manchester City", time: "21:00" },
  { league: "Liga MX", leagueId: 262, hForm: "WDWWL", aForm: "DWLWW", h: "América", a: "Guadalajara", time: "21:00" },
  { league: "Ligue 1", leagueId: 61, hForm: "WWDWL", aForm: "LDWDW", h: "Monaco", a: "Lyon", time: "19:00" },
  { league: "Europa League", leagueId: 3, hForm: "WDWLW", aForm: "WWDLW", h: "Roma", a: "Ajax", time: "21:00" }
];

async function getTeamStats(teamId, leagueId, season, rapidApiKey) {
  try {
    const response = await axios.get(`https://v3.football.api-sports.io/teams/statistics`, {
      params: { team: teamId, league: leagueId, season: season },
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    const stats = response.data.response;
    if (!stats || !stats.fixtures) return null;

    return {
      played: stats.fixtures.played.total,
      wins: stats.fixtures.wins.total,
      draws: stats.fixtures.draws.total,
      losses: stats.fixtures.loses.total,
      goalsFor: stats.goals.for.total.total,
      goalsAgainst: stats.goals.against.total.total,
      cleanSheets: stats.clean_sheet.total,
      formString: stats.form ? stats.form.slice(-5) : "DDDDD"
    };
  } catch (err) {
    console.error(`Error fetching stats for team ${teamId}:`, err.message);
    return null;
  }
}

function generateDemoMatches() {
  const today = new Date().toISOString().split('T')[0];

  return DEMO_MATCHES.map((m, idx) => {
    const homeStats = {
      wins: 15, draws: 5, losses: 4, played: 24,
      goalsFor: 45, goalsAgainst: 20, cleanSheets: 10, formString: m.hForm
    };
    const awayStats = {
      wins: 10, draws: 8, losses: 6, played: 24,
      goalsFor: 30, goalsAgainst: 25, cleanSheets: 7, formString: m.aForm
    };

    const bookOdds = {
      home: 2.10,
      draw: 3.40,
      away: 3.20
    };

    return {
      id: `demo_${idx}`,
      league: m.league,
      leagueFlag: LEAGUE_FLAGS[m.league] || "⚽",
      homeTeam: m.h,
      awayTeam: m.a,
      homeLogo: `https://ui-avatars.com/api/?name=${m.h.charAt(0)}&background=random`,
      awayLogo: `https://ui-avatars.com/api/?name=${m.a.charAt(0)}&background=random`,
      kickoff: `${today}T${m.time}:00Z`,
      venue: "Estadio Demo",
      status: "NS",
      homeStats,
      awayStats,
      bookOdds
    };
  });
}

async function fetchMatchesToday(rapidApiKey) {
  const today = new Date().toISOString().split('T')[0];
  let matches = [];
  const season = 2024; // De acuerdo al prompt

  for (const leagueId of Object.keys(LEAGUES)) {
    try {
      const response = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
        params: { date: today, league: leagueId, season: season },
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      const leagueFixtures = response.data.response || [];

      for (const f of leagueFixtures.slice(0, 5)) { // Limitamos para evitar hits excesivos de stats
        const homeStatsRaw = await getTeamStats(f.teams.home.id, leagueId, season, rapidApiKey);
        const awayStatsRaw = await getTeamStats(f.teams.away.id, leagueId, season, rapidApiKey);

        if (!homeStatsRaw || !awayStatsRaw) continue;

        // Mocking book odds as api-football odds endpoint requires a different call and usually premium plan
        const bookOdds = { home: 2.10, draw: 3.40, away: 3.20 };

        matches.push({
          id: f.fixture.id.toString(),
          league: LEAGUES[leagueId],
          leagueFlag: LEAGUE_FLAGS[LEAGUES[leagueId]] || "⚽",
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          homeLogo: f.teams.home.logo,
          awayLogo: f.teams.away.logo,
          kickoff: f.fixture.date,
          venue: f.fixture.venue.name || "Unknown",
          status: f.fixture.status.short,
          homeStats: homeStatsRaw,
          awayStats: awayStatsRaw,
          bookOdds
        });
      }
    } catch (err) {
      console.error(`Error fetching fixtures for league ${leagueId}:`, err.message);
    }
  }

  return matches;
}

module.exports = async (req, res) => {
  console.log('API /api/matches requested');
  try {
    const rapidApiKey = process.env.API_SPORTS;
    const isDemo = !rapidApiKey || rapidApiKey === 'tu_key_aqui' || rapidApiKey === '';

    let rawMatches = [];

    if (isDemo) {
      console.log("Modo DEMO activado");
      rawMatches = generateDemoMatches();
    } else {
      console.log("Fetching matches from API-Football...");
      rawMatches = await fetchMatchesToday(rapidApiKey);
      if (rawMatches.length === 0) {
        console.log("No matches found or quota exceeded, fallback to DEMO");
        rawMatches = generateDemoMatches();
      }
    }

    const result = {
      date: new Date().toISOString().split('T')[0],
      generated: new Date().toISOString(),
      matchCount: rawMatches.length,
      isDemo,
      matches: rawMatches
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- MOTOR POISSON Y VALUE ---

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poisson(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function calculateFormScore(formString) {
  let score = 0;
  for (const char of formString) {
    if (char === 'W') score += 3;
    else if (char === 'D') score += 1;
  }
  return score;
}

function processMatches(matches) {
  return matches.map(match => {
    const hStats = match.homeStats;
    const aStats = match.awayStats;

    // Paso 1 - Fuerza ataque/defensa
    const hGames = hStats.played || 1;
    const aGames = aStats.played || 1;

    const hGoalsForAvg = hStats.goalsFor / hGames;
    const hGoalsAgainstAvg = hStats.goalsAgainst / hGames;
    const aGoalsForAvg = aStats.goalsFor / aGames;
    const aGoalsAgainstAvg = aStats.goalsAgainst / aGames;

    const homeAttack = (hGoalsForAvg / LEAGUE_AVG_GOALS) * 2;
    const homeDefense = (hGoalsAgainstAvg / LEAGUE_AVG_GOALS) * 2;
    const awayAttack = (aGoalsForAvg / LEAGUE_AVG_GOALS) * 2;
    const awayDefense = (aGoalsAgainstAvg / LEAGUE_AVG_GOALS) * 2;

    // Paso 2 - xG esperados
    const homeXG = homeAttack * awayDefense * (LEAGUE_AVG_GOALS / 2) * 1.15;
    const awayXG = awayAttack * homeDefense * (LEAGUE_AVG_GOALS / 2) * 0.87;

    // Paso 3 - Ajuste forma
    const hFormScore = calculateFormScore(hStats.formString);
    const aFormScore = calculateFormScore(aStats.formString);
    const formAdj = (hFormScore - aFormScore) * 0.04;

    const adjHomeXG = Math.max(0.3, homeXG + formAdj);
    const adjAwayXG = Math.max(0.3, awayXG - formAdj);

    // Paso 4 - Poisson (matriz 9x9)
    let pHomeWin = 0;
    let pDraw = 0;
    let pAwayWin = 0;
    let pOver25 = 0;

    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 8; j++) {
        const prob = poisson(i, adjHomeXG) * poisson(j, adjAwayXG);

        if (i > j) pHomeWin += prob;
        else if (i === j) pDraw += prob;
        else pAwayWin += prob;

        if (i + j > 2) pOver25 += prob;
      }
    }

    // Normalizar
    const totalP = pHomeWin + pDraw + pAwayWin;
    pHomeWin = pHomeWin / totalP;
    pDraw = pDraw / totalP;
    pAwayWin = pAwayWin / totalP;

    // Paso 5 - BTTS
    const btts = (1 - poisson(0, adjHomeXG)) * (1 - poisson(0, adjAwayXG));

    const probs = {
      home: parseFloat((pHomeWin * 100).toFixed(1)),
      draw: parseFloat((pDraw * 100).toFixed(1)),
      away: parseFloat((pAwayWin * 100).toFixed(1)),
      homeXG: parseFloat(adjHomeXG.toFixed(2)),
      awayXG: parseFloat(adjAwayXG.toFixed(2)),
      over25: parseFloat((pOver25 * 100).toFixed(1)),
      btts: parseFloat((btts * 100).toFixed(1))
    };

    // --- DETECCIÓN DE VALUE ---
    const book = match.bookOdds;
    const value = {};

    ['home', 'draw', 'away'].forEach(outcome => {
      const impliedProb = (1 / book[outcome]) * 100;
      const realProb = probs[outcome];
      const edge = realProb - impliedProb;
      const realOdds = 100 / realProb;

      value[outcome] = {
        odds: book[outcome],
        realOdds: parseFloat(realOdds.toFixed(2)),
        edge: parseFloat(edge.toFixed(1)),
        hasValue: edge > 2.0
      };
    });

    return {
      ...match,
      probs,
      value
    };
  });
}

// --- IA CLAUDE ---
async function generateAIAssessments(processedMatches, apiKey) {
  if (!apiKey || apiKey === 'tu_key_aqui') {
    return generateFallbackAssessments(processedMatches);
  }

  const anthropic = new Anthropic({ apiKey: apiKey });

  // Limitar llamadas (máximo 8 partidos por lote)
  const batchSize = 8;
  const batches = [];
  for (let i = 0; i < processedMatches.length; i += batchSize) {
    batches.push(processedMatches.slice(i, i + batchSize));
  }

  const allAnalyses = [];

  for (const batch of batches) {
    let prompt = `Eres un analista de apuestas deportivas experto. Analiza estos partidos de fútbol de hoy y para cada uno escribe un resumen analítico en español de máximo 80 palabras. Sé directo y específico. Menciona el factor más importante que define las probabilidades.\n\nPARTIDOS:\n`;

    batch.forEach((match, idx) => {
      let valueOutcomes = [];
      if (match.value.home.hasValue) valueOutcomes.push('Local');
      if (match.value.draw.hasValue) valueOutcomes.push('Empate');
      if (match.value.away.hasValue) valueOutcomes.push('Visitante');
      const valStr = valueOutcomes.length > 0 ? valueOutcomes.join(', ') : 'ninguno';

      prompt += `[${idx + 1}] ${match.homeTeam} vs ${match.awayTeam} (${match.league})\n`;
      prompt += `- Probs: Local ${match.probs.home}% | Empate ${match.probs.draw}% | Visitante ${match.probs.away}%\n`;
      prompt += `- xG esperados: ${match.probs.homeXG} - ${match.probs.awayXG}\n`;
      prompt += `- Forma local: ${match.homeStats.formString} | Forma visitante: ${match.awayStats.formString}\n`;
      prompt += `- Value detectado: ${valStr}\n\n`;
    });

    prompt += `Responde SOLO con JSON válido:\n{\n  "analyses": [\n    { "index": 1, "summary": "texto aquí" }\n  ]\n}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonStr = text.slice(jsonStart, jsonEnd);

      const parsed = JSON.parse(jsonStr);
      allAnalyses.push(...parsed.analyses);
    } catch (err) {
      console.error("Error calling Claude AI:", err.message);
      // Fallback para este lote
      const fallback = generateFallbackAssessments(batch);
      fallback.forEach((match, idx) => {
         allAnalyses.push({ index: idx + 1, summary: match.aiSummary });
      });
    }
  }

  // Mezclar análisis de vuelta a los partidos
  return processedMatches.map((match, idx) => {
    const aiData = allAnalyses.find(a => a.index === idx % batchSize + 1); // Simple mapping
    return {
      ...match,
      aiSummary: aiData ? aiData.summary : generateFallbackAssessments([match])[0].aiSummary
    };
  });
}

function generateFallbackAssessments(matches) {
  return matches.map(match => {
    let favorito = match.probs.home > match.probs.away ? match.homeTeam : match.awayTeam;
    let probFav = Math.max(match.probs.home, match.probs.away);

    let valMsgs = [];
    if (match.value.home.hasValue) valMsgs.push(`valor en ${match.homeTeam}`);
    if (match.value.draw.hasValue) valMsgs.push(`valor en Empate`);
    if (match.value.away.hasValue) valMsgs.push(`valor en ${match.awayTeam}`);
    let valStr = valMsgs.length > 0 ? "Se detecta " + valMsgs.join(' y ') + "." : "No hay valor claro.";

    return {
      ...match,
      aiSummary: `${favorito} es favorito con ${probFav}% de probabilidad según el modelo Poisson ajustado por forma y xG. ${valStr}`
    };
  });
}

// --- EXPORTAR MOTOR Y ACTUALIZAR HANDLER ---
const originalHandler = module.exports;

module.exports = async (req, res) => {
  try {
    const rapidApiKey = process.env.API_SPORTS;
    const claudeApiKey = process.env.OPEN_AI_API_KEY; // Reutilizando la key configurada en prompt
    const isDemo = !rapidApiKey || rapidApiKey === 'tu_key_aqui' || rapidApiKey === '';

    let rawMatches = [];

    if (isDemo) {
      console.log("Modo DEMO activado");
      rawMatches = generateDemoMatches();
    } else {
      console.log("Fetching matches from API-Football...");
      rawMatches = await fetchMatchesToday(rapidApiKey);
      if (rawMatches.length === 0) {
        console.log("No matches found or quota exceeded, fallback to DEMO");
        rawMatches = generateDemoMatches();
      }
    }

    // Procesar con Motor Poisson
    let processedMatches = processMatches(rawMatches);
    console.log(`✅ ${processedMatches.length} partidos cargados y procesados por Poisson`);

    // Análisis de Claude
    if (!isDemo && claudeApiKey) {
       console.log("Llamando a Claude AI para análisis cualitativo...");
       processedMatches = await generateAIAssessments(processedMatches, claudeApiKey);
       console.log(`✅ Claude analizó ${processedMatches.length} partidos`);
    } else {
       console.log("Claude AI bypass (demo mode or missing key) - usando fallback");
       processedMatches = generateFallbackAssessments(processedMatches);
    }

    const result = {
      date: new Date().toISOString().split('T')[0],
      generated: new Date().toISOString(),
      matchCount: processedMatches.length,
      isDemo,
      matches: processedMatches
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: error.message });
  }
};
