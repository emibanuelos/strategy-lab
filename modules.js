/* Strategy Lab — Modules: Review, Supervision, Stats */
const Modules = {
  init(){
    this.bindReviewForm();this.bindSupForm();this.bindMonthlyForm();this.bindPeriodicForm();
  },
  // ══════ REVIEW ══════
  renderReview(){
    const all=DataManager.Reviews.getAll();
    const tbody=App.$('review-tbody');const wrap=App.$('review-table-wrapper');const empty=App.$('review-empty');
    [App.$('btn-new-review'),App.$('btn-new-review-empty')].forEach(b=>{if(b)b.onclick=()=>{this._editRevId=null;App.$('review-form').reset();this.populateRevRounds();App.openModal('modal-review-form');}});
    if(!all.length){wrap.style.display='none';empty.style.display='';return;}
    empty.style.display='none';wrap.style.display='';
    tbody.innerHTML=all.map(r=>{
      const prog=DataManager.Reviews.getProgress(r);
      const colors={pendiente:'var(--cyan)',aprobado:'var(--green)',rechazado:'var(--red)'};
      return `<tr>
        <td><strong>${r.systemName}</strong></td><td>${r.instrument}</td><td class="mono">${r.timeframe}</td>
        <td style="font-size:.72rem">${r.roundId?this.getRoundName(r.roundId):'—'}</td>
        <td><span class="status-badge ${r.status}" style="--badge-color:${colors[r.status]}">${r.status}</span></td>
        <td class="mono">${prog.done}/${prog.total}</td>
        <td class="mono">${r.minSizeMultiplier?'x'+r.minSizeMultiplier:'—'}</td>
        <td class="mono">${r.atrCritical||'—'}</td>
        <td><div style="display:flex;gap:.15rem">
          <button class="btn-icon" onclick="Modules.toggleRevChecks('${r.id}')" title="Toggle checks">☑</button>
          <button class="btn-icon" onclick="Modules.cycleRevStatus('${r.id}')" title="Cambiar estado">↻</button>
          <button class="btn-icon danger" onclick="App.confirm('¿Eliminar sistema?',()=>{DataManager.Reviews.delete('${r.id}');App.render();})">✕</button>
        </div></td></tr>`;
    }).join('');
  },
  populateRevRounds(){
    const sel=App.$('rev-roundId');
    sel.innerHTML='<option value="">— Sin ronda —</option>'+DataManager.Rounds.getAll().map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  },
  bindReviewForm(){
    App.$('review-form').addEventListener('submit',e=>{
      e.preventDefault();
      DataManager.Reviews.create({systemName:App.$('rev-name').value,instrument:App.$('rev-instrument').value,timeframe:App.$('rev-timeframe').value,roundId:App.$('rev-roundId').value,minSizeMultiplier:parseFloat(App.$('rev-minSize').value)||null,atrCritical:parseFloat(App.$('rev-atrCritical').value)||null,notes:App.$('rev-notes').value});
      App.closeModal('modal-review-form');App.toast('Sistema en revisión agregado','success');App.render();
    });
  },
  toggleRevChecks(id){
    const r=DataManager.Reviews.get(id);if(!r)return;
    const keys=Object.keys(r.checks);const allDone=keys.every(k=>r.checks[k]);
    if(allDone){const next=keys.find(k=>r.checks[k]);if(next)r.checks[next]=false;}
    else{const next=keys.find(k=>!r.checks[k]);if(next)r.checks[next]=true;}
    DataManager.Reviews.save(r);App.render();
  },
  cycleRevStatus(id){
    const r=DataManager.Reviews.get(id);if(!r)return;
    const cycle=['pendiente','aprobado','rechazado'];
    r.status=cycle[(cycle.indexOf(r.status)+1)%3];
    DataManager.Reviews.save(r);App.render();
  },
  getRoundName(id){const r=DataManager.Rounds.get(id);return r?r.name:'—';},

  // ══════ SUPERVISION ══════
  _supTarget:null,
  renderSupervision(){
    const filter=App.$('sup-filter').value;
    let all=DataManager.Supervisions.getAll();
    if(filter)all=all.filter(s=>s.destination===filter);
    App.$('sup-filter').onchange=()=>this.renderSupervision();
    const container=App.$('supervision-container');const empty=App.$('supervision-empty');
    [App.$('btn-new-supervision'),App.$('btn-new-sup-empty')].forEach(b=>{if(b)b.onclick=()=>{App.$('sup-form').reset();this.populateSupRounds();App.openModal('modal-sup-form');}});
    if(!all.length){container.innerHTML='';empty.style.display='';return;}
    empty.style.display='none';
    container.innerHTML=all.map(s=>{
      const destColor=s.destination==='real'?'var(--green)':'var(--cyan)';
      const statusColor=s.status==='activo'?'var(--green)':s.status==='retirado'?'var(--red)':'var(--yellow)';
      const logsHtml=s.monthlyLogs.length?s.monthlyLogs.slice().reverse().map(l=>{
        const checks=[l.mt4Downloaded,l.quantAnalyzerDone,l.excelUpdated,l.sqxPortfolioUpdated];
        const labels=['MT4','QA','Excel','SQX'];
        const done=checks.filter(Boolean).length;const complete=done===4;
        return `<div class="tl-item${complete?'':' incomplete'}"><div class="tl-header"><span class="tl-date">${l.month}</span><span style="font-size:.68rem;color:${l.realVsSqxMatch===true?'var(--green)':l.realVsSqxMatch===false?'var(--red)':'var(--text-muted)'}">${l.realVsSqxMatch===true?'✅ Match':l.realVsSqxMatch===false?'❌ Desviación':'⏳ Pendiente'}</span></div>
        <div class="tl-checks">${labels.map((lb,i)=>`<span class="tl-check${checks[i]?' done':''}" onclick="Modules.toggleMonthlyCheck('${s.id}','${l.id}',${i})">${lb}</span>`).join('')}</div>
        ${l.notes?`<div class="tl-notes">${l.notes}</div>`:''}
        ${l.deviation?`<div class="tl-notes" style="border-color:var(--red)">⚠ ${l.deviation}</div>`:''}</div>`;
      }).join(''):'<div style="font-size:.75rem;color:var(--text-muted);padding:.3rem">Sin logs mensuales.</div>';
      const reviewsHtml=s.periodicReviews.length?s.periodicReviews.slice().reverse().map(p=>`<div style="padding:.4rem;margin-bottom:.3rem;background:rgba(255,255,255,.02);border-radius:var(--radius-xs);border:1px solid var(--border);font-size:.75rem">
        <div style="display:flex;justify-content:space-between"><span class="mono">${p.date} (${p.type})</span><span style="color:${p.metricsOk?'var(--green)':'var(--red)'}">${p.metricsOk?'✅ Métricas OK':'❌ Métricas NO'}</span></div>
        <div style="color:var(--text-dim);margin-top:.2rem">Plan: <strong style="color:${{mantener:'var(--green)',retirar:'var(--red)',reemplazar:'var(--yellow)'}[p.continuePlan]}">${p.continuePlan}</strong>${p.replacementCandidate?' → '+p.replacementCandidate:''}</div>
        ${p.notes?`<div style="color:var(--text-muted);margin-top:.15rem;font-style:italic">${p.notes}</div>`:''}</div>`).join(''):'';

      return `<div class="card" style="cursor:default;margin-bottom:.75rem">
        <div class="card-header"><div><div class="card-title">${s.systemName}</div><div class="card-subtitle">${s.instrument} · ${s.timeframe} · ${s.templateUsed||s.creationMethod||'—'}</div></div>
        <div style="display:flex;gap:.3rem;align-items:center">
          <span style="color:${destColor};font-size:.7rem;font-weight:600;text-transform:uppercase">${s.destination}</span>
          <span class="status-badge ${s.status}" style="--badge-color:${statusColor}">${s.status}</span>
        </div></div>
        <div style="font-size:.72rem;color:var(--text-dim);margin-bottom:.5rem">Inicio: ${s.startDate}</div>
        <div style="display:flex;gap:.3rem;margin-bottom:.6rem">
          <button class="btn btn-sm btn-secondary" onclick="Modules._supTarget='${s.id}';App.$('monthly-form').reset();App.$('ml-month').value=new Date().toISOString().slice(0,7);App.openModal('modal-monthly')">+ Log Mensual</button>
          <button class="btn btn-sm btn-secondary" onclick="Modules._supTarget='${s.id}';App.$('periodic-form').reset();App.openModal('modal-periodic')">+ Revisión</button>
          <button class="btn btn-sm btn-secondary" onclick="Modules.cycleSupStatus('${s.id}')">↻ Estado</button>
          <button class="btn btn-sm btn-danger" onclick="App.confirm('¿Eliminar sistema?',()=>{DataManager.Supervisions.delete('${s.id}');App.render();})">✕</button>
        </div>
        <div style="font-size:.72rem;font-weight:600;color:var(--text-dim);margin-bottom:.3rem">LOGS MENSUALES</div>
        <div class="timeline">${logsHtml}</div>
        ${reviewsHtml?`<div style="font-size:.72rem;font-weight:600;color:var(--text-dim);margin:.5rem 0 .3rem">REVISIONES PERIÓDICAS</div>${reviewsHtml}`:''}
      </div>`;
    }).join('');
  },
  populateSupRounds(){
    const sel=App.$('sup-roundId');
    sel.innerHTML='<option value="">— Sin ronda —</option>'+DataManager.Rounds.getAll().map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  },
  bindSupForm(){
    App.$('sup-form').addEventListener('submit',e=>{
      e.preventDefault();
      DataManager.Supervisions.create({systemName:App.$('sup-name').value,instrument:App.$('sup-instrument').value,timeframe:App.$('sup-timeframe').value,destination:App.$('sup-destination').value,startDate:App.$('sup-startDate').value,roundId:App.$('sup-roundId').value,creationMethod:'',templateUsed:App.$('sup-method').value});
      App.closeModal('modal-sup-form');App.toast('Sistema en supervisión agregado','success');App.render();
    });
  },
  bindMonthlyForm(){
    App.$('monthly-form').addEventListener('submit',e=>{
      e.preventDefault();if(!this._supTarget)return;
      DataManager.Supervisions.addMonthlyLog(this._supTarget,{month:App.$('ml-month').value,realVsSqxMatch:App.$('ml-match').value===''?null:App.$('ml-match').value==='true',deviation:App.$('ml-deviation').value,notes:App.$('ml-notes').value});
      App.closeModal('modal-monthly');App.toast('Log mensual agregado','success');App.render();
    });
  },
  bindPeriodicForm(){
    App.$('periodic-form').addEventListener('submit',e=>{
      e.preventDefault();if(!this._supTarget)return;
      DataManager.Supervisions.addPeriodicReview(this._supTarget,{date:App.$('pr-date').value,type:App.$('pr-type').value,metricsOk:App.$('pr-metricsOk').value==='true',continuePlan:App.$('pr-plan').value,replacementCandidate:App.$('pr-replacement').value,notes:App.$('pr-notes').value});
      App.closeModal('modal-periodic');App.toast('Revisión agregada','success');App.render();
    });
  },
  toggleMonthlyCheck(supId,logId,idx){
    const s=DataManager.Supervisions.get(supId);if(!s)return;
    const log=s.monthlyLogs.find(l=>l.id===logId);if(!log)return;
    const keys=['mt4Downloaded','quantAnalyzerDone','excelUpdated','sqxPortfolioUpdated'];
    log[keys[idx]]=!log[keys[idx]];
    DataManager.Supervisions.save(s);App.render();
  },
  cycleSupStatus(id){
    const s=DataManager.Supervisions.get(id);if(!s)return;
    const cycle=['activo','retirado','reemplazado'];
    s.status=cycle[(cycle.indexOf(s.status)+1)%3];
    DataManager.Supervisions.save(s);App.render();
  },

  // ══════ STATS ══════
  renderStats(){
    const summary=DataManager.Stats.getSummary();
    App.$('stats-summary').innerHTML=`
      <div class="stat-card"><div class="sc-label">Total Rondas</div><div class="sc-value">${summary.total}</div></div>
      <div class="stat-card"><div class="sc-label">En Proceso</div><div class="sc-value" style="-webkit-text-fill-color:var(--yellow)">${summary.active}</div></div>
      <div class="stat-card"><div class="sc-label">Completadas</div><div class="sc-value">${summary.completed}</div></div>
      <div class="stat-card"><div class="sc-label">Fallidas</div><div class="sc-value" style="-webkit-text-fill-color:var(--red)">${summary.failed}</div></div>
      <div class="stat-card"><div class="sc-label">Tasa de Éxito</div><div class="sc-value">${summary.rate!==null?summary.rate+'%':'—'}</div></div>`;
    // Funnel
    const funnel=DataManager.Stats.getFunnel();
    const funnelEl=App.$('stats-funnel');
    if(funnel&&funnel.generated>0){
      const max=funnel.generated;
      const rows=[['Generados',funnel.generated,'var(--accent)'],['Después OOS',funnel.afterOOS,'#34d399'],['Data Completa',funnel.afterFullData,'var(--cyan)'],['Después MM',funnel.afterMM,'var(--blue)'],['Después SPP',funnel.afterSPP,'var(--yellow)'],['Después MC',funnel.afterMC,'#f97316'],['A Real',funnel.toReal,'var(--gold)']];
      funnelEl.innerHTML=rows.map(([label,val,color])=>`<div class="funnel-row"><span class="funnel-label">${label}</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${Math.max(val/max*100,2)}%;background:${color}"><span>${val.toLocaleString()}</span></div></div><span class="funnel-value">${val.toLocaleString()}</span></div>`).join('');
    } else { funnelEl.innerHTML='<div style="font-size:.78rem;color:var(--text-muted)">Sin datos de funnel.</div>'; }
    // Fail Reasons
    const reasons=DataManager.Stats.getFailReasons();
    const reasonsEl=App.$('stats-reasons');
    if(reasons.length){
      reasonsEl.innerHTML=reasons.map(r=>`<div class="reason-row"><span class="reason-label">${r.reason}</span><div class="reason-bar-wrap"><div class="reason-bar" style="width:${r.pct}%"></div></div><span class="reason-pct">${r.pct}%</span></div>`).join('');
    } else { reasonsEl.innerHTML='<div style="font-size:.78rem;color:var(--text-muted)">Sin datos de fallo.</div>'; }
    // Durability
    const dur=DataManager.Stats.getDurability();
    const dtbody=App.$('durability-tbody');
    if(dur.length){
      dtbody.innerHTML=dur.map(d=>`<tr><td>${d.method}</td><td class="mono">${d.total}</td><td class="mono positive">${d.active}</td><td class="mono negative">${d.retired}</td><td class="mono">${d.avgMonths}</td><td class="mono">${d.survivalRate}%</td></tr>`).join('');
    } else { dtbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sin datos de supervisión.</td></tr>'; }
  }
};
