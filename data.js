/* Strategy Lab — Data Manager */
const DataManager = (() => {
  const KEYS = { rounds:'sl_rounds', reviews:'sl_reviews', supervisions:'sl_supervisions' };
  const uid = (p='') => p + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const load = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));

  const FAIL_REASONS = [
    'PF muy bajo','DD muy alto','No pasa OOS','No pasa Monte Carlo','No pasa SPP',
    'No mejora el portfolio','Size mínimo insuficiente','ATR demasiado alto',
    'Win Rate bajo','Avg Trade insuficiente','Ret/DD insuficiente','Otro'
  ];

  // ── Rounds CRUD ──
  const Rounds = {
    getAll() { return load(KEYS.rounds); },
    get(id) { return this.getAll().find(r => r.id === id); },
    save(round) {
      const all = this.getAll(); const idx = all.findIndex(r => r.id === round.id);
      if (idx >= 0) all[idx] = round; else all.push(round);
      save(KEYS.rounds, all); return round;
    },
    create(data) {
      const r = {
        id: uid('r'), name: data.name || '', createdAt: new Date().toISOString(),
        status: 'en-proceso', instrument: data.instrument || '', failReason: '', failDetail: '',
        notes: data.notes || '', completedAt: null,
        pattern: {
          type: data.patternType || 'propio', name: '', description: '', algowizardNotes: '',
          baseMetrics: { retDD:null, pf:null, winRate:null, br:null, avgTrade:null, rExpectancy:null, sqn:null, winYears:null, loseYears:null },
          withCosts: { retDD:null, pf:null, winRate:null, br:null, avgTrade:null, rExpectancy:null, sqn:null, winYears:null, loseYears:null },
          optimizerResults: '', filters: '',
          checks: { created:false, baseMetricsOk:false, costsApplied:false, optimizerRun:false, filtersApplied:false, templateReady:false }
        },
        creation: {
          templates: [], checks: {
            templateCreated:false, builderReviewed:false, creationStarted:false, creationVerified:false,
            oos:false, fullData:false, mmRealCapital:false, mcTrades:false, spp:false,
            finalistsSelected:false, winnerSelected:false, demoSelected:false, mt4Evaluation:false, portfolioImpact:false
          },
          totalGenerated:0, afterOOS:0, afterFullData:0, afterMM:0, afterMC:0, afterSPP:0,
          finalists: [],
          portfolioComparison: { without:{ retDD:null, pf:null, maxDD:null }, with:{ retDD:null, pf:null, maxDD:null } }
        }
      };
      return this.save(r);
    },
    delete(id) { save(KEYS.rounds, this.getAll().filter(r => r.id !== id)); },

    // Phase progress
    getPhase1Progress(r) {
      if (r.pattern.type === 'la-city') return { done:6, total:6 };
      const c = r.pattern.checks; const vals = Object.values(c);
      return { done: vals.filter(Boolean).length, total: vals.length };
    },
    getPhase2Progress(r) {
      const c = r.creation.checks; const vals = Object.values(c);
      return { done: vals.filter(Boolean).length, total: vals.length };
    },
    getTotalProgress(r) {
      const p1 = this.getPhase1Progress(r); const p2 = this.getPhase2Progress(r);
      return { done: p1.done + p2.done, total: p1.total + p2.total };
    }
  };

  // ── Reviews CRUD ──
  const Reviews = {
    getAll() { return load(KEYS.reviews); },
    get(id) { return this.getAll().find(r => r.id === id); },
    save(rev) {
      const all = this.getAll(); const idx = all.findIndex(r => r.id === rev.id);
      if (idx >= 0) all[idx] = rev; else all.push(rev);
      save(KEYS.reviews, all); return rev;
    },
    create(data) {
      const rev = {
        id: uid('rev'), roundId: data.roundId || '', systemName: data.systemName || '',
        instrument: data.instrument || '', timeframe: data.timeframe || 'D1',
        createdAt: new Date().toISOString(), status: 'pendiente',
        checks: { excelDownloaded:false, riskPipsReviewed:false, sizeReviewed:false, minSizeCheck:false, atrFilterSet:false },
        minSizeMultiplier: data.minSizeMultiplier || null,
        atrCritical: data.atrCritical || null, notes: data.notes || ''
      };
      return this.save(rev);
    },
    delete(id) { save(KEYS.reviews, this.getAll().filter(r => r.id !== id)); },
    getProgress(rev) {
      const vals = Object.values(rev.checks);
      return { done: vals.filter(Boolean).length, total: vals.length };
    }
  };

  // ── Supervisions CRUD ──
  const Supervisions = {
    getAll() { return load(KEYS.supervisions); },
    get(id) { return this.getAll().find(s => s.id === id); },
    save(sup) {
      const all = this.getAll(); const idx = all.findIndex(s => s.id === sup.id);
      if (idx >= 0) all[idx] = sup; else all.push(sup);
      save(KEYS.supervisions, all); return sup;
    },
    create(data) {
      const sup = {
        id: uid('sup'), roundId: data.roundId || '', systemName: data.systemName || '',
        instrument: data.instrument || '', timeframe: data.timeframe || 'D1',
        destination: data.destination || 'real', startDate: data.startDate || new Date().toISOString().slice(0,10),
        creationMethod: data.creationMethod || '', templateUsed: data.templateUsed || '',
        status: 'activo', monthlyLogs: [], periodicReviews: []
      };
      return this.save(sup);
    },
    delete(id) { save(KEYS.supervisions, this.getAll().filter(s => s.id !== id)); },

    addMonthlyLog(supId, log) {
      const sup = this.get(supId); if (!sup) return;
      log.id = uid('ml');
      log.mt4Downloaded = false; log.quantAnalyzerDone = false;
      log.excelUpdated = false; log.sqxPortfolioUpdated = false;
      sup.monthlyLogs.push(log); return this.save(sup);
    },
    addPeriodicReview(supId, rev) {
      const sup = this.get(supId); if (!sup) return;
      rev.id = uid('pr'); sup.periodicReviews.push(rev); return this.save(sup);
    }
  };

  // ── Statistics ──
  const Stats = {
    getSummary() {
      const rounds = Rounds.getAll();
      const total = rounds.length;
      const active = rounds.filter(r => r.status === 'en-proceso').length;
      const completed = rounds.filter(r => r.status === 'completada').length;
      const failed = rounds.filter(r => r.status === 'fallida').length;
      const paused = rounds.filter(r => r.status === 'pausada').length;
      const rate = (completed + failed) > 0 ? Math.round(completed / (completed + failed) * 100) : null;
      return { total, active, completed, failed, paused, rate };
    },
    getFunnel() {
      const rounds = Rounds.getAll().filter(r => r.status === 'completada' || r.creation.totalGenerated > 0);
      if (!rounds.length) return null;
      const avg = (arr, key) => { const vals = arr.map(r => r.creation[key]).filter(v => v > 0); return vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : 0; };
      return {
        generated: avg(rounds, 'totalGenerated'), afterOOS: avg(rounds, 'afterOOS'),
        afterFullData: avg(rounds, 'afterFullData'), afterMM: avg(rounds, 'afterMM'),
        afterMC: avg(rounds, 'afterMC'), afterSPP: avg(rounds, 'afterSPP'),
        toReal: rounds.reduce((s,r) => s + r.creation.finalists.filter(f => f.destination === 'real').length, 0)
      };
    },
    getFailReasons() {
      const rounds = Rounds.getAll().filter(r => r.status === 'fallida' && r.failReason);
      const counts = {};
      rounds.forEach(r => { counts[r.failReason] = (counts[r.failReason] || 0) + 1; });
      const total = rounds.length || 1;
      return Object.entries(counts).map(([reason, count]) => ({ reason, count, pct: Math.round(count/total*100) })).sort((a,b) => b.count - a.count);
    },
    getDurability() {
      const sups = Supervisions.getAll();
      const methods = {};
      sups.forEach(s => {
        const key = s.templateUsed || s.creationMethod || 'Sin método';
        if (!methods[key]) methods[key] = { total:0, active:0, retired:0, months:[] };
        methods[key].total++;
        if (s.status === 'activo') methods[key].active++;
        else methods[key].retired++;
        const start = new Date(s.startDate); const now = new Date();
        const monthsAlive = Math.max(1, Math.round((now - start) / (30.44 * 24 * 60 * 60 * 1000)));
        methods[key].months.push(monthsAlive);
      });
      return Object.entries(methods).map(([method, d]) => ({
        method, total: d.total, active: d.active, retired: d.retired,
        avgMonths: d.months.length ? (d.months.reduce((a,b)=>a+b,0)/d.months.length).toFixed(1) : '—',
        survivalRate: d.total ? Math.round(d.active/d.total*100) : 0
      }));
    }
  };

  // ── Export / Import ──
  function exportAll() {
    const data = { rounds: Rounds.getAll(), reviews: Reviews.getAll(), supervisions: Supervisions.getAll(), exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `strategy-lab-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  }
  function importAll(json) {
    try {
      const data = JSON.parse(json);
      if (data.rounds) save(KEYS.rounds, data.rounds);
      if (data.reviews) save(KEYS.reviews, data.reviews);
      if (data.supervisions) save(KEYS.supervisions, data.supervisions);
      return true;
    } catch { return false; }
  }

  // ── Sample Data ──
  function loadSample() {
    const s1id = uid('r');
    const sampleRounds = [{
      id: s1id, name:'RSI Reversal Nasdaq', createdAt:'2026-05-01T10:00:00Z', status:'completada',
      instrument:'USATECHIDXUSD', failReason:'', failDetail:'', notes:'Primera ronda con el patrón RSI reversal.', completedAt:'2026-05-15T10:00:00Z',
      pattern: {
        type:'propio', name:'RSI(2) Reversal', description:'Compra cuando RSI(2) cruza por debajo de 10, vende cuando cruza por encima de 90.',
        algowizardNotes:'Patrón creado en AlgoWizard, probado en NASDAQ D1.',
        baseMetrics:{ retDD:4.2, pf:2.1, winRate:62, br:1.8, avgTrade:85, rExpectancy:0.45, sqn:3.2, winYears:8, loseYears:2 },
        withCosts:{ retDD:3.5, pf:1.85, winRate:60, br:1.6, avgTrade:68, rExpectancy:0.38, sqn:2.8, winYears:7, loseYears:3 },
        optimizerResults:'RSI período óptimo: 2 (probado 2-5). Nivel óptimo: 10 (probado 5,10,15,20,25). RSI(2)<10 es el mejor.',
        filters:'No opera lunes ni viernes. Salida máxima 5 barras. No opera diciembre.',
        checks:{ created:true, baseMetricsOk:true, costsApplied:true, optimizerRun:true, filtersApplied:true, templateReady:true }
      },
      creation: {
        templates:[
          { id:uid('t'), name:'Template Tendencia D1', timeframe:'D1', criteria:'Trend following con filtros de volatilidad', systemsGenerated:2500, systemsAfterFilter:22, notes:'Buena generación' },
          { id:uid('t'), name:'Template Breakout H4', timeframe:'H4', criteria:'Breakout con confirmación de volumen', systemsGenerated:1800, systemsAfterFilter:12, notes:'Menos sistemas pero más calidad' }
        ],
        checks:{ templateCreated:true, builderReviewed:true, creationStarted:true, creationVerified:true, oos:true, fullData:true, mmRealCapital:true, mcTrades:true, spp:true, finalistsSelected:true, winnerSelected:true, demoSelected:true, mt4Evaluation:true, portfolioImpact:true },
        totalGenerated:4300, afterOOS:120, afterFullData:65, afterMM:18, afterMC:8, afterSPP:3,
        finalists:[
          { id:uid('f'), name:'RSI_Rev_v2.8', metrics:{ pf:1.92, retDD:3.8, winRate:61, maxDD:10.2, ddMC:14.5, avgTrade:72, netProfit:18500 }, destination:'real', notes:'Ganador. Mejor Ret/DD.' },
          { id:uid('f'), name:'RSI_Rev_v1.4', metrics:{ pf:1.78, retDD:3.1, winRate:58, maxDD:12.1, ddMC:16.8, avgTrade:58, netProfit:14200 }, destination:'demo', notes:'Segundo mejor.' },
          { id:uid('f'), name:'RSI_Rev_v3.1', metrics:{ pf:1.65, retDD:2.5, winRate:55, maxDD:14.5, ddMC:19.2, avgTrade:45, netProfit:11800 }, destination:'descartado', notes:'DD Monte Carlo muy alto.' }
        ],
        portfolioComparison:{ without:{ retDD:3.0, pf:1.75, maxDD:15.2 }, with:{ retDD:3.8, pf:1.92, maxDD:12.1 } }
      }
    },{
      id: uid('r'), name:'EMA Momentum Gold', createdAt:'2026-05-10T10:00:00Z', status:'fallida',
      instrument:'XAUUSD', failReason:'No pasa Monte Carlo', failDetail:'DD Monte Carlo sube a 25% con el capital real.', notes:'',  completedAt:null,
      pattern:{ type:'propio', name:'EMA(50) Momentum', description:'', algowizardNotes:'',
        baseMetrics:{ retDD:2.8, pf:1.65, winRate:55, br:1.4, avgTrade:52, rExpectancy:0.3, sqn:2.1, winYears:6, loseYears:4 },
        withCosts:{ retDD:2.1, pf:1.42, winRate:52, br:1.2, avgTrade:38, rExpectancy:0.2, sqn:1.8, winYears:5, loseYears:5 },
        optimizerResults:'', filters:'',
        checks:{ created:true, baseMetricsOk:true, costsApplied:true, optimizerRun:false, filtersApplied:false, templateReady:false }
      },
      creation:{ templates:[{ id:uid('t'), name:'Template Momentum H1', timeframe:'H1', criteria:'Momentum con EMA', systemsGenerated:2000, systemsAfterFilter:8, notes:'' }],
        checks:{ templateCreated:true, builderReviewed:true, creationStarted:true, creationVerified:true, oos:true, fullData:true, mmRealCapital:true, mcTrades:false, spp:false, finalistsSelected:false, winnerSelected:false, demoSelected:false, mt4Evaluation:false, portfolioImpact:false },
        totalGenerated:2000, afterOOS:45, afterFullData:20, afterMM:8, afterMC:0, afterSPP:0, finalists:[],
        portfolioComparison:{ without:{ retDD:null, pf:null, maxDD:null }, with:{ retDD:null, pf:null, maxDD:null } }
      }
    },{
      id: uid('r'), name:'Bollinger La City', createdAt:'2026-05-14T10:00:00Z', status:'en-proceso',
      instrument:'EURUSD', failReason:'', failDetail:'', notes:'Patrón recibido de La City, ya verificado.',  completedAt:null,
      pattern:{ type:'la-city', name:'Bollinger Squeeze', description:'Patrón pre-verificado de La City.', algowizardNotes:'',
        baseMetrics:{ retDD:null, pf:null, winRate:null, br:null, avgTrade:null, rExpectancy:null, sqn:null, winYears:null, loseYears:null },
        withCosts:{ retDD:null, pf:null, winRate:null, br:null, avgTrade:null, rExpectancy:null, sqn:null, winYears:null, loseYears:null },
        optimizerResults:'', filters:'',
        checks:{ created:true, baseMetricsOk:true, costsApplied:true, optimizerRun:true, filtersApplied:true, templateReady:true }
      },
      creation:{ templates:[], checks:{ templateCreated:false, builderReviewed:false, creationStarted:false, creationVerified:false, oos:false, fullData:false, mmRealCapital:false, mcTrades:false, spp:false, finalistsSelected:false, winnerSelected:false, demoSelected:false, mt4Evaluation:false, portfolioImpact:false },
        totalGenerated:0, afterOOS:0, afterFullData:0, afterMM:0, afterMC:0, afterSPP:0, finalists:[],
        portfolioComparison:{ without:{ retDD:null, pf:null, maxDD:null }, with:{ retDD:null, pf:null, maxDD:null } }
      }
    }];

    const sampleReviews = [{
      id:uid('rev'), roundId:s1id, systemName:'RSI_Rev_v2.8', instrument:'USATECHIDXUSD', timeframe:'D1',
      createdAt:'2026-05-16T10:00:00Z', status:'aprobado',
      checks:{ excelDownloaded:true, riskPipsReviewed:true, sizeReviewed:true, minSizeCheck:true, atrFilterSet:true },
      minSizeMultiplier:3.2, atrCritical:28.5, notes:'Size mínimo x3.2 del mínimo. ATR crítico 28.5 pips.'
    }];

    const sampleSupervisions = [{
      id:uid('sup'), roundId:s1id, systemName:'RSI_Rev_v2.8', instrument:'USATECHIDXUSD', timeframe:'D1',
      destination:'real', startDate:'2026-05-17', creationMethod:'RSI Reversal', templateUsed:'Template Tendencia D1',
      status:'activo',
      monthlyLogs:[{
        id:uid('ml'), month:'2026-05', mt4Downloaded:true, quantAnalyzerDone:true, excelUpdated:true, sqxPortfolioUpdated:true,
        realVsSqxMatch:true, deviation:'', notes:'Primer mes, todo en orden.'
      }],
      periodicReviews:[]
    }];

    save(KEYS.rounds, sampleRounds);
    save(KEYS.reviews, sampleReviews);
    save(KEYS.supervisions, sampleSupervisions);
  }

  return { Rounds, Reviews, Supervisions, Stats, FAIL_REASONS, exportAll, importAll, loadSample, uid };
})();
