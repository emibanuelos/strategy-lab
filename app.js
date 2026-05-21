/* Strategy Lab — App Core + Rounds + Active Round */
const App = {
  state: { view:'rounds', activeRoundId:null, editRoundId:null, editTplId:null, editFinId:null },
  $(id){ return document.getElementById(id); },
  init(){
    this.bindNav(); this.bindHeader(); this.bindRoundForm(); this.bindTemplateForm();
    this.bindFinalistForm(); this.bindFailForm(); this.bindPortfolioCompForm();
    if(typeof Modules!=='undefined'&&Modules.init) Modules.init();
    this.render();
  },
  // ── Navigation ──
  bindNav(){
    document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>{
      this.state.view=b.dataset.view; this.render();
    }));
  },
  navigate(view){ this.state.view=view; this.render(); },
  // ── Render ──
  render(){
    document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.toggle('active',b.dataset.view===this.state.view);});
    document.querySelectorAll('.view').forEach(v=>{v.classList.toggle('active',v.id==='view-'+this.state.view);});
    this.updateHeaderStats();
    if(this.state.view==='rounds') this.renderRounds();
    else if(this.state.view==='active') this.renderActive();
    else if(this.state.view==='review'&&Modules.renderReview) Modules.renderReview();
    else if(this.state.view==='supervision'&&Modules.renderSupervision) Modules.renderSupervision();
    else if(this.state.view==='stats'&&Modules.renderStats) Modules.renderStats();
  },
  updateHeaderStats(){
    const s=DataManager.Stats.getSummary();
    this.$('hs-active').textContent=s.active;
    this.$('hs-completed').textContent=s.completed;
    this.$('hs-rate').textContent=s.rate!==null?s.rate+'%':'—';
  },
  // ── Header buttons ──
  bindHeader(){
    this.$('btn-export').addEventListener('click',()=>DataManager.exportAll());
    this.$('btn-import').addEventListener('click',()=>this.$('import-file').click());
    this.$('import-file').addEventListener('change',e=>{
      const f=e.target.files[0]; if(!f)return;
      const reader=new FileReader();
      reader.onload=ev=>{if(DataManager.importAll(ev.target.result)){this.toast('Datos importados','success');this.render();}else this.toast('Error al importar','error');};
      reader.readAsText(f); e.target.value='';
    });
  },
  // ── Toast ──
  toast(msg,type='info'){
    const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;
    this.$('toast-container').appendChild(t);setTimeout(()=>t.remove(),3200);
  },
  // ── Modal ──
  openModal(id){this.$(id).classList.add('open');},
  closeModal(id){this.$(id).classList.remove('open');},
  // ── Confirm ──
  confirm(msg,cb){
    const ov=document.createElement('div');ov.className='confirm-overlay';
    ov.innerHTML=`<div class="confirm-box"><h3>Confirmar</h3><p>${msg}</p><div class="confirm-actions"><button class="btn btn-secondary" id="cf-no">Cancelar</button><button class="btn btn-danger" id="cf-yes">Confirmar</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#cf-no').onclick=()=>ov.remove();
    ov.querySelector('#cf-yes').onclick=()=>{ov.remove();cb();};
  },
  // ══════ ROUNDS VIEW ══════
  renderRounds(){
    const filter=this.$('filter-round-status').value;
    let rounds=DataManager.Rounds.getAll();
    if(filter) rounds=rounds.filter(r=>r.status===filter);
    rounds.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const grid=this.$('rounds-grid'); const empty=this.$('rounds-empty');
    // Bind buttons BEFORE early return
    this.$('filter-round-status').onchange=()=>this.renderRounds();
    const addBtns=[this.$('btn-new-round'),this.$('btn-new-round-empty')];
    addBtns.forEach(b=>{if(b)b.onclick=()=>{this.state.editRoundId=null;this.$('round-form').reset();this.$('modal-round-title').textContent='Nueva Ronda';this.openModal('modal-round');}});
    if(this.$('btn-load-sample'))this.$('btn-load-sample').onclick=()=>{DataManager.loadSample();this.toast('Datos de ejemplo cargados','success');this.render();};
    if(!rounds.length){grid.innerHTML='';empty.style.display='';return;}
    empty.style.display='none';
    grid.innerHTML=rounds.map(r=>{
      const prog=DataManager.Rounds.getTotalProgress(r);
      const pct=prog.total?Math.round(prog.done/prog.total*100):0;
      const statusMap={'en-proceso':'🟡','completada':'✅','fallida':'❌','pausada':'⏸️'};
      const colors={'en-proceso':'var(--yellow)','completada':'var(--green)','fallida':'var(--red)','pausada':'var(--gray)'};
      const isCity=r.pattern.type==='la-city';
      return `<div class="card" onclick="App.openRound('${r.id}')">
        <div class="card-header"><div><div class="card-title">${r.name}</div><div class="card-subtitle">${r.instrument}${isCity?' · <span style="color:var(--gold)">La City</span>':''}</div></div>
        <span class="status-badge ${r.status}" style="--badge-color:${colors[r.status]}">${statusMap[r.status]} ${r.status}</span></div>
        <div class="card-metrics">
          <div class="card-metric"><div class="cm-label">Generados</div><div class="cm-value">${r.creation.totalGenerated||'—'}</div></div>
          <div class="card-metric"><div class="cm-label">Finalistas</div><div class="cm-value">${r.creation.finalists.length||'—'}</div></div>
          <div class="card-metric"><div class="cm-label">Progreso</div><div class="cm-value">${pct}%</div></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div style="margin-top:.4rem;display:flex;justify-content:space-between;align-items:center"><span style="font-size:.65rem;color:var(--text-muted)">${new Date(r.createdAt).toLocaleDateString('es-MX')}</span><button class="btn-icon danger" onclick="event.stopPropagation();App.deleteRound('${r.id}')" title="Eliminar ronda">✕</button></div>
      </div>`;
    }).join('');
  },
  openRound(id){ this.state.activeRoundId=id; this.navigate('active'); },
  deleteRound(id){ this.confirm('¿Eliminar esta ronda?',()=>{ DataManager.Rounds.delete(id); if(this.state.activeRoundId===id) this.state.activeRoundId=null; this.toast('Ronda eliminada','success'); this.render(); }); },
  // ── Round Form ──
  bindRoundForm(){
    this.$('round-form').addEventListener('submit',e=>{
      e.preventDefault();
      const data={name:this.$('r-name').value,instrument:this.$('r-instrument').value,patternType:this.$('r-patternType').value,notes:this.$('r-notes').value};
      if(this.state.editRoundId){
        const r=DataManager.Rounds.get(this.state.editRoundId);
        r.name=data.name;r.instrument=data.instrument;r.notes=data.notes;
        DataManager.Rounds.save(r);this.toast('Ronda actualizada','success');
      } else { DataManager.Rounds.create(data);this.toast('Ronda creada','success'); }
      this.closeModal('modal-round');this.render();
    });
  },
  // ══════ ACTIVE ROUND VIEW ══════
  renderActive(){
    const sel=this.$('active-round-select');
    const rounds=DataManager.Rounds.getAll().filter(r=>r.status!=='completada'||r.id===this.state.activeRoundId);
    sel.innerHTML='<option value="">— Selecciona Ronda —</option>'+DataManager.Rounds.getAll().map(r=>`<option value="${r.id}"${r.id===this.state.activeRoundId?' selected':''}>${r.name} (${r.status})</option>`).join('');
    sel.onchange=()=>{this.state.activeRoundId=sel.value;this.renderActive();};
    const r=this.state.activeRoundId?DataManager.Rounds.get(this.state.activeRoundId):null;
    const failBtn=this.$('btn-fail-round');const compBtn=this.$('btn-complete-round');
    failBtn.style.display=r&&r.status==='en-proceso'?'':'none';
    compBtn.style.display=r&&r.status==='en-proceso'?'':'none';
    failBtn.onclick=()=>{this.openModal('modal-fail');};
    compBtn.onclick=()=>this.confirm('¿Marcar ronda como completada?',()=>{r.status='completada';r.completedAt=new Date().toISOString();DataManager.Rounds.save(r);this.toast('Ronda completada','success');this.render();});
    if(!r){this.$('active-content').innerHTML='<div class="empty-state"><h3>Selecciona una ronda</h3><p>Elige una ronda del selector para ver su checklist.</p></div>';return;}
    this.renderChecklist(r);
  },
  renderChecklist(r){
    const c=this.$('active-content');const isCity=r.pattern.type==='la-city';
    const p1=DataManager.Rounds.getPhase1Progress(r);const p2=DataManager.Rounds.getPhase2Progress(r);
    const mkCheck=(key,label,phase,checked)=>`<div class="check-item${checked?' checked':''}"><input type="checkbox" ${checked?'checked':''} onchange="App.toggleCheck('${r.id}','${phase}','${key}',this.checked)"><span class="ci-label">${label}</span></div>`;
    // Phase 1
    let phase1Body='';
    if(isCity){
      phase1Body='<div style="padding:.5rem;color:var(--gold);font-size:.82rem">✨ Patrón de La City — Pre-verificado. No requiere evaluación.</div>';
    } else {
      const mFields=['retDD','pf','winRate','br','avgTrade','rExpectancy','sqn','winYears','loseYears'];
      const mLabels=['Ret/DD','PF','Win%','B/R','Avg Trade','R-Expect.','SQN','Años+','Años-'];
      const mkMetrics=(prefix,data)=>'<div class="metrics-inline">'+mFields.map((f,i)=>`<div class="mi-item"><label>${mLabels[i]}</label><input type="number" step="0.01" value="${data[f]||''}" onchange="App.saveMetric('${r.id}','${prefix}','${f}',this.value)"></div>`).join('')+'</div>';
      phase1Body=`
        ${mkCheck('created','Patrón creado en AlgoWizard','p1',r.pattern.checks.created)}
        ${mkCheck('baseMetricsOk','Métricas base revisadas','p1',r.pattern.checks.baseMetricsOk)}
        <div style="padding-left:1.8rem;font-size:.68rem;color:var(--text-muted);font-weight:600;margin:.3rem 0">MÉTRICAS BASE</div>
        ${mkMetrics('baseMetrics',r.pattern.baseMetrics)}
        ${mkCheck('costsApplied','Spreads / Slippage / Comisiones aplicados','p1',r.pattern.checks.costsApplied)}
        <div style="padding-left:1.8rem;font-size:.68rem;color:var(--text-muted);font-weight:600;margin:.3rem 0">CON COSTOS</div>
        ${mkMetrics('withCosts',r.pattern.withCosts)}
        ${mkCheck('optimizerRun','Optimizer ejecutado','p1',r.pattern.checks.optimizerRun)}
        <div style="padding:0 .5rem"><textarea rows="2" placeholder="Resultados del optimizer..." style="width:100%;font-size:.78rem" onchange="App.saveField('${r.id}','optimizerResults',this.value)">${r.pattern.optimizerResults||''}</textarea></div>
        ${mkCheck('filtersApplied','Filtros según análisis de activo','p1',r.pattern.checks.filtersApplied)}
        <div style="padding:0 .5rem"><textarea rows="2" placeholder="Filtros aplicados (meses, días, salida x barras)..." style="width:100%;font-size:.78rem" onchange="App.saveField('${r.id}','filters',this.value)">${r.pattern.filters||''}</textarea></div>
        ${mkCheck('templateReady','Plantilla del patrón finalizada','p1',r.pattern.checks.templateReady)}`;
    }
    // Phase 2
    const c2=r.creation.checks;
    const phase2Body=`
      ${mkCheck('templateCreated','Template(s) creados','p2',c2.templateCreated)}
      <div style="padding:.3rem .5rem;display:flex;justify-content:space-between;align-items:center"><span style="font-size:.72rem;color:var(--text-dim);font-weight:600">TEMPLATES</span><button class="btn btn-sm btn-secondary" onclick="App.state.editTplId=null;App.$('template-form').reset();App.openModal('modal-template')">+ Template</button></div>
      <div style="padding:0 .5rem">${this.renderTemplatesTable(r)}</div>
      ${mkCheck('builderReviewed','Pestañas del Builder revisadas','p2',c2.builderReviewed)}
      ${mkCheck('creationStarted','Creación iniciada','p2',c2.creationStarted)}
      ${mkCheck('creationVerified','Sistemas verificados vs plantilla','p2',c2.creationVerified)}
      <div style="padding:.5rem .5rem 0;font-size:.68rem;color:var(--text-muted);font-weight:600">FUNNEL</div>
      <div class="metrics-inline" style="grid-template-columns:repeat(3,1fr)">
        <div class="mi-item"><label>Total Generados</label><input type="number" value="${r.creation.totalGenerated||''}" onchange="App.saveFunnel('${r.id}','totalGenerated',this.value)"></div>
        <div class="mi-item"><label>Después OOS</label><input type="number" value="${r.creation.afterOOS||''}" onchange="App.saveFunnel('${r.id}','afterOOS',this.value)"></div>
        <div class="mi-item"><label>Data Completa</label><input type="number" value="${r.creation.afterFullData||''}" onchange="App.saveFunnel('${r.id}','afterFullData',this.value)"></div>
        <div class="mi-item"><label>Después MM</label><input type="number" value="${r.creation.afterMM||''}" onchange="App.saveFunnel('${r.id}','afterMM',this.value)"></div>
        <div class="mi-item"><label>Después SPP</label><input type="number" value="${r.creation.afterSPP||''}" onchange="App.saveFunnel('${r.id}','afterSPP',this.value)"></div>
        <div class="mi-item"><label>Después MC</label><input type="number" value="${r.creation.afterMC||''}" onchange="App.saveFunnel('${r.id}','afterMC',this.value)"></div>
      </div>
      ${mkCheck('oos','Out of Sample (OOS)','p2',c2.oos)}
      ${mkCheck('fullData','Data Completa','p2',c2.fullData)}
      ${mkCheck('mmRealCapital','MM con capital real','p2',c2.mmRealCapital)}
      ${mkCheck('mcTrades','Monte Carlo Trades','p2',c2.mcTrades)}
      ${mkCheck('spp','SPP (System Parameter Permutation)','p2',c2.spp)}
      ${mkCheck('finalistsSelected','Lista de finalistas hecha','p2',c2.finalistsSelected)}
      <div style="padding:.3rem .5rem;display:flex;justify-content:space-between;align-items:center"><span style="font-size:.72rem;color:var(--text-dim);font-weight:600">FINALISTAS</span><button class="btn btn-sm btn-secondary" onclick="App.state.editFinId=null;App.$('finalist-form').reset();App.openModal('modal-finalist')">+ Finalista</button></div>
      <div style="padding:0 .5rem">${this.renderFinalistsTable(r)}</div>
      ${mkCheck('winnerSelected','Ganador seleccionado (→ Real)','p2',c2.winnerSelected)}
      ${mkCheck('demoSelected','1-2 a Demo seleccionados','p2',c2.demoSelected)}
      ${mkCheck('mt4Evaluation','Evaluación en MT4 (Darwinex/Dukascopy)','p2',c2.mt4Evaluation)}
      ${mkCheck('portfolioImpact','Impacto en Portfolio evaluado','p2',c2.portfolioImpact)}
      <div style="padding:.3rem .5rem;display:flex;justify-content:space-between;align-items:center"><span style="font-size:.72rem;color:var(--text-dim);font-weight:600">PORTFOLIO SIN/CON SISTEMA</span><button class="btn btn-sm btn-secondary" onclick="App.openModal('modal-portfolio-comp')">Editar</button></div>
      ${this.renderPortfolioComp(r)}`;

    c.innerHTML=`
      <div class="phase-section"><div class="phase-header expanded" onclick="this.classList.toggle('expanded');this.nextElementSibling.classList.toggle('open')">
        <div class="ph-left"><div class="ph-icon">🔬</div><div><div class="ph-title">Fase 1: Evaluación de Patrón${isCity?' <span style="color:var(--gold);font-size:.7rem">(La City)</span>':''}</div><div class="ph-count">${p1.done}/${p1.total}</div></div></div>
        <div style="display:flex;align-items:center;gap:.5rem"><div class="ph-progress"><div class="ph-progress-fill" style="width:${p1.total?p1.done/p1.total*100:0}%"></div></div><span class="ph-chevron">▼</span></div>
      </div><div class="phase-body open">${phase1Body}</div></div>
      <div class="phase-section"><div class="phase-header" onclick="this.classList.toggle('expanded');this.nextElementSibling.classList.toggle('open')">
        <div class="ph-left"><div class="ph-icon">⚙️</div><div><div class="ph-title">Fase 2: Creación & Robustez</div><div class="ph-count">${p2.done}/${p2.total}</div></div></div>
        <div style="display:flex;align-items:center;gap:.5rem"><div class="ph-progress"><div class="ph-progress-fill" style="width:${p2.total?p2.done/p2.total*100:0}%"></div></div><span class="ph-chevron">▼</span></div>
      </div><div class="phase-body">${phase2Body}</div></div>`;
  },
  renderTemplatesTable(r){
    if(!r.creation.templates.length) return '<div style="font-size:.75rem;color:var(--text-muted);padding:.3rem">Sin templates.</div>';
    return `<table style="margin:.3rem 0"><thead><tr><th>Nombre</th><th>TF</th><th>Generados</th><th>Filtrados</th><th>Acc.</th></tr></thead><tbody>${r.creation.templates.map(t=>`<tr><td>${t.name}</td><td class="mono">${t.timeframe}</td><td class="mono">${t.systemsGenerated||'—'}</td><td class="mono">${t.systemsAfterFilter||'—'}</td><td><button class="btn-icon danger" onclick="event.stopPropagation();App.deleteTemplate('${r.id}','${t.id}')">✕</button></td></tr>`).join('')}</tbody></table>`;
  },
  renderFinalistsTable(r){
    if(!r.creation.finalists.length) return '<div style="font-size:.75rem;color:var(--text-muted);padding:.3rem">Sin finalistas.</div>';
    const destColors={real:'var(--green)',demo:'var(--cyan)',descartado:'var(--red)'};
    return `<table style="margin:.3rem 0"><thead><tr><th>Nombre</th><th>PF</th><th>Ret/DD</th><th>Win%</th><th>DD MC%</th><th>Destino</th><th>Acc.</th></tr></thead><tbody>${r.creation.finalists.map(f=>`<tr><td>${f.name}</td><td class="mono">${f.metrics.pf||'—'}</td><td class="mono">${f.metrics.retDD||'—'}</td><td class="mono">${f.metrics.winRate||'—'}</td><td class="mono">${f.metrics.ddMC||'—'}</td><td><span style="color:${destColors[f.destination]};font-size:.72rem;font-weight:600">${f.destination}</span></td><td><button class="btn-icon danger" onclick="event.stopPropagation();App.deleteFinalist('${r.id}','${f.id}')">✕</button></td></tr>`).join('')}</tbody></table>`;
  },
  renderPortfolioComp(r){
    const w=r.creation.portfolioComparison.without;const wi=r.creation.portfolioComparison.with;
    if(!w.retDD&&!wi.retDD) return '<div style="font-size:.75rem;color:var(--text-muted);padding:.3rem .5rem">Sin datos de comparación.</div>';
    const better=(a,b,lower)=>a!=null&&b!=null?(lower?a<b:a>b):false;
    return `<div class="comparison"><div class="comp-col"><div class="comp-col-title">Sin Sistema</div><div class="comp-row"><span class="cr-label">Ret/DD</span><span class="cr-value">${w.retDD||'—'}</span></div><div class="comp-row"><span class="cr-label">PF</span><span class="cr-value">${w.pf||'—'}</span></div><div class="comp-row"><span class="cr-label">Max DD%</span><span class="cr-value">${w.maxDD||'—'}</span></div></div>
    <div class="comp-col" style="border-color:rgba(16,185,129,.2)"><div class="comp-col-title" style="color:var(--accent)">Con Sistema</div><div class="comp-row"><span class="cr-label">Ret/DD</span><span class="cr-value ${better(wi.retDD,w.retDD)?'positive':''}">${wi.retDD||'—'}</span></div><div class="comp-row"><span class="cr-label">PF</span><span class="cr-value ${better(wi.pf,w.pf)?'positive':''}">${wi.pf||'—'}</span></div><div class="comp-row"><span class="cr-label">Max DD%</span><span class="cr-value ${better(wi.maxDD,w.maxDD,true)?'positive':''}">${wi.maxDD||'—'}</span></div></div></div>`;
  },
  // ── Data Operations ──
  toggleCheck(rId,phase,key,val){
    const r=DataManager.Rounds.get(rId);if(!r)return;
    if(phase==='p1') r.pattern.checks[key]=val;
    else r.creation.checks[key]=val;
    DataManager.Rounds.save(r);
    // Preserve expanded state
    const expanded=[];
    document.querySelectorAll('.phase-header').forEach((h,i)=>{if(h.classList.contains('expanded'))expanded.push(i);});
    this.renderChecklist(r);
    this.updateHeaderStats();
    document.querySelectorAll('.phase-header').forEach((h,i)=>{
      if(expanded.includes(i)){h.classList.add('expanded');h.nextElementSibling.classList.add('open');}
      else{h.classList.remove('expanded');h.nextElementSibling.classList.remove('open');}
    });
  },
  saveMetric(rId,group,field,val){
    const r=DataManager.Rounds.get(rId);if(!r)return;
    r.pattern[group][field]=val?parseFloat(val):null;
    DataManager.Rounds.save(r);
  },
  saveField(rId,field,val){
    const r=DataManager.Rounds.get(rId);if(!r)return;
    r.pattern[field]=val;DataManager.Rounds.save(r);
  },
  saveFunnel(rId,field,val){
    const r=DataManager.Rounds.get(rId);if(!r)return;
    r.creation[field]=val?parseInt(val):0;DataManager.Rounds.save(r);
  },
  deleteTemplate(rId,tId){
    const r=DataManager.Rounds.get(rId);if(!r)return;
    r.creation.templates=r.creation.templates.filter(t=>t.id!==tId);
    DataManager.Rounds.save(r);this.renderActive();
  },
  deleteFinalist(rId,fId){
    const r=DataManager.Rounds.get(rId);if(!r)return;
    r.creation.finalists=r.creation.finalists.filter(f=>f.id!==fId);
    DataManager.Rounds.save(r);this.renderActive();
  },
  // ── Template Form ──
  bindTemplateForm(){
    this.$('template-form').addEventListener('submit',e=>{
      e.preventDefault();const r=DataManager.Rounds.get(this.state.activeRoundId);if(!r)return;
      const t={id:DataManager.uid('t'),name:this.$('tpl-name').value,timeframe:this.$('tpl-timeframe').value,criteria:this.$('tpl-criteria').value,systemsGenerated:parseInt(this.$('tpl-generated').value)||0,systemsAfterFilter:parseInt(this.$('tpl-filtered').value)||0,notes:this.$('tpl-notes').value};
      r.creation.templates.push(t);DataManager.Rounds.save(r);
      this.closeModal('modal-template');this.toast('Template agregado','success');this.renderActive();
    });
  },
  // ── Finalist Form ──
  bindFinalistForm(){
    this.$('finalist-form').addEventListener('submit',e=>{
      e.preventDefault();const r=DataManager.Rounds.get(this.state.activeRoundId);if(!r)return;
      const f={id:DataManager.uid('f'),name:this.$('fin-name').value,destination:this.$('fin-destination').value,notes:this.$('fin-notes').value,
        metrics:{pf:parseFloat(this.$('fin-pf').value)||null,retDD:parseFloat(this.$('fin-retDD').value)||null,winRate:parseFloat(this.$('fin-winRate').value)||null,maxDD:parseFloat(this.$('fin-maxDD').value)||null,ddMC:parseFloat(this.$('fin-ddMC').value)||null,avgTrade:parseFloat(this.$('fin-avgTrade').value)||null,netProfit:parseFloat(this.$('fin-netProfit').value)||null}};
      r.creation.finalists.push(f);DataManager.Rounds.save(r);
      this.closeModal('modal-finalist');this.toast('Finalista agregado','success');this.renderActive();
    });
  },
  // ── Fail Form ──
  bindFailForm(){
    this.$('fail-form').addEventListener('submit',e=>{
      e.preventDefault();const r=DataManager.Rounds.get(this.state.activeRoundId);if(!r)return;
      r.status='fallida';r.failReason=this.$('fail-reason').value;r.failDetail=this.$('fail-detail').value;
      DataManager.Rounds.save(r);this.closeModal('modal-fail');this.toast('Ronda marcada como fallida','error');this.render();
    });
  },
  // ── Portfolio Comparison Form ──
  bindPortfolioCompForm(){
    this.$('portfolio-comp-form').addEventListener('submit',e=>{
      e.preventDefault();const r=DataManager.Rounds.get(this.state.activeRoundId);if(!r)return;
      r.creation.portfolioComparison={
        without:{retDD:parseFloat(this.$('pc-wo-retDD').value)||null,pf:parseFloat(this.$('pc-wo-pf').value)||null,maxDD:parseFloat(this.$('pc-wo-maxDD').value)||null},
        with:{retDD:parseFloat(this.$('pc-w-retDD').value)||null,pf:parseFloat(this.$('pc-w-pf').value)||null,maxDD:parseFloat(this.$('pc-w-maxDD').value)||null}
      };
      DataManager.Rounds.save(r);this.closeModal('modal-portfolio-comp');this.toast('Comparación guardada','success');this.renderActive();
    });
  }
};
document.addEventListener('DOMContentLoaded',()=>App.init());
