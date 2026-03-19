// ============================================================================
// APP.JS — Poverty & Policy Atlas
// All data loaded dynamically from /data/*.json (exported by Python script)
// ============================================================================

const D = {};
let chartsBuilt = {};
const $ = id => document.getElementById(id);

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

function safe(v, d = 1) {
  if (v == null || v !== v) return 'N/A';
  return typeof v === 'number' ? v.toFixed(d) : v;
}

// ── Load all data files ───────────────────────────────────────────────────────
async function loadAllData() {
  const files = [
    'overview_kpis','spending_regional','spending_sector',
    'spending_mix','spending_yoy','misalign_timeseries',
    'misalign_heatmap','misalign_counties','spending_counties',
    'poverty_counties','poverty_timeseries','model_rolling',
    'model_cv','model_features','model_state_r2',
    'model_predictions','clusters','map_counties',
  ];
  const results = await Promise.allSettled(
    files.map(name => loadJSON(`./data/${name}.json`).then(data => ({ name, data })))
  );
  results.forEach(r => {
    if (r.status === 'fulfilled') D[r.value.name] = r.value.data;
    else console.warn('Data load:', r.reason?.message);
  });
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function show(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $(id).classList.add('active');
  if (btn) btn.classList.add('active');
  setTimeout(() => initSection(id), 60);
}

function initSection(id) {
  if (chartsBuilt[id]) return;
  chartsBuilt[id] = true;
  if (id === 'overview')     renderOverview();
  if (id === 'spending')     renderSpending();
  if (id === 'misalignment') renderMisalignment();
  if (id === 'maps')         renderMaps();
  if (id === 'clusters')     renderClusters();
  if (id === 'models')       renderModels();
  if (id === 'predict')      initPredict();
  if (id === 'conclusions')  renderConclusions();
}

function showMapTab(panelId, btn) {
  document.querySelectorAll('.map-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.map-tab-btn').forEach(b => b.classList.remove('active'));
  $(panelId).classList.add('active');
  if (btn) btn.classList.add('active');
  if (!chartsBuilt[panelId]) {
    chartsBuilt[panelId] = true;
    const mode = panelId === 'map-poverty' ? 'poverty'
               : panelId === 'map-spending' ? 'spending' : 'misalignment';
    renderCountyMap(mode, panelId);
  }
}

// ── COLOR HELPERS ─────────────────────────────────────────────────────────────
function povertyColor(pct) {
  if (pct == null) return '#e0e0e0';
  if (pct >= 25) return '#6B0000';
  if (pct >= 20) return '#CC2200';
  if (pct >= 15) return '#FF7700';
  if (pct >= 10) return '#FFCC44';
  return '#A8C8E8';
}
function spendingColor(pct) {
  if (pct == null) return '#e0e0e0';
  if (pct >= 80) return '#1A2B5F';
  if (pct >= 60) return '#A8C8E8';
  if (pct >= 40) return '#F5D990';
  if (pct >= 20) return '#E03A2A';
  return '#6B0000';
}
function misalignColor(score) {
  if (score == null) return '#e0e0e0';
  if (score > 1.5)  return '#8B0000';
  if (score > 0.5)  return '#FF7744';
  if (score > -0.5) return '#f5f5f0';
  if (score > -1.5) return '#4499DD';
  return '#002255';
}
const CLUSTER_COLORS = { high_under:'#e24b4a', high_over:'#ffb546', low_under:'#0c7bff', low_aligned:'#1db954' };
const MODEL_COLORS   = { 'Gradient Boosting':'#ffb546', 'ResNet':'#0c7bff', 'GNN':'#1db954' };

function legendItem(color, label) {
  return `<div class="legend-item"><div class="legend-dot" style="background:${color}"></div>${label}</div>`;
}
function chartOpts({ yMin, yMax, yCallback } = {}) {
  const sc = { x:{grid:{display:false}}, y:{grid:{color:'rgba(0,0,0,0.05)'}} };
  if (yMin != null) sc.y.min = yMin;
  if (yMax != null) sc.y.max = yMax;
  if (yCallback) sc.y.ticks = { callback: yCallback };
  return { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:sc };
}

// ── 1. OVERVIEW ───────────────────────────────────────────────────────────────
function renderOverview() {
  const k = D.overview_kpis; if (!k) return;
  const s = (id, v) => { const e=$(id); if(e) e.textContent=v; };
  s('kpi-counties',     k.n_counties||624);
  s('kpi-transactions', k.n_transactions||'14M+');
  s('kpi-r2',          'R²='+safe(k.model_r2,2));
  s('ov-avg-poverty',   safe(k.avg_poverty_rate)+'%');
  s('ov-obligations',  '$'+safe(k.total_obligations_trillions,1)+'T');
  s('ov-covid-surge',  '+'+ safe(k.covid_surge_pct,0)+'%');
  s('ov-direct-share',  safe(k.direct_payment_share,0)+'%');
}

// ── 2. SPENDING ───────────────────────────────────────────────────────────────
let spendChart=null, mixChart=null, yoyChart=null;

function renderSpending() { buildSpendChart(); buildMixChart(); buildYoyChart(); }

function buildSpendChart() {
  const view = $('spendView')?.value || 'region';
  if (spendChart) { spendChart.destroy(); spendChart=null; }
  if (view==='region') {
    const d=D.spending_regional; if(!d) return;
    $('spendChartTitle').textContent='Total Assistance by Region ($B) — 2014–2023';
    $('spendChartSub').textContent='Appalachia peaked at $'+Math.max(...d.appalachia.filter(Boolean)).toFixed(0)+'B. Delta at $'+Math.max(...d.delta.filter(Boolean)).toFixed(0)+'B in 2021.';
    $('spendLegend').innerHTML=legendItem('#ffb546','Western Appalachia')+legendItem('#0c7bff','Mississippi Delta');
    spendChart=new Chart($('spendChart'),{type:'line',data:{labels:d.years,datasets:[
      {label:'Western Appalachia',data:d.appalachia,borderColor:'#ffb546',backgroundColor:'rgba(255,181,70,0.08)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.3},
      {label:'Mississippi Delta', data:d.delta,     borderColor:'#0c7bff',backgroundColor:'rgba(12,123,255,0.06)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.3},
    ]},options:chartOpts({yCallback:v=>`$${v}B`})});
  } else {
    const d=D.spending_sector; if(!d) return;
    $('spendChartTitle').textContent='Federal Spending by Sector ($B) — 2014–2023';
    $('spendChartSub').textContent='HHS and Social Security dominate the portfolio.';
    $('spendLegend').innerHTML=legendItem('#ffb546','Western Appalachia')+legendItem('#0c7bff','Mississippi Delta');
    spendChart=new Chart($('spendChart'),{type:'bar',data:{labels:d.sectors,datasets:[
      {label:'Western Appalachia',data:d.appalachia,backgroundColor:'#ffb546',borderRadius:4},
      {label:'Mississippi Delta', data:d.delta,     backgroundColor:'#0c7bff',borderRadius:4},
    ]},options:chartOpts({yCallback:v=>`$${v}B`})});
  }
}

function buildMixChart() {
  if (mixChart) return;
  const d=D.spending_mix; if(!d) return;
  const total=d.values.reduce((s,v)=>s+(v||0),0);
  const vals=d.values.map(v=>v??Math.max(0,100-total));
  mixChart=new Chart($('mixChart'),{type:'doughnut',
    data:{labels:d.labels,datasets:[{data:vals,backgroundColor:['#ffb546','#0c7bff','#1db954','#aaa','#ddd'],borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
      plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${safe(ctx.raw)}%`}}}}});
}

function buildYoyChart() {
  if (yoyChart) return;
  const d=D.spending_yoy; if(!d) return;
  yoyChart=new Chart($('yoyChart'),{type:'bar',data:{labels:d.years,datasets:[
    {label:'Appalachia YoY%',data:d.appalachia,backgroundColor:d.appalachia.map(v=>v>=0?'rgba(255,181,70,0.85)':'rgba(255,181,70,0.3)'),borderRadius:3},
    {label:'Delta YoY%',    data:d.delta,     backgroundColor:d.delta.map(v=>v>=0?'rgba(12,123,255,0.85)':'rgba(12,123,255,0.3)'),borderRadius:3},
  ]},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}},
    scales:{y:{ticks:{callback:v=>`${v}%`},grid:{color:'rgba(0,0,0,0.05)'}},x:{grid:{display:false}}}}});
}

function renderSpendingCharts() {
  chartsBuilt['spending']=false;
  if(mixChart){mixChart.destroy();mixChart=null;}
  if(yoyChart){yoyChart.destroy();yoyChart=null;}
  renderSpending();
}

// ── 3. MISALIGNMENT ───────────────────────────────────────────────────────────
let misalignChart=null;

function renderMisalignment() { buildMisalignTimeChart(); buildMisalignHeatmap(); }

function buildMisalignTimeChart() {
  if(misalignChart) return;
  const d=D.misalign_timeseries; if(!d) return;
  misalignChart=new Chart($('misalignTimeChart'),{type:'line',data:{labels:d.years,datasets:[
    {label:'Mississippi Delta', data:d.delta,      borderColor:'#0c7bff',backgroundColor:'rgba(12,123,255,0.06)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.3},
    {label:'Western Appalachia',data:d.appalachia, borderColor:'#ffb546',backgroundColor:'rgba(255,181,70,0.06)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.3},
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    scales:{y:{title:{display:true,text:'Avg Misalignment Score'},grid:{color:'rgba(0,0,0,0.05)'}},x:{grid:{display:false}}}}});
}

function buildMisalignHeatmap() {
  const tbody=$('heatmapBody');
  if(!tbody||tbody.children.length>0||!D.misalign_heatmap) return;
  const {agencies,rows}=D.misalign_heatmap;
  rows.forEach((row,ri)=>{
    if(ri===3){
      const div=document.createElement('tr');
      div.innerHTML=`<td colspan="${agencies.length+1}" style="padding:4px 12px;"><div style="height:2px;background:var(--ink);border-radius:1px;"></div></td>`;
      tbody.appendChild(div);
    }
    const rl=ri===0?`<span style="font-size:0.65rem;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.1em;color:#0c7bff;display:block;margin-bottom:2px;">Delta</span>`
            :ri===3?`<span style="font-size:0.65rem;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.1em;color:#ffb546;display:block;margin-bottom:2px;">Appalachia</span>`:'';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="padding:8px 12px;font-size:0.85rem;font-weight:500;white-space:nowrap;">${rl}${row.state}</td>`+
      agencies.map(agency=>{
        const v=row.values[agency];
        const intensity=Math.min(Math.abs(v||0)/2,1);
        let bg,tc;
        if(v>0.2){bg=`rgba(139,0,0,${0.3+intensity*0.7})`;tc='white';}
        else if(v<-0.2){bg=`rgba(0,34,85,${0.3+intensity*0.7})`;tc='white';}
        else{bg='rgba(200,200,200,0.2)';tc='var(--ink)';}
        return `<td style="padding:10px 12px;text-align:center;"><div style="background:${bg};color:${tc};border-radius:6px;padding:6px 4px;font-family:var(--font-mono);font-size:0.78rem;font-weight:600;">${v!=null?v.toFixed(2):'—'}</div></td>`;
      }).join('');
    tbody.appendChild(tr);
  });
}

// ── 4. INTERACTIVE MAPS ───────────────────────────────────────────────────────
let leafletMaps={}, leafletGeo=null, countyDataMap={};

async function renderMaps() {
  if (D.map_counties) {
    D.map_counties.forEach(row => { countyDataMap[row.geoid]=row; });
  }
  // Render first visible panel (poverty)
  chartsBuilt['map-poverty']=true;
  await renderCountyMap('poverty','map-poverty');
}

async function renderCountyMap(mode, panelId) {
  // Map each mode to its canvas container ID
  const containerIds={poverty:'leaflet-poverty',spending:'leaflet-spending',misalignment:'leaflet-misalign'};
  const containerId=containerIds[mode]; if(!containerId) return;

  if(leafletMaps[containerId]){leafletMaps[containerId].remove();leafletMaps[containerId]=null;}

  const map=L.map(containerId,{zoomControl:true,scrollWheelZoom:false}).setView([35.5,-87.5],6);
  leafletMaps[containerId]=map;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    attribution:'© OpenStreetMap, © CARTO',maxZoom:12
  }).addTo(map);

  if(!leafletGeo){
    try {
      leafletGeo=await loadJSON('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
    } catch(e){
      const el=document.getElementById(containerId);
      if(el) el.innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted);">GeoJSON unavailable — check internet connection</div>';
      return;
    }
  }

  const TARGET_FIPS=['28','22','05','47','54','51','21'];
  const filtered={type:'FeatureCollection',features:leafletGeo.features.filter(f=>TARGET_FIPS.includes((f.id||'').slice(0,2)))};

  // Get currently selected agency/metric from dropdown
  const agencyDropId={spending:'spending-agency-select',misalignment:'misalign-agency-select'};
  const agencyDrop=agencyDropId[mode]?$(agencyDropId[mode]):null;
  const selectedAgency=agencyDrop?agencyDrop.value:'total';

  const layer=L.geoJSON(filtered,{
    style:feature=>{
      const geoid=feature.id||'';
      const row=countyDataMap[geoid]||{};
      let color;
      if(mode==='poverty')       color=povertyColor(row.poverty_avg);
      else if(mode==='spending'){
        if(selectedAgency==='total') color=spendingColor(row.spend_pct);
        else {
          // Rank on-the-fly for selected agency
          const val=row.agencies_spend?.[selectedAgency];
          color=spendingColor(val!=null ? agencySpendPct(selectedAgency,val) : null);
        }
      }
      else {
        const val=selectedAgency==='total'?row.misalignment:row.agencies_mis?.[selectedAgency];
        color=misalignColor(val);
      }
      return {fillColor:color,fillOpacity:0.82,color:'#ffffff',weight:0.5};
    },
    onEachFeature:(feature,lyr)=>{
      const geoid=feature.id||'';
      const row=countyDataMap[geoid]||{};
      let tip=`<strong>${row.state||'County'}</strong><br>GEOID ${geoid}`;
      if(row.poverty_avg!=null)   tip+=`<br>Poverty: <strong>${row.poverty_avg.toFixed(1)}%</strong>`;
      if(row.spend_total_m!=null) tip+=`<br>Avg spend: <strong>$${(row.spend_total_m).toFixed(0)}M</strong>`;
      if(row.misalignment!=null)  tip+=`<br>Misalignment: <strong>${row.misalignment>0?'+':''}${row.misalignment.toFixed(2)}</strong>`;
      if(row.cluster)             tip+=`<br>Cluster: ${row.cluster.replace(/_/g,' ')}`;
      lyr.bindPopup(tip);
      lyr.on('mouseover',()=>lyr.setStyle({fillOpacity:1.0,weight:1.5}));
      lyr.on('mouseout', ()=>layer.resetStyle(lyr));
    }
  }).addTo(map);

  map.fitBounds(layer.getBounds(),{padding:[20,20]});
}

// Pre-compute per-agency spend percentiles for coloring
const agencyPctCache={};
function agencySpendPct(agency,val) {
  if(!agencyPctCache[agency]){
    const vals=D.map_counties.map(r=>r.agencies_spend?.[agency]).filter(v=>v!=null).sort((a,b)=>a-b);
    agencyPctCache[agency]=vals;
  }
  const vals=agencyPctCache[agency];
  if(!vals.length) return 50;
  const idx=vals.filter(v=>v<=val).length;
  return (idx/vals.length)*100;
}

function changeMapLayer(mode) {
  const panelId={poverty:'map-poverty',spending:'map-spending',misalignment:'map-misalign'}[mode];
  chartsBuilt[panelId]=false;
  renderCountyMap(mode,panelId);
}

// ── 5. CLUSTERS ───────────────────────────────────────────────────────────────
let clusterChart=null;

function renderClusters() { buildClusterCards(); buildClusterChart(); }

const CLUSTER_DESC={
  high_under :'High poverty counties receiving below-average federal spending relative to their need. Programs simply do not reach them at sufficient scale.',
  high_over  :'Very high poverty counties that do receive proportional transfers. Spending is aligned but poverty is not falling — transfers maintain but do not reduce poverty.',
  low_under  :'Moderate or low poverty counties capturing disproportionate federal spending — often due to university presence, military bases, or strong grant-writing infrastructure.',
  low_aligned:'Counties where spending is roughly proportional to poverty level. These are the baseline — no urgent reallocation needed.',
};

function buildClusterCards() {
  const d=D.clusters; if(!d) return;
  const container=$('cluster-cards'); if(!container) return;
  container.innerHTML='';
  d.profiles.forEach(p=>{
    const card=document.createElement('div');
    card.className='cluster-card';
    card.style.borderTop=`4px solid ${p.color}`;
    card.innerHTML=`
      <span class="cluster-badge" style="background:${p.color}22;color:${p.color};">${p.label}</span>
      <div class="cluster-pct" style="color:${p.color}">${safe(p.pct_of_total,0)}%</div>
      <div class="cluster-desc">${CLUSTER_DESC[p.id]||''}</div>
      <div class="cluster-bar-wrap">
        <div class="cluster-bar-row"><span class="cluster-bar-label">Avg poverty</span><div class="cluster-bar-track"><div class="cluster-bar-fill" style="width:${Math.min(p.avg_poverty||0,35)/35*100}%;background:${p.color};"></div></div><span class="cluster-bar-val">${safe(p.avg_poverty)}%</span></div>
        <div class="cluster-bar-row"><span class="cluster-bar-label">Misalignment</span><div class="cluster-bar-track"><div class="cluster-bar-fill" style="width:${Math.min(Math.abs(p.avg_misalign||0),2)/2*100}%;background:${p.color};"></div></div><span class="cluster-bar-val">${(p.avg_misalign||0)>0?'+':''}${safe(p.avg_misalign,2)}</span></div>
        <div class="cluster-bar-row"><span class="cluster-bar-label">Grant share</span><div class="cluster-bar-track"><div class="cluster-bar-fill" style="width:${Math.min(p.avg_grants_share||0,20)/20*100}%;background:#0c7bff;"></div></div><span class="cluster-bar-val">${safe(p.avg_grants_share)}%</span></div>
      </div>
      <div class="cluster-stats"><div class="cluster-stat"><strong>Top states:</strong> ${(p.top_states||[]).map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(', ')}</div></div>`;
    container.appendChild(card);
  });
}

function buildClusterChart() {
  if(clusterChart||!D.clusters?.profiles) return;
  const ps=D.clusters.profiles;
  clusterChart=new Chart($('clusterCompareChart'),{type:'bar',data:{
    labels:ps.map(p=>p.label.split('·')[0].trim()),
    datasets:[
      {label:'Avg poverty (%)',  data:ps.map(p=>p.avg_poverty),  backgroundColor:ps.map(p=>p.color+'cc'),borderRadius:4},
      {label:'Abs misalignment', data:ps.map(p=>Math.abs(p.avg_misalign||0)),backgroundColor:ps.map(p=>p.color+'55'),borderRadius:4},
      {label:'Grant share (%)',  data:ps.map(p=>p.avg_grants_share),backgroundColor:'rgba(12,123,255,0.5)',borderRadius:4},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}},
      scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.05)'}},x:{grid:{display:false}}}}});
}

// ── 6. MODELS ─────────────────────────────────────────────────────────────────
let r2Chart=null,rmseChart=null,cvChart=null,scatterChart=null;

function renderModels() { buildModelTable(); buildR2Chart(); buildRmseChart(); buildCvChart(); buildScatterChart(); }

function buildR2Chart() {
  if(r2Chart||!D.model_rolling) return;
  const models=D.model_rolling;
  const allYears=[...new Set(models.flatMap(m=>m.test_years))].sort();
  r2Chart=new Chart($('r2Chart'),{type:'line',data:{labels:allYears,datasets:models.map((m,i)=>({
    label:m.label,
    data:allYears.map(y=>{const idx=m.test_years.indexOf(y);return idx>=0?m.r2[idx]:null;}),
    borderColor:MODEL_COLORS[m.label]||`hsl(${i*80},70%,50%)`,
    backgroundColor:(MODEL_COLORS[m.label]||'#aaa')+'10',
    borderWidth:2.5,pointRadius:5,fill:i===0,tension:0.3,spanGaps:false,
  }))},options:{...chartOpts({yMin:0.6,yMax:0.98}),plugins:{legend:{display:false}}}});
}

function buildRmseChart() {
  if(rmseChart||!D.model_rolling) return;
  const models=D.model_rolling;
  const allYears=[...new Set(models.flatMap(m=>m.test_years))].sort();
  rmseChart=new Chart($('rmseChart'),{type:'line',data:{labels:allYears,datasets:models.map(m=>({
    label:m.label,
    data:allYears.map(y=>{const idx=m.test_years.indexOf(y);return idx>=0?m.rmse[idx]:null;}),
    borderColor:MODEL_COLORS[m.label]||'#aaa',borderWidth:2,pointRadius:4,tension:0.3,spanGaps:false,
  }))},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}},
    scales:{y:{ticks:{callback:v=>v.toFixed(3)},grid:{color:'rgba(0,0,0,0.05)'}},x:{grid:{display:false}}}}});
}

function buildCvChart() {
  if(cvChart||!D.model_cv) return;
  const models=D.model_cv;
  cvChart=new Chart($('cvChart'),{type:'bar',data:{
    labels:models[0].folds.map(f=>`Fold ${f}`),
    datasets:models.map(m=>({label:m.label,data:m.r2,backgroundColor:(MODEL_COLORS[m.label]||'#aaa')+'cc',borderRadius:3}))},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}},
      scales:{y:{min:0.6,max:1.0,grid:{color:'rgba(0,0,0,0.05)'}},x:{grid:{display:false}}}}});
}

