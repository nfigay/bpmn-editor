// ── w2ui ─────────────────────────────────────────────────────────────────────
import { w2layout, w2tabs, w2popup } from 'w2ui/w2ui-2.0.es6.js'
import 'w2ui/w2ui-2.0.min.css'

// ── bpmn-js ───────────────────────────────────────────────────────────────────
import BpmnModeler from 'bpmn-js/lib/Modeler'
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import '@bpmn-io/properties-panel/assets/properties-panel.css'

// ── SemArch ───────────────────────────────────────────────────────────────────
import semarchModdle  from './extensions/semarch.json'
import cocRegistry    from './extensions/coc-registry.json'
import { SemArchLinter } from './linting/semarch-linter.js'

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT DIAGRAM
// ════════════════════════════════════════════════════════════════════════════
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:semarch="http://semarch.io/schema/1.0"
  targetNamespace="http://semarch.io/repository"
  id="Definitions_Repository">
  <bpmn:extensionElements>
    <semarch:BusinessContext
      systemType="CoC" systemName="" owner=""
      organization="" normativeRefs="" programs="" communities=""/>
    <semarch:RepositoryLifecycle
      version="1.0" status="Draft" maturity="L1"
      lastReview="" reviewCycle="Annual" governedBy=""/>
  </bpmn:extensionElements>
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_A" name="System A" processRef="Process_A"/>
    <bpmn:participant id="Participant_B" name="System B" processRef="Process_B"/>
  </bpmn:collaboration>
  <bpmn:process id="Process_A" isExecutable="true">
    <bpmn:startEvent id="Process_A_Start" name="Start"/>
  </bpmn:process>
  <bpmn:process id="Process_B" isExecutable="false">
    <bpmn:startEvent id="Process_B_Start" name="Start"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Collaboration">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_A_di" bpmnElement="Participant_A" isHorizontal="true">
        <dc:Bounds x="120" y="80" width="600" height="160"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Process_A_Start_di" bpmnElement="Process_A_Start">
        <dc:Bounds x="200" y="142" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Participant_B_di" bpmnElement="Participant_B" isHorizontal="true">
        <dc:Bounds x="120" y="280" width="600" height="160"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Process_B_Start_di" bpmnElement="Process_B_Start">
        <dc:Bounds x="200" y="342" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

// ════════════════════════════════════════════════════════════════════════════
// CSS shared styles (injected once)
// ════════════════════════════════════════════════════════════════════════════
const style = document.createElement('style')
style.textContent = `
  .tb-btn {
    background:transparent; color:rgba(255,255,255,.85); border:none;
    padding:4px 10px; font-size:12px; font-family:'DM Sans',sans-serif;
    cursor:pointer; height:45px; border-radius:3px; white-space:nowrap;
    transition:background .15s;
  }
  .tb-btn:hover { background:rgba(255,255,255,.12); color:#fff; }
  .tb-btn-accent { border:1px solid rgba(255,255,255,.25); color:#fff; }
  .tb-btn-accent:hover { background:rgba(255,255,255,.18); }
  .tb-btn-active { background:rgba(255,255,255,.18) !important; color:#fff !important; }

  #bpmn-canvas { width:100%; height:100%; }
  #bpmn-props  { height:100%; overflow-y:auto; }
  .bio-properties-panel { height:100%; }
  .djs-palette-entries  { overflow-y:auto; }
  .djs-palette .djs-palette-toggle { display:none; }

  /* Repository panel */
  .repo-panel { height:100%; display:flex; flex-direction:column;
    font-family:'DM Sans',sans-serif; font-size:12px; background:#fff; }
  .repo-tabs  { display:flex; border-bottom:2px solid #D4DCE6;
    background:#F4F6F9; flex-shrink:0; }
  .repo-tab   { padding:7px 14px; cursor:pointer; font-size:11px; font-weight:600;
    color:#8A9BB0; border:none; background:none; letter-spacing:.04em;
    text-transform:uppercase; border-bottom:2px solid transparent;
    margin-bottom:-2px; transition:color .15s; }
  .repo-tab:hover { color:#2E6DA4; }
  .repo-tab.active { color:#1E3A5F; border-bottom-color:#2E6DA4; }
  .repo-body  { flex:1; overflow-y:auto; padding:12px 14px; }

  /* Form elements inside repository panel */
  .repo-field { margin-bottom:10px; }
  .repo-label { display:block; font-size:10px; font-weight:600; color:#4A6580;
    text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
  .repo-input, .repo-select, .repo-textarea {
    width:100%; padding:5px 7px; border:1px solid #D4DCE6; border-radius:3px;
    font-size:12px; font-family:'DM Sans',sans-serif; background:#fff;
    color:#1A2535; box-sizing:border-box; transition:border-color .15s;
  }
  .repo-input:focus, .repo-select:focus, .repo-textarea:focus {
    outline:none; border-color:#2E6DA4;
  }
  .repo-textarea { resize:vertical; min-height:48px; }

  /* Application system card */
  .appsys-card { background:#F4F6F9; border:1px solid #D4DCE6; border-radius:4px;
    padding:8px 10px; margin-bottom:8px; position:relative; }
  .appsys-card-title { font-weight:600; color:#1E3A5F; font-size:12px; margin-bottom:4px; }
  .appsys-card-sub   { font-size:11px; color:#5A6B80; }
  .appsys-card-del   { position:absolute; top:6px; right:8px; cursor:pointer;
    color:#C47A7A; font-size:14px; font-weight:700; line-height:1; }
  .appsys-card-del:hover { color:#B84040; }

  /* Tech realization row */
  .tech-row { display:flex; align-items:center; gap:6px; margin-bottom:7px;
    padding:6px 8px; background:#F4F6F9; border:1px solid #D4DCE6;
    border-radius:3px; }
  .tech-row-label { font-size:11px; color:#4A6580; min-width:130px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tech-row input { flex:1; min-width:0; padding:3px 6px; border:1px solid #D4DCE6;
    border-radius:3px; font-size:11px; font-family:'DM Sans',sans-serif;
    background:#fff; }
  .tech-row input:focus { outline:none; border-color:#2E6DA4; }

  /* Section header inside panel */
  .repo-section { font-size:10px; font-weight:700; color:#2E6DA4;
    text-transform:uppercase; letter-spacing:.08em;
    border-bottom:1px solid #D4DCE6; padding-bottom:4px; margin:12px 0 8px; }
  .repo-section:first-child { margin-top:0; }

  /* Save button */
  .repo-save-btn { width:100%; padding:7px; background:#1E3A5F; color:#fff;
    border:none; border-radius:4px; font-size:12px; font-weight:600;
    font-family:'DM Sans',sans-serif; cursor:pointer; margin-top:8px;
    letter-spacing:.04em; transition:background .15s; }
  .repo-save-btn:hover { background:#2E6DA4; }

  /* Maturity badge */
  .maturity-badge { display:inline-block; padding:2px 8px; border-radius:20px;
    font-size:10px; font-weight:700; letter-spacing:.06em; font-family:monospace; }
  .mat-L1 { background:#E8ECF0; color:#5A6B80; }
  .mat-L2 { background:#C8DFD8; color:#1A5040; }
  .mat-L3 { background:#C0D4E8; color:#1A3A5A; }
  .mat-L4 { background:#E0D4B0; color:#5A3A10; }

  /* Add button */
  .repo-add-btn { display:inline-flex; align-items:center; gap:4px;
    padding:4px 10px; background:#EEF4FB; border:1px solid #A8C0D8;
    border-radius:3px; color:#2E6DA4; font-size:11px; font-weight:600;
    cursor:pointer; font-family:'DM Sans',sans-serif; }
  .repo-add-btn:hover { background:#D8EAF8; }

  /* Hint text */
  .repo-hint { font-size:10px; color:#8A9BB0; font-style:italic;
    line-height:1.4; margin-top:3px; }
`
document.head.appendChild(style)

// ════════════════════════════════════════════════════════════════════════════
// 1. LAYOUT — 5 panels
// ════════════════════════════════════════════════════════════════════════════
const layout = new w2layout({
  box: '#app',
  name: 'main-layout',
  panels: [
    { type: 'top',    size: 45, resizable: false,
      style: 'overflow:hidden;padding:0;background:#1E3A5F;' },
    { type: 'left',   size: 50, resizable: false,
      style: 'background:#F4F6F9;border-right:1px solid #D4DCE6;overflow:hidden;padding:0;' },
    { type: 'main',   style: 'background:#fff;overflow:hidden;' },
    { type: 'right',  size: 340, resizable: true,
      style: 'background:#fff;border-left:1px solid #D4DCE6;overflow:hidden;' },
    { type: 'bottom', size: 130, resizable: true,
      style: 'background:#F4F6F9;border-top:1px solid #D4DCE6;overflow:hidden;' }
  ]
})

// ════════════════════════════════════════════════════════════════════════════
// 2. TOOLBAR
// ════════════════════════════════════════════════════════════════════════════
layout.el('top').innerHTML = `
  <div style="display:flex;align-items:center;height:45px;padding:0 10px;gap:2px;">
    <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;
      letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:0 12px;
      white-space:nowrap;">Semantic Process Mediator</span>
    <span style="width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 4px;"></span>
    <button class="tb-btn" id="btn-new">New</button>
    <button class="tb-btn" id="btn-import">Import…</button>
    <span style="width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 4px;"></span>
    <button class="tb-btn" id="btn-export-xml">Export XML</button>
    <button class="tb-btn" id="btn-export-svg">Export SVG</button>
    <span style="width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 4px;"></span>
    <button class="tb-btn" id="btn-fit">Fit</button>
    <span style="width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 4px;"></span>
    <button class="tb-btn tb-btn-accent tb-btn-active" id="btn-repo">⊞ Repository</button>
    <button class="tb-btn" id="btn-props">⊟ Properties</button>
    <button class="tb-btn" id="btn-lint">⚡ Lint</button>
    <span style="flex:1"></span>
    <span id="lint-badge" style="display:none;font-family:monospace;font-size:11px;
      background:rgba(255,255,255,.12);color:#fff;padding:2px 10px;border-radius:20px;
      white-space:nowrap;"></span>
  </div>`

// ════════════════════════════════════════════════════════════════════════════
// 3. CONTAINERS
// ════════════════════════════════════════════════════════════════════════════
layout.el('main').innerHTML  = '<div id="bpmn-canvas" style="width:100%;height:100%;"></div>'

// Right panel — Repository view (default) + Properties view (switchable)
layout.el('right').innerHTML = `
  <div id="panel-repo"  style="height:100%;display:block;"></div>
  <div id="panel-props" style="height:100%;display:none;">
    <div id="bpmn-props" style="height:100%;"></div>
  </div>`

layout.el('bottom').innerHTML = `
  <div id="lint-panel" style="height:100%;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;padding:4px 12px;
      background:#EDF0F5;border-bottom:1px solid #D4DCE6;gap:8px;flex-shrink:0;">
      <span style="font-family:monospace;font-size:10px;font-weight:600;
        color:#4A6580;letter-spacing:.08em;text-transform:uppercase;">Linting</span>
      <span id="lint-summary" style="font-family:monospace;font-size:10px;color:#8A9BB0;"></span>
    </div>
    <div id="lint-results" style="flex:1;overflow-y:auto;padding:4px 0;"></div>
  </div>`

// ════════════════════════════════════════════════════════════════════════════
// 4. BPMN MODELER
// ════════════════════════════════════════════════════════════════════════════
const modeler = new BpmnModeler({
  container: '#bpmn-canvas',
  propertiesPanel: { parent: '#bpmn-props' },
  additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
  moddleExtensions: { semarch: semarchModdle }
})

// ════════════════════════════════════════════════════════════════════════════
// 5. LINTER
// ════════════════════════════════════════════════════════════════════════════
const linter = new SemArchLinter(modeler, renderLintResults)
linter.setProfile('L2')

function renderLintResults(issues) {
  const container = document.getElementById('lint-results')
  const summary   = document.getElementById('lint-summary')
  const badge     = document.getElementById('lint-badge')
  if (!container) return

  const errors   = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const infos    = issues.filter(i => i.severity === 'info').length

  if (issues.length === 0) {
    badge.style.display = 'none'
    summary.textContent = 'No issues'
    container.innerHTML = `<div style="padding:8px 14px;font-family:monospace;
      font-size:11px;color:#6BAF92;">✓ All rules passed</div>`
    return
  }

  const parts = []
  if (errors)   parts.push(`${errors}E`)
  if (warnings) parts.push(`${warnings}W`)
  if (infos)    parts.push(`${infos}I`)
  badge.style.display = ''
  badge.textContent   = parts.join(' · ')
  summary.textContent = `${issues.length} issue${issues.length > 1 ? 's' : ''}`

  const sev = {
    error:   { dot: '#B84040', bg: '#FBF3F3', text: '#7A2020' },
    warning: { dot: '#C47A2B', bg: '#FBF6F0', text: '#6A4010' },
    info:    { dot: '#2E6DA4', bg: '#EEF4FB', text: '#1A3A5A' }
  }
  container.innerHTML = issues.map(issue => {
    const c    = sev[issue.severity] || sev.info
    const name = issue.element.businessObject?.name ? ` — ${issue.element.businessObject.name}` : ''
    return `<div class="lint-row" data-element-id="${issue.element.id}"
      style="display:flex;align-items:flex-start;gap:8px;padding:3px 12px;
        cursor:pointer;border-bottom:1px solid #EDF0F5;"
      onmouseover="this.style.background='${c.bg}'" onmouseout="this.style.background=''">
      <span style="width:6px;height:6px;border-radius:50%;background:${c.dot};
        flex-shrink:0;margin-top:4px;"></span>
      <div style="min-width:0;">
        <span style="font-family:monospace;font-size:10px;color:#8A9BB0;">${issue.rule}</span>
        <span style="font-family:monospace;font-size:10px;font-weight:600;
          color:${c.text};margin-left:6px;">${issue.element.id}${name}</span>
        <div style="font-size:11px;color:#4A6580;line-height:1.35;">${issue.message}</div>
      </div>
    </div>`
  }).join('')

  container.querySelectorAll('.lint-row').forEach(row => {
    row.addEventListener('click', () => {
      const el = modeler.get('elementRegistry').get(row.dataset.elementId)
      if (el) { modeler.get('selection').select(el); modeler.get('canvas').scrollToElement(el) }
    })
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 6. DEFINITIONS ACCESS
// ════════════════════════════════════════════════════════════════════════════
function getDefinitions() {
  try {
    let bo = modeler.get('canvas').getRootElement().businessObject
    while (bo.$parent) bo = bo.$parent
    return bo
  } catch { return null }
}

function getExtValue(type) {
  const defs = getDefinitions()
  return defs?.extensionElements?.values?.find(v => v.$type === type) || {}
}

function setExtValue(type, attrs) {
  const moddle = modeler.get('moddle')
  const defs   = getDefinitions()
  if (!defs) return

  if (!defs.extensionElements) {
    defs.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
    defs.extensionElements.$parent = defs
  }
  if (!Array.isArray(defs.extensionElements.values)) defs.extensionElements.values = []

  defs.extensionElements.values = defs.extensionElements.values.filter(v => v.$type !== type)
  const el = moddle.create(type, attrs)
  el.$parent = defs.extensionElements
  defs.extensionElements.values.push(el)
}

// ApplicationSystem: multiple instances — handled as JSON in a single attribute
// stored as semarch:ApplicationSystem entries on extensionElements
function getAppSystems() {
  const defs = getDefinitions()
  if (!defs?.extensionElements?.values) return []
  return defs.extensionElements.values.filter(v => v.$type === 'semarch:ApplicationSystem')
}

function setAppSystems(systems) {
  const moddle = modeler.get('moddle')
  const defs   = getDefinitions()
  if (!defs) return

  if (!defs.extensionElements) {
    defs.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
    defs.extensionElements.$parent = defs
  }
  // Remove existing ApplicationSystem + TechnicalRealization entries
  defs.extensionElements.values = (defs.extensionElements.values || [])
    .filter(v => v.$type !== 'semarch:ApplicationSystem' && v.$type !== 'semarch:TechnicalRealization')

  systems.forEach(sys => {
    const el = moddle.create('semarch:ApplicationSystem', {
      id: sys.id, name: sys.name, purpose: sys.purpose, interfaces: sys.interfaces || ''
    })
    el.$parent = defs.extensionElements
    defs.extensionElements.values.push(el)

    if (sys.realization?.softwareProduct) {
      const tech = moddle.create('semarch:TechnicalRealization', {
        applicationSystemId: sys.id,
        softwareProduct:  sys.realization.softwareProduct  || '',
        productVersion:   sys.realization.productVersion   || '',
        nativeFormat:     sys.realization.nativeFormat     || '',
        exchangeFormat:   sys.realization.exchangeFormat   || 'BPMN 2.0 XML',
        idScheme:         sys.realization.idScheme         || '',
        url:              sys.realization.url              || ''
      })
      tech.$parent = defs.extensionElements
      defs.extensionElements.values.push(tech)
    }
  })
}

function getTechRealization(appSysId) {
  const defs = getDefinitions()
  if (!defs?.extensionElements?.values) return {}
  return defs.extensionElements.values
    .find(v => v.$type === 'semarch:TechnicalRealization' && v.applicationSystemId === appSysId) || {}
}

// ════════════════════════════════════════════════════════════════════════════
// 7. REPOSITORY PANEL — three tabs
// ════════════════════════════════════════════════════════════════════════════
let _activeTab = 'business'
// In-memory app systems state (synced to model on save)
let _appSystems = []

function buildField(id, label, value = '', placeholder = '', type = 'input', hint = '') {
  const inner = type === 'textarea'
    ? `<textarea class="repo-textarea" id="${id}" placeholder="${placeholder}">${value}</textarea>`
    : type === 'select'
    ? `<select class="repo-select" id="${id}">${value}</select>`
    : `<input class="repo-input" type="text" id="${id}" placeholder="${placeholder}" value="${value}"/>`
  return `<div class="repo-field">
    <label class="repo-label" for="${id}">${label}</label>
    ${inner}
    ${hint ? `<div class="repo-hint">${hint}</div>` : ''}
  </div>`
}

function buildBusinessTab() {
  const b  = getExtValue('semarch:BusinessContext')
  const lc = getExtValue('semarch:RepositoryLifecycle')

  const typeOptions = ['BMS', 'CoC', 'Programme', 'Activite'].map(t =>
    `<option value="${t}" ${b.systemType === t ? 'selected' : ''}>${t}</option>`
  ).join('')

  const statusOptions = ['Draft', 'Active', 'Archived', 'Deprecated'].map(s =>
    `<option value="${s}" ${lc.status === s ? 'selected' : ''}>${s}</option>`
  ).join('')

  const maturityOptions = ['L1 — Drawing', 'L2 — Modelling', 'L3 — Executable', 'L4 — Simulation']
    .map((m, i) => {
      const v = `L${i + 1}`
      return `<option value="${v}" ${lc.maturity === v ? 'selected' : ''}>${m}</option>`
    }).join('')

  return `
    <div class="repo-section">Applicative System</div>
    ${buildField('b-systemType', 'System Type',
      `<option value="">— select —</option>${typeOptions}`, '', 'select',
      'BMS = enterprise-wide · CoC = community of practice · Programme = multi-enterprise')}
    ${buildField('b-systemName', 'System Name', b.systemName || '', 'CoC Avionics Process Repository',
      'input', 'Name the applicative system — not the software product that realises it')}
    ${buildField('b-owner', 'Owner', b.owner || '', 'CoC Avionics')}
    ${buildField('b-organization', 'Organisation', b.organization || '', 'Airbus Defence and Space')}

    <div class="repo-section">Normative Framework</div>
    ${buildField('b-normativeRefs', 'Normative References', b.normativeRefs || '',
      'DO-178C  DO-254  ARP-4754A', 'input', 'Space-separated — e.g. DO-178C ECSS-Q-ST-80 ISO-9001')}
    ${buildField('b-governanceFramework', 'Governance Framework', b.governanceFramework || '',
      'EN 9100 / ISO 9001')}
    ${buildField('b-programs', 'Programmes', b.programs || '',
      'A400M  EURODRONE', 'input', 'Space-separated programme identifiers')}
    ${buildField('b-communities', 'Communities', b.communities || '',
      'MIWG  ASD-SSG  AFIS', 'input', 'External communities this repository contributes to')}

    <div class="repo-section">Lifecycle</div>
    ${buildField('b-maturity', 'Maturity Level',
      `<option value="">— select —</option>${maturityOptions}`, '', 'select')}
    ${buildField('b-status', 'Status',
      `<option value="">— select —</option>${statusOptions}`, '', 'select')}
    ${buildField('b-version', 'Version', lc.version || '1.0', '1.0')}
    ${buildField('b-lastReview', 'Last Review', lc.lastReview || '', 'YYYY-MM-DD')}
    ${buildField('b-reviewCycle', 'Review Cycle', lc.reviewCycle || 'Annual', 'Annual')}
    ${buildField('b-governedBy', 'Governed By', lc.governedBy || '', 'CoC Process Owner')}
  `
}

function buildAppSystemsTab() {
  const cards = _appSystems.map((sys, i) => {
    const tech = sys.realization || {}
    return `
      <div class="appsys-card" data-idx="${i}">
        <span class="appsys-card-del" onclick="window._repoDelAppSys(${i})">×</span>
        <div class="appsys-card-title">${sys.name || '—'}</div>
        <div class="appsys-card-sub">${sys.purpose || ''}</div>
        ${tech.softwareProduct
          ? `<div style="margin-top:4px;font-size:10px;color:#8A9BB0;font-family:monospace;">
              → ${tech.softwareProduct}${tech.productVersion ? ' ' + tech.productVersion : ''}
              &nbsp;·&nbsp;${tech.exchangeFormat || ''}
             </div>`
          : ''}
        <button class="repo-add-btn" style="margin-top:6px;font-size:10px;"
          onclick="window._repoEditAppSys(${i})">✎ Edit</button>
      </div>`
  }).join('')

  return `
    <div class="repo-section">Application Systems</div>
    <div class="repo-hint" style="margin-bottom:8px;">
      Applicative systems this repository interacts with.
      Each system is realised by a software product (defined in the Technical tab).
    </div>
    ${cards}
    <button class="repo-add-btn" onclick="window._repoAddAppSys()">+ Add application system</button>

    <div class="repo-section" style="margin-top:16px;">Interfaces</div>
    <div id="interfaces-summary" style="font-size:11px;color:#5A6B80;line-height:1.6;">
      ${_appSystems.map(s =>
        s.interfaces ? `<b>${s.name}</b> → ${s.interfaces.split(' ').join(', ')}` : ''
      ).filter(Boolean).join('<br>') || '<span style="color:#8A9BB0;">No interfaces defined yet.</span>'}
    </div>
  `
}

function buildTechTab() {
  if (_appSystems.length === 0) {
    return `<div class="repo-section">Technical Realizations</div>
      <div class="repo-hint">Add application systems first (Application tab)
        to define their technical realization here.</div>`
  }

  const rows = _appSystems.map(sys => {
    const tech = sys.realization || {}
    return `
      <div style="margin-bottom:12px;padding:8px 10px;background:#F4F6F9;
        border:1px solid #D4DCE6;border-radius:4px;">
        <div style="font-weight:600;color:#1E3A5F;font-size:12px;margin-bottom:6px;">
          ${sys.name}
          <span style="font-weight:400;font-size:10px;color:#8A9BB0;margin-left:6px;">
            (${sys.id || '—'})
          </span>
        </div>
        <div class="tech-row">
          <span class="tech-row-label">Software product</span>
          <input type="text" placeholder="ARIS / Sparx EA / Confluence…"
            data-sysid="${sys.id}" data-field="softwareProduct"
            value="${tech.softwareProduct || ''}" onchange="window._techFieldChange(this)"/>
        </div>
        <div class="tech-row">
          <span class="tech-row-label">Version</span>
          <input type="text" placeholder="16.x"
            data-sysid="${sys.id}" data-field="productVersion"
            value="${tech.productVersion || ''}" onchange="window._techFieldChange(this)"/>
        </div>
        <div class="tech-row">
          <span class="tech-row-label">Native format</span>
          <input type="text" placeholder="XMI / AML / AP242…"
            data-sysid="${sys.id}" data-field="nativeFormat"
            value="${tech.nativeFormat || ''}" onchange="window._techFieldChange(this)"/>
        </div>
        <div class="tech-row">
          <span class="tech-row-label">Exchange format</span>
          <input type="text" placeholder="BPMN 2.0 XML"
            data-sysid="${sys.id}" data-field="exchangeFormat"
            value="${tech.exchangeFormat || 'BPMN 2.0 XML'}" onchange="window._techFieldChange(this)"/>
        </div>
        <div class="tech-row">
          <span class="tech-row-label">ID scheme</span>
          <input type="text" placeholder="EA_GUID / ARIS_ID / semarch-id"
            data-sysid="${sys.id}" data-field="idScheme"
            value="${tech.idScheme || ''}" onchange="window._techFieldChange(this)"/>
        </div>
        <div class="tech-row">
          <span class="tech-row-label">URL</span>
          <input type="text" placeholder="tool.internal/path"
            data-sysid="${sys.id}" data-field="url"
            value="${tech.url || ''}" onchange="window._techFieldChange(this)"/>
        </div>
      </div>`
  }).join('')

  return `
    <div class="repo-section">Technical Realizations</div>
    <div class="repo-hint" style="margin-bottom:8px;">
      Software products realising each application system.
      This layer can change without impacting the applicative system definition.
    </div>
    ${rows}
  `
}

function buildRepoPanel() {
  const tabs = [
    { id: 'business', label: 'Business' },
    { id: 'appsys',   label: 'App. Systems' },
    { id: 'tech',     label: 'Technical' }
  ].map(t => `<button class="repo-tab ${_activeTab === t.id ? 'active' : ''}"
    onclick="window._repoTab('${t.id}')">${t.label}</button>`).join('')

  let body = ''
  if (_activeTab === 'business') body = buildBusinessTab()
  if (_activeTab === 'appsys')   body = buildAppSystemsTab()
  if (_activeTab === 'tech')     body = buildTechTab()

  const maturity = getExtValue('semarch:RepositoryLifecycle').maturity || 'L1'

  return `
    <div class="repo-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:6px 12px;background:#1E3A5F;flex-shrink:0;">
        <span style="font-family:monospace;font-size:10px;font-weight:600;
          color:#A8C4DC;letter-spacing:.08em;text-transform:uppercase;">Repository</span>
        <span class="maturity-badge mat-${maturity}">${maturity}</span>
      </div>
      <div class="repo-tabs">${tabs}</div>
      <div class="repo-body" id="repo-body-content">${body}</div>
      <div style="padding:8px 14px;border-top:1px solid #D4DCE6;flex-shrink:0;">
        <button class="repo-save-btn" onclick="window._repoSave()">
          ↓ Save to BPMN
        </button>
      </div>
    </div>`
}

function renderRepoPanel() {
  document.getElementById('panel-repo').innerHTML = buildRepoPanel()
}

// ── Tab switch ────────────────────────────────────────────────────────────
window._repoTab = function(id) {
  // Persist current tab values before switching
  if (_activeTab === 'business') _collectBusiness()
  _activeTab = id
  renderRepoPanel()
}

// ── Collect business tab values (without saving to model) ─────────────────
function _collectBusiness() {
  // Just reads the DOM — actual save happens in _repoSave
}

// ── Add / Edit / Delete application system ────────────────────────────────
window._repoAddAppSys = function() {
  openAppSysDialog(null)
}

window._repoEditAppSys = function(idx) {
  openAppSysDialog(idx)
}

window._repoDelAppSys = function(idx) {
  _appSystems.splice(idx, 1)
  renderRepoPanel()
}

window._techFieldChange = function(input) {
  const sysId = input.dataset.sysid
  const field  = input.dataset.field
  const sys    = _appSystems.find(s => s.id === sysId)
  if (!sys) return
  if (!sys.realization) sys.realization = {}
  sys.realization[field] = input.value
}

function openAppSysDialog(idx) {
  const existing = idx !== null ? _appSystems[idx] : null
  const sysIds   = _appSystems.map(s => s.id).join(', ')

  w2popup.open({
    title  : idx !== null ? '✎ Edit Application System' : '+ Add Application System',
    width  : 480,
    height : 400,
    body   : `
      <div style="padding:14px;font-family:'DM Sans',sans-serif;font-size:13px;">
        <div class="repo-field">
          <label class="repo-label">System ID (stable)</label>
          <input class="repo-input" id="as-id" placeholder="AppSys_PLM"
            value="${existing?.id || ''}"/>
          <div class="repo-hint">Unique identifier — used as reference key for Technical Realization</div>
        </div>
        <div class="repo-field">
          <label class="repo-label">System Name</label>
          <input class="repo-input" id="as-name" placeholder="Système PLM"
            value="${existing?.name || ''}"/>
          <div class="repo-hint">Name the applicative system — not the software product</div>
        </div>
        <div class="repo-field">
          <label class="repo-label">Purpose</label>
          <textarea class="repo-textarea" id="as-purpose"
            placeholder="What this system does in the organization">${existing?.purpose || ''}</textarea>
        </div>
        <div class="repo-field">
          <label class="repo-label">Interfaces with (IDs, space-separated)</label>
          <input class="repo-input" id="as-interfaces"
            placeholder="AppSys_ProcessRepository AppSys_DMS"
            value="${existing?.interfaces || ''}"/>
          <div class="repo-hint">Available: ${sysIds || '—'}</div>
        </div>
      </div>`,
    buttons: `
      <button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue"
        onclick="window._repoSaveAppSys(${idx})">Save</button>`
  })
}

window._repoSaveAppSys = function(idx) {
  const sys = {
    id        : document.getElementById('as-id')?.value.trim()         || '',
    name      : document.getElementById('as-name')?.value.trim()       || '',
    purpose   : document.getElementById('as-purpose')?.value.trim()    || '',
    interfaces: document.getElementById('as-interfaces')?.value.trim() || '',
    realization: idx !== null ? (_appSystems[idx]?.realization || {}) : {}
  }
  if (!sys.id || !sys.name) { alert('ID and Name are required.'); return }

  if (idx !== null) {
    _appSystems[idx] = sys
  } else {
    _appSystems.push(sys)
  }
  w2popup.close()
  renderRepoPanel()
}

// ── Save all tabs to BPMN extensionElements ───────────────────────────────
window._repoSave = function() {
  // Business + Lifecycle
  setExtValue('semarch:BusinessContext', {
    systemType         : document.getElementById('b-systemType')?.value         || '',
    systemName         : document.getElementById('b-systemName')?.value         || '',
    owner              : document.getElementById('b-owner')?.value              || '',
    organization       : document.getElementById('b-organization')?.value       || '',
    governanceFramework: document.getElementById('b-governanceFramework')?.value || '',
    normativeRefs      : document.getElementById('b-normativeRefs')?.value      || '',
    programs           : document.getElementById('b-programs')?.value           || '',
    communities        : document.getElementById('b-communities')?.value        || ''
  })

  const maturity = document.getElementById('b-maturity')?.value || 'L1'
  setExtValue('semarch:RepositoryLifecycle', {
    version    : document.getElementById('b-version')?.value     || '1.0',
    status     : document.getElementById('b-status')?.value      || 'Draft',
    maturity,
    lastReview : document.getElementById('b-lastReview')?.value  || '',
    reviewCycle: document.getElementById('b-reviewCycle')?.value || 'Annual',
    governedBy : document.getElementById('b-governedBy')?.value  || ''
  })

  // Application Systems + Technical Realizations
  setAppSystems(_appSystems)

  // Update linter profile
  linter.setProfile(maturity)
  linter.run()

  // Visual feedback
  const btn = document.querySelector('.repo-save-btn')
  if (btn) {
    btn.textContent = '✓ Saved to BPMN'
    btn.style.background = '#2E7D5A'
    setTimeout(() => {
      btn.textContent = '↓ Save to BPMN'
      btn.style.background = ''
      renderRepoPanel()
    }, 1500)
  }
}

// ── Load app systems from model into _appSystems state ────────────────────
function loadAppSystemsFromModel() {
  const appSystems = getAppSystems()
  _appSystems = appSystems.map(sys => {
    const tech = getTechRealization(sys.id)
    return {
      id        : sys.id        || '',
      name      : sys.name      || '',
      purpose   : sys.purpose   || '',
      interfaces: sys.interfaces|| '',
      realization: {
        softwareProduct: tech.softwareProduct || '',
        productVersion : tech.productVersion  || '',
        nativeFormat   : tech.nativeFormat    || '',
        exchangeFormat : tech.exchangeFormat  || '',
        idScheme       : tech.idScheme        || '',
        url            : tech.url             || ''
      }
    }
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 8. RIGHT PANEL TOGGLE (Repository / Properties)
// ════════════════════════════════════════════════════════════════════════════
function showRepoPanel() {
  document.getElementById('panel-repo').style.display  = 'block'
  document.getElementById('panel-props').style.display = 'none'
  document.getElementById('btn-repo').classList.add('tb-btn-active')
  document.getElementById('btn-props').classList.remove('tb-btn-active')
}

function showPropsPanel() {
  document.getElementById('panel-repo').style.display  = 'none'
  document.getElementById('panel-props').style.display = 'block'
  document.getElementById('btn-repo').classList.remove('tb-btn-active')
  document.getElementById('btn-props').classList.add('tb-btn-active')
}

// ════════════════════════════════════════════════════════════════════════════
// 9. PALETTE EXTRACTION
// ════════════════════════════════════════════════════════════════════════════
function extractPalette() {
  const el = document.querySelector('#bpmn-canvas .djs-palette')
  if (!el) return
  const left = layout.el('left')
  left.innerHTML = ''
  left.appendChild(el)
  Object.assign(el.style, {
    position: 'relative', left: '0', top: '0',
    width: '100%', height: '100%',
    border: 'none', borderRadius: '0', boxShadow: 'none', background: 'transparent'
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 10. FILE SAVE — File System Access API with fallback
// ════════════════════════════════════════════════════════════════════════════
async function saveFile(content, suggestedName, mimeType, description, extensions) {
  if (window.showSaveFilePicker) {
    try {
      const handle   = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description, accept: { [mimeType]: extensions } }]
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn('showSaveFilePicker failed, using fallback:', err)
    }
  }
  const blob = new Blob([content], { type: mimeType })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = suggestedName
  a.click()
  URL.revokeObjectURL(a.href)
}

function defaultFilename(ext) {
  const b   = getExtValue('semarch:BusinessContext')
  const id  = (b.owner || b.systemName || 'repository').replace(/[^a-zA-Z0-9_-]/g, '_')
  const date = new Date().toISOString().slice(0, 10)
  return `${id}_${date}.${ext}`
}

// ════════════════════════════════════════════════════════════════════════════
// 11. DIAGRAM LOAD
// ════════════════════════════════════════════════════════════════════════════
async function loadDiagram(xml) {
  try {
    await modeler.importXML(xml)
    modeler.get('canvas').zoom('fit-viewport')
    extractPalette()
    loadAppSystemsFromModel()
    const lc = getExtValue('semarch:RepositoryLifecycle')
    if (lc.maturity) linter.setProfile(lc.maturity)
    renderRepoPanel()
  } catch (err) {
    alert('Import failed: ' + err.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 12. EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════
document.getElementById('btn-new').addEventListener('click', () => {
  if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
    _appSystems = []
    loadDiagram(EMPTY_DIAGRAM)
  }
})

const fileInput = document.getElementById('file-input')
document.getElementById('btn-import').addEventListener('click', () => {
  fileInput.value = ''; fileInput.click()
})
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => loadDiagram(e.target.result)
  reader.readAsText(file)
})

document.getElementById('btn-export-xml').addEventListener('click', async () => {
  try {
    const { xml } = await modeler.saveXML({ format: true })
    await saveFile(xml, defaultFilename('bpmn'), 'application/xml', 'BPMN Process Model', ['.bpmn', '.xml'])
  } catch (err) { alert('XML export failed: ' + err.message) }
})

document.getElementById('btn-export-svg').addEventListener('click', async () => {
  try {
    const { svg } = await modeler.saveSVG()
    await saveFile(svg, defaultFilename('svg'), 'image/svg+xml', 'SVG Diagram', ['.svg'])
  } catch (err) { alert('SVG export failed: ' + err.message) }
})

document.getElementById('btn-fit').addEventListener('click', () => {
  modeler.get('canvas').zoom('fit-viewport')
})

document.getElementById('btn-repo').addEventListener('click', () => {
  showRepoPanel(); renderRepoPanel()
})

document.getElementById('btn-props').addEventListener('click', showPropsPanel)

document.getElementById('btn-lint').addEventListener('click', () => linter.run())

// ════════════════════════════════════════════════════════════════════════════
// 13. INITIAL LOAD
// ════════════════════════════════════════════════════════════════════════════
loadDiagram(EMPTY_DIAGRAM)