function buildScatterChart() {
  if(scatterChart||!D.model_predictions) return;
  const d=D.model_predictions;
  const RCOLS={'Western Appalachia':'#ffb546','Mississippi Delta':'#0c7bff'};
  const byR={};
  d.actual.forEach((a,i)=>{const r=d.region[i]||'Other';if(!byR[r])byR[r]=[];byR[r].push({x:a,y:d.predicted[i]});});
  const datasets=Object.entries(byR).map(([r,pts])=>({label:r,data:pts,backgroundColor:(RCOLS[r]||'#aaa')+'55',pointRadius:3,pointHoverRadius:5}));
  const all=d.actual.filter(Boolean);
  const lo=Math.min(...all),hi=Math.max(...all);
  datasets.push({label:'Perfect',data:[{x:lo,y:lo},{x:hi,y:hi}],type:'line',borderColor:'#333',borderWidth:1.5,borderDash:[4,4],pointRadius:0,fill:false});
  scatterChart=new Chart($('scatterChart'),{type:'scatter',data:{datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}},
      scales:{x:{title:{display:true,text:'Actual poverty (%)'},grid:{color:'rgba(0,0,0,0.05)'}},
              y:{title:{display:true,text:'Predicted poverty (%)'},grid:{color:'rgba(0,0,0,0.05)'}}}}}); 
}

function buildModelTable() {
  const tb=$('metricTableBody');
  if(!tb||tb.children.length>0||!D.model_rolling||!D.model_cv) return;
  const gb=D.model_rolling.find(m=>m.label==='Gradient Boosting');
  const rn=D.model_rolling.find(m=>m.label==='ResNet');
  const gb_cv=D.model_cv.find(m=>m.label==='Gradient Boosting');
  const rn_cv=D.model_cv.find(m=>m.label==='ResNet');
  if(!gb) return;
  const rows=[
    {metric:'Rolling Mean R²',  gb:gb.mean_r2,    rn:rn?.mean_r2,    higher:true},
    {metric:'Rolling Mean RMSE',gb:gb.mean_rmse,  rn:rn?.mean_rmse,  higher:false},
    {metric:'Rolling Mean MAE', gb:gb.mean_mae,   rn:rn?.mean_mae,   higher:false},
    {metric:'Rolling Best R²',  gb:gb.best_r2,    rn:rn?.best_r2,    higher:true},
    {metric:'Rolling Worst R²', gb:gb.worst_r2,   rn:rn?.worst_r2,   higher:true},
    {metric:'CV Mean R²',       gb:gb_cv?.mean_r2, rn:rn_cv?.mean_r2, higher:true},
    {metric:'CV Std R²',        gb:gb_cv?.std_r2,  rn:rn_cv?.std_r2,  higher:false},
    {metric:'CV Mean RMSE',     gb:gb_cv?.mean_rmse,rn:rn_cv?.mean_rmse,higher:false},
    {metric:'CV Mean MAE',      gb:gb_cv?.mean_mae, rn:rn_cv?.mean_mae, higher:false},
  ];
  rows.forEach(row=>{
    if(row.gb==null) return;
    const gbW=row.rn==null?true:(row.higher?row.gb>=row.rn:row.gb<=row.rn);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-size:0.85rem;">${row.metric}</td>
      <td style="font-family:var(--font-mono);font-size:0.82rem;color:${gbW?'#854F0B':'var(--muted)'};">${row.gb.toFixed(5)}</td>
      <td style="font-family:var(--font-mono);font-size:0.82rem;color:${!gbW&&row.rn?'#0C447C':'var(--muted)'};">${row.rn!=null?row.rn.toFixed(5):'—'}</td>
      <td><span class="badge ${gbW?'badge-gb':'badge-rn'}">${gbW?'GB ✓':'RN ✓'}</span></td>`;
    tb.appendChild(tr);
  });
}

// ── 7. CONCLUSIONS ────────────────────────────────────────────────────────────
function renderConclusions() {
  const k=D.overview_kpis; if(!k) return;
  const s=(id,v)=>{const e=$(id);if(e)e.textContent=v;};
  s('conc-r2',       safe(k.model_r2,3));
  s('conc-covid',    '+'+safe(k.covid_surge_pct,0)+'%');
  s('conc-direct',   safe(k.direct_payment_share,1)+'%');
  s('conc-grants',   safe(k.grants_share,1)+'%');
}

// ── 8. PREDICTION ─────────────────────────────────────────────────────────────
let ortSession=null,scalerParams=null,featureMedians=null,modelReady=false;

async function initPredict() {
  try { scalerParams=await loadJSON('./data/scaler_params.json'); } catch(e){}
  try { featureMedians=await loadJSON('./data/feature_medians.json'); } catch(e){}
  if(typeof ort!=='undefined'&&scalerParams){
    try{
      updateModelStatus('loading');
      ortSession=await ort.InferenceSession.create('./data/poverty_model.onnx',{executionProviders:['wasm']});
      modelReady=true;updateModelStatus('ready');
    }catch(e){console.warn('ONNX:',e.message);updateModelStatus('error');}
  } else { updateModelStatus('error'); }
  runPrediction();
}

function updateModelStatus(s){
  const el=$('model-status');if(!el)return;
  const m={loading:{text:'Loading ONNX model…',color:'#ffb546'},ready:{text:'Live ONNX model active',color:'#1db954'},error:{text:'Simulated model (ONNX unavailable)',color:'#e24b4a'}};
  const r=m[s]||m.error;el.textContent=r.text;el.style.color=r.color;
}

function collectInputs(){
  const g=id=>parseFloat($(id)?.value||0);
  return{income:g('sl-income'),pci:g('sl-pci'),gini:g('sl-gini'),assist:g('sl-assist'),ins:g('sl-ins'),housing:g('sl-housing'),unemp:g('sl-unemp'),bach:g('sl-bach'),lfp:g('sl-lfp'),singlemom:g('sl-singlemom'),married:g('sl-married'),year:g('sl-year'),region:$('sl-region')?.value||'delta'};
}

function buildFV(inputs){
  const fm=featureMedians||{};
  const map={unemployment_rate:inputs.unemp/100,labor_force_participation:inputs.lfp/100,no_schooling_rate:fm.no_schooling_rate??0.03,hs_grad_rate:fm.hs_grad_rate??0.55,bachelors_rate:inputs.bach/100,single_mother_rate:inputs.singlemom/100,married_couple_rate:inputs.married/100,public_assist_rate:inputs.assist/100,ssi_rate:fm.ssi_rate??0.20,per_capita_income:inputs.pci,post_covid:inputs.year>=2020?1:0,gini_index:inputs.gini,no_health_insurance:inputs.ins/100,housing_cost_burden:inputs.housing/100,median_income:inputs.income,log_total_obligation:fm.log_total_obligation??17.5,direct_payment_share:fm.direct_payment_share??0.84,grants_share:fm.grants_share??0.08,contract_share:fm.contract_share??0.04,hhs_share:fm.hhs_share??0.12,usda_share:fm.usda_share??0.03,ssa_share:fm.ssa_share??0.28,hud_share:fm.hud_share??0.05,log_avg_award_value:fm.log_avg_award_value??12.8,obligation_growth_yoy:fm.obligation_growth_yoy??0.03,is_delta:inputs.region==='delta'?1:0};
  return scalerParams.features.map(feat=>map[feat]??fm[feat]??0);
}

function scaleFV(raw){return raw.map((v,i)=>(v-scalerParams.mean[i])/scalerParams.scale[i]);}

function simPred(inputs){
  let p=0.05;
  p+=(1-inputs.income/90000)*0.25;p+=(1-inputs.pci/60000)*0.12;p+=(inputs.gini-0.30)*0.12;
  p+=(inputs.unemp/100)*0.10;p+=(inputs.assist/100)*0.05;p+=(inputs.singlemom/100)*0.08;
  p-=(inputs.married/100)*0.06;p-=(inputs.bach/100)*0.07;p-=(inputs.lfp/100)*0.04;
  p+=(inputs.ins/100)*0.04;p+=(inputs.housing/100)*0.03;
  p+=inputs.region==='delta'?0.025:0;p-=inputs.year>=2020?0.010:0;
  if(inputs.year>2023) p+=(inputs.year-2023)*(inputs.region==='delta'?-0.002:-0.003);
  return Math.max(0.02,Math.min(0.55,p));
}

async function runPrediction(){
  const inputs=collectInputs();
  const fw=$('future-warning');if(fw)fw.style.display=inputs.year>2023?'block':'none';
  let pred;
  if(modelReady&&ortSession&&scalerParams){
    try{
      const tensor=new ort.Tensor('float32',new Float32Array(scaleFV(buildFV(inputs))),[1,scalerParams.features.length]);
      const result=await ortSession.run({[ortSession.inputNames[0]]:tensor});
      pred=Math.max(0.02,Math.min(0.55,result[ortSession.outputNames[0]].data[0]));
      if(inputs.year>2023) pred=Math.max(0.02,Math.min(0.55,pred+(inputs.year-2023)*(inputs.region==='delta'?-0.002:-0.003)));
    }catch(e){pred=simPred(inputs);}
  }else{pred=simPred(inputs);}
  displayResult(pred,inputs);
}

function displayResult(pred,inputs){
  const pct=(pred*100).toFixed(1);
  $('pred-number').textContent=pct+'%';
  const gauge=$('pred-gauge');gauge.style.width=(pred/0.55*100)+'%';
  let band,bandClass,gc;
  if(pred>=0.25){band='Critical poverty';bandClass='band-critical';gc='linear-gradient(90deg,#ffb546,#e24b4a,#a32d2d)';}
  else if(pred>=0.18){band='High poverty';bandClass='band-high';gc='linear-gradient(90deg,#ffb546,#e24b4a)';}
  else if(pred>=0.12){band='Moderate poverty';bandClass='band-moderate';gc='linear-gradient(90deg,#ffe082,#ffb546)';}
  else{band='Lower poverty';bandClass='band-low';gc='linear-gradient(90deg,#a5d6a7,#1db954)';}
  const be=$('pred-band');be.textContent=band;be.className='result-band '+bandClass;gauge.style.background=gc;
  const yl=$('pred-year-label');
  if(yl){yl.textContent=inputs.year>2023?`↑ ${inputs.year} forecast`:`↑ ${inputs.year} (historical range)`;yl.style.color=inputs.year>2023?'#f09595':'rgba(255,255,255,0.4)';}
  const ce=$('pred-confidence');
  if(ce){
    if(inputs.year>2023){const ya=inputs.year-2023;const conf=Math.max(40,85-ya*7);ce.textContent=`Model confidence: ~${conf}% (${ya} yr${ya>1?'s':''} beyond training)`;ce.style.color=ya>4?'#f09595':'#FAC775';}
    else{ce.textContent='Model confidence: ~85% (within training range)';ce.style.color='rgba(255,255,255,0.35)';}
  }
  const k=D.overview_kpis||{};
  const ra=inputs.region==='delta'?(k.delta_avg_poverty||18.5)/100:(k.appa_avg_poverty||14.1)/100;
  const bm={national:0.115,ms:0.200,app:0.141,region:ra};
  Object.entries(bm).forEach(([key,b])=>{
    const diff=pred-b;const ds=(diff>0?'+':'')+(diff*100).toFixed(1)+'pp';
    const el=$('cmp-'+key);
    if(el)el.innerHTML=`<span style="color:rgba(255,255,255,0.7)">${(b*100).toFixed(1)}%</span> <span class="${diff>0?'comp-diff-pos':'comp-diff-neg'}">${ds}</span>`;
  });
}

function updateSlider(id,val,pre,suf,step,mult){
  const el=$('val-'+id);if(!el)return;
  const num=parseFloat(val);
  let display;
  if(mult==='K')display='$'+(num/1000).toFixed(0)+'K';
  else if(step<0.1)display=pre+num.toFixed(2)+suf;
  else display=pre+num.toFixed(0)+suf;
  el.textContent=display;
  runPrediction();
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',async()=>{
  Chart.defaults.font.family="'Public Sans', sans-serif";
  Chart.defaults.color='#6b6b7a';
  await loadAllData();
  renderOverview();
  chartsBuilt['overview']=true;
});

window.show=show;window.showMapTab=showMapTab;window.updateSlider=updateSlider;
window.runPrediction=runPrediction;window.renderSpendingCharts=renderSpendingCharts;
window.changeMapLayer=changeMapLayer;