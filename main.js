// ── w2ui ─────────────────────────────────────────────────────────────────────
import { w2layout, w2popup } from 'w2ui/w2ui-2.0.es6.js'
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

// ── Engines ───────────────────────────────────────────────────────────────────
import { ModdleRegistry } from './engines/ModdleRegistry.js'
import { MergeEngine }    from './engines/MergeEngine.js'
import { ProfileEngine }  from './engines/ProfileEngine.js'
import { ImportEngine }   from './engines/ImportEngine.js'
import { ExportEngine }   from './engines/ExportEngine.js'
import { LinterEngine }   from './engines/LinterEngine.js'

// ── Config — loaded via Vite glob (late binding) ─────────────────────────────
const namespaceModules = import.meta.glob(
  './extensions/namespaces/*.json', { eager: true })
const importMapModules = import.meta.glob(
  './extensions/import-maps/*.json', { eager: true })
const exportMapModules = import.meta.glob(
  './extensions/export-maps/*.json', { eager: true })
const profileModules   = import.meta.glob(
  './extensions/profiles/*.json', { eager: true })

// ── Global registry (shared across all repositories) ─────────────────────────
const globalRegistry = new ModdleRegistry()
globalRegistry.loadAll(namespaceModules)

const importMaps  = Object.values(importMapModules).map(m => m.default ?? m)
const exportMaps  = Object.values(exportMapModules).map(m => m.default ?? m)
const allProfiles = Object.values(profileModules).map(m => m.default ?? m)

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════
const style = document.createElement('style')
style.textContent = `
/* ── Toolbar ── */
.tb-btn {
  background:transparent; color:rgba(255,255,255,.85); border:none;
  padding:4px 10px; font-size:12px; font-family:'DM Sans',sans-serif;
  cursor:pointer; height:45px; border-radius:3px; white-space:nowrap;
  transition:background .15s;
}
.tb-btn:hover { background:rgba(255,255,255,.12); color:#fff; }
.tb-btn-accent { border:1px solid rgba(255,255,255,.3); }
.tb-btn-active { background:rgba(255,255,255,.18) !important; color:#fff !important; }
.tb-sep { display:inline-block; width:1px; height:20px;
  background:rgba(255,255,255,.2); margin:0 4px; vertical-align:middle; }
.tb-group { display:inline-flex; align-items:center; gap:2px; }

/* ── Repo tabs ── */
#repo-tabs {
  display:flex; align-items:stretch; background:#162032;
  border-bottom:1px solid rgba(255,255,255,.1); overflow-x:auto;
  flex-shrink:0; height:32px;
}
.repo-tab {
  display:flex; align-items:center; gap:6px;
  padding:0 14px; font-size:11px; font-family:'DM Sans',sans-serif;
  color:rgba(255,255,255,.5); cursor:pointer; border:none;
  background:none; white-space:nowrap; border-right:1px solid rgba(255,255,255,.06);
  transition:all .15s;
}
.repo-tab:hover { background:rgba(255,255,255,.06); color:rgba(255,255,255,.8); }
.repo-tab.active { background:#1E3A5F; color:#fff; }
.repo-tab .tab-close {
  font-size:13px; opacity:.4; padding:0 2px; line-height:1;
  border-radius:2px;
}
.repo-tab .tab-close:hover { opacity:1; background:rgba(255,255,255,.2); }
.repo-tab .tab-dirty { width:6px; height:6px; border-radius:50%;
  background:#F59E0B; flex-shrink:0; }
.repo-tab-add {
  padding:0 12px; color:rgba(255,255,255,.4); cursor:pointer;
  font-size:16px; line-height:32px; border:none; background:none;
  transition:color .15s;
}
.repo-tab-add:hover { color:rgba(255,255,255,.8); }

/* ── Canvas host — one per repo ── */
.repo-canvas-host { position:absolute; inset:0; }
.repo-canvas-host.hidden { display:none; }
.bpmn-canvas-inner { width:100%; height:100%; }

/* ── Linting panel ── */
.lint-row { display:flex; align-items:flex-start; gap:8px; padding:3px 12px;
  cursor:pointer; border-bottom:1px solid #EDF0F5; }
.lint-row:hover { background:#F4F6F9; }

/* ── Right panel tabs ── */
.rp-tabs { display:flex; border-bottom:2px solid #D4DCE6;
  background:#F4F6F9; flex-shrink:0; }
.rp-tab  { padding:6px 12px; cursor:pointer; font-size:10px; font-weight:600;
  color:#8A9BB0; border:none; background:none; letter-spacing:.04em;
  text-transform:uppercase; border-bottom:2px solid transparent;
  margin-bottom:-2px; }
.rp-tab:hover { color:#2E6DA4; }
.rp-tab.active { color:#1E3A5F; border-bottom-color:#2E6DA4; }
.rp-body { flex:1; overflow-y:auto; padding:10px 12px; }

/* ── Form elements ── */
.f-field { margin-bottom:8px; }
.f-label { display:block; font-size:10px; font-weight:600; color:#4A6580;
  text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
.f-input, .f-select, .f-textarea {
  width:100%; padding:4px 7px; border:1px solid #D4DCE6; border-radius:3px;
  font-size:12px; font-family:'DM Sans',sans-serif; color:#1A2535;
  background:#fff; box-sizing:border-box;
}
.f-input:focus, .f-select:focus { outline:none; border-color:#2E6DA4; }
.f-hint { font-size:10px; color:#8A9BB0; font-style:italic; margin-top:2px; }
.f-section { font-size:10px; font-weight:700; color:#2E6DA4; text-transform:uppercase;
  letter-spacing:.08em; border-bottom:1px solid #D4DCE6; padding-bottom:3px;
  margin:10px 0 7px; }
.f-section:first-child { margin-top:0; }

/* ── Flow cards ── */
.flow-card { background:#F4F6F9; border:1px solid #D4DCE6; border-radius:4px;
  padding:7px 10px; margin-bottom:6px; }
.flow-card-title { font-weight:600; font-size:11px; color:#1E3A5F; }
.flow-card-sub   { font-size:10px; color:#8A9BB0; margin-top:2px; }
.flow-card-actions { display:flex; gap:4px; margin-top:5px; }

/* ── Buttons ── */
.btn-sm { padding:3px 9px; border-radius:3px; font-size:11px; cursor:pointer;
  font-family:'DM Sans',sans-serif; border:1px solid #D4DCE6; background:#fff;
  color:#2E6DA4; transition:background .15s; }
.btn-sm:hover { background:#EEF4FB; }
.btn-sm.primary { background:#1E3A5F; color:#fff; border-color:#1E3A5F; }
.btn-sm.primary:hover { background:#2E6DA4; border-color:#2E6DA4; }
.btn-sm.danger { color:#B84040; border-color:#DDB8B8; }
.btn-sm.danger:hover { background:#FBF3F3; }
.btn-full { width:100%; padding:6px; background:#1E3A5F; color:#fff;
  border:none; border-radius:3px; font-size:11px; font-weight:600;
  font-family:'DM Sans',sans-serif; cursor:pointer; margin-top:6px; }
.btn-full:hover { background:#2E6DA4; }
.btn-add { display:inline-flex; align-items:center; gap:3px; padding:3px 9px;
  background:#EEF4FB; border:1px solid #A8C0D8; border-radius:3px;
  color:#2E6DA4; font-size:10px; font-weight:600; cursor:pointer; }
.btn-add:hover { background:#D8EAF8; }

/* ── Extension field states ── */
.ext-field       { padding:6px 8px; border-radius:3px; margin-bottom:5px; }
.ext-field.active   { background:#EEF4FB; border:1px solid #C0D4E8; }
.ext-field.inactive { background:#F8F8F8; border:1px solid #E8E8E8; opacity:.7; }
.ext-field-label { font-size:10px; font-weight:600; color:#4A6580;
  text-transform:uppercase; letter-spacing:.04em; margin-bottom:3px;
  display:flex; justify-content:space-between; align-items:center; }
.ext-field-ns { font-size:9px; color:#A8C0D8; font-weight:400;
  font-family:monospace; }
.ext-field input, .ext-field select {
  width:100%; padding:3px 6px; border:1px solid #D4DCE6; border-radius:3px;
  font-size:11px; font-family:'DM Sans',sans-serif; background:#fff; }
.ext-field input:focus, .ext-field select:focus {
  outline:none; border-color:#2E6DA4; }
.ext-group-title { font-size:10px; font-weight:700; color:#2E6DA4;
  letter-spacing:.06em; text-transform:uppercase; margin:8px 0 4px;
  padding-bottom:2px; border-bottom:1px solid #D4DCE6; }
.ext-inactive-header { display:flex; align-items:center; justify-content:space-between;
  padding:4px 6px; background:#F0F0F0; border-radius:3px; cursor:pointer;
  font-size:10px; color:#8A9BB0; margin-bottom:4px; }

/* ── bpmn fills ── */
#bpmn-canvas { width:100%; height:100%; }
.bio-properties-panel { height:100%; }
.djs-palette-entries { overflow-y:auto; }
.djs-palette .djs-palette-toggle { display:none; }
`
document.head.appendChild(style)

// ════════════════════════════════════════════════════════════════════════════
// EMPTY DIAGRAM TEMPLATE
// ════════════════════════════════════════════════════════════════════════════
function emptyDiagram(repoId = 'Repository_1') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:semarch="http://semarch.io/schema/1.0"
  targetNamespace="http://semarch.io/repository"
  id="${repoId}">
  <bpmn:extensionElements>
    <semarch:BusinessContext systemType="" systemName="" owner=""
      organization="" normativeRefs="" programs="" communities=""/>
    <semarch:RepositoryLifecycle version="1.0" status="Draft"
      maturity="L1" lastReview="" reviewCycle="Annual" governedBy=""/>
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
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="PA_di" bpmnElement="Participant_A" isHorizontal="true">
        <dc:Bounds x="120" y="80" width="600" height="160"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="PAS_di" bpmnElement="Process_A_Start">
        <dc:Bounds x="200" y="142" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="PB_di" bpmnElement="Participant_B" isHorizontal="true">
        <dc:Bounds x="120" y="280" width="600" height="160"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="PBS_di" bpmnElement="Process_B_Start">
        <dc:Bounds x="200" y="342" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}

// ════════════════════════════════════════════════════════════════════════════
// REPOSITORY CLASS
// ════════════════════════════════════════════════════════════════════════════
let _repoCounter = 0

class Repository {
  constructor(options = {}) {
    _repoCounter++
    this.id           = options.id      || `repo-${_repoCounter}`
    this.label        = options.label   || `Repository ${_repoCounter}`
    this.bpmnXml      = options.bpmnXml || emptyDiagram(this.id)
    this.dirty        = false
    this.importFlows  = options.importFlows  || []
    this.exportFlows  = options.exportFlows  || []

    // DOM container — created once, moved into canvas area
    this.container = document.createElement('div')
    this.container.className = 'repo-canvas-host hidden'
    this.container.dataset.repoId = this.id

    const inner = document.createElement('div')
    inner.id = `bpmn-canvas-${this.id}`
    inner.className = 'bpmn-canvas-inner'
    this.container.appendChild(inner)

    // Props panel placeholder — one shared div, content swapped
    this.propsEl = document.createElement('div')
    this.propsEl.id = `bpmn-props-${this.id}`
    this.propsEl.style.cssText = 'height:100%;overflow-y:auto;'

    // Engines
    this.profileEngine = new ProfileEngine(allProfiles)
    this._modeler      = null  // lazy init
    this._mergeEngine  = null
    this._linterEngine = null
    this._lintIssues   = []
  }

  // ── Lazy modeler init ─────────────────────────────────────────────────────
  async ensureModeler() {
    if (this._modeler) return this._modeler

    const modeler = new BpmnModeler({
      container: this.container.querySelector(`#bpmn-canvas-${this.id}`),
      propertiesPanel: { parent: this.propsEl },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
      moddleExtensions: globalRegistry.getExtensions()
    })

    this._modeler = modeler
    this._mergeEngine = new MergeEngine(modeler.get('moddle'))
    this._linterEngine = new LinterEngine(
      modeler, issues => { this._lintIssues = issues; workspace.onLintResults(this.id, issues) },
      this.profileEngine, this._mergeEngine
    )

    // Keep bpmnXml in sync
    modeler.on('commandStack.changed', async () => {
      try {
        const { xml } = await modeler.saveXML({ format: true })
        this.bpmnXml = xml
        this.dirty   = true
        workspace.renderTabs()
      } catch {}
    })

    await modeler.importXML(this.bpmnXml)
    modeler.get('canvas').zoom('fit-viewport')
    this._extractPalette()

    // Activate profiles from context
    this._updateProfileContext()

    return modeler
  }

  _extractPalette() {
    const el   = this.container.querySelector('.djs-palette')
    const left = layout.el('left')
    if (!el || left._currentRepoId === this.id) return
    left.innerHTML = ''
    left.appendChild(el)
    left._currentRepoId = this.id
    Object.assign(el.style, {
      position: 'relative', left: '0', top: '0',
      width: '100%', height: '100%',
      border: 'none', borderRadius: '0',
      boxShadow: 'none', background: 'transparent'
    })
  }

  // ── Context helpers ───────────────────────────────────────────────────────
  getDefinitions() {
    try {
      let bo = this._modeler.get('canvas').getRootElement().businessObject
      while (bo.$parent) bo = bo.$parent
      return bo
    } catch { return null }
  }

  getExtValue(type) {
    const defs = this.getDefinitions()
    return defs?.extensionElements?.values?.find(v => v.$type === type) || {}
  }

  _updateProfileContext() {
    if (!this._modeler) return
    const bc = this.getExtValue('semarch:BusinessContext')
    const lc = this.getExtValue('semarch:RepositoryLifecycle')
    const tr = (this.getDefinitions()?.extensionElements?.values || [])
      .filter(v => v.$type === 'semarch:TechnicalRealization')
      .map(v => ({ softwareProduct: v.softwareProduct, applicationSystemId: v.applicationSystemId }))

    const context = {
      businessContext: { systemType: bc.systemType, normativeRefs: bc.normativeRefs },
      lifecycle:       { maturity: lc.maturity, status: lc.status },
      technicalRealization: tr
    }
    this.profileEngine.activate(context)
    if (this._linterEngine) this._linterEngine.run()
  }

  // ── Serialization ─────────────────────────────────────────────────────────
  async serialize() {
    if (this._modeler) {
      const { xml } = await this._modeler.saveXML({ format: true })
      this.bpmnXml = xml
    }
    return this.bpmnXml
  }

  markClean() { this.dirty = false; workspace.renderTabs() }

  // ── Default export flows from maps ────────────────────────────────────────
  getAvailableExportMaps() { return exportMaps }
  getAvailableImportMaps() { return importMaps }
}

// ════════════════════════════════════════════════════════════════════════════
// WORKSPACE — manages all open repositories
// ════════════════════════════════════════════════════════════════════════════
const workspace = {
  repos: new Map(),       // id → Repository
  activeId: null,

  // ── Open / create ─────────────────────────────────────────────────────────
  new(options = {}) {
    const repo = new Repository(options)
    this.repos.set(repo.id, repo)
    canvasHost.appendChild(repo.container)
    this.activate(repo.id)
    return repo
  },

  async openXml(xml, label) {
    const repo = this.new({ label, bpmnXml: xml })
    await repo.ensureModeler()
    return repo
  },

  // Initialize a new repository from an import (applying an import-map)
  async initFromImport(xml, importMap, label) {
    const importEngine = new ImportEngine(globalRegistry)
    let enriched
    try {
      enriched = importEngine.apply(importMap, xml)
    } catch (err) {
      alert(`Import transform failed: ${err.message}`)
      return null
    }
    return this.openXml(enriched, label || `Imported — ${importMap.label}`)
  },

  close(id) {
    const repo = this.repos.get(id)
    if (!repo) return
    if (repo.dirty && !confirm(`"${repo.label}" has unsaved changes. Close anyway?`)) return
    canvasHost.removeChild(repo.container)
    this.repos.delete(id)
    if (this.activeId === id) {
      const remaining = Array.from(this.repos.keys())
      if (remaining.length) this.activate(remaining[remaining.length - 1])
      else { this.activeId = null; this.renderTabs() }
    } else {
      this.renderTabs()
    }
  },

  // ── Activation ────────────────────────────────────────────────────────────
  async activate(id) {
    // Hide all
    this.repos.forEach(r => r.container.classList.add('hidden'))

    const repo = this.repos.get(id)
    if (!repo) return
    this.activeId = id

    // Show this one
    repo.container.classList.remove('hidden')

    // Ensure modeler is ready
    await repo.ensureModeler()

    // Swap props panel
    const propsSlot = document.getElementById('props-slot')
    if (propsSlot) {
      propsSlot.innerHTML = ''
      propsSlot.appendChild(repo.propsEl)
    }

    // Extract palette
    repo._extractPalette()

    this.renderTabs()
    renderRightPanel()
    renderLintPanel(repo._lintIssues)
  },

  active() { return this.repos.get(this.activeId) || null },

  // ── Tab rendering ─────────────────────────────────────────────────────────
  renderTabs() {
    const container = document.getElementById('repo-tabs')
    if (!container) return
    const tabs = Array.from(this.repos.values()).map(r => `
      <button class="repo-tab ${r.id === this.activeId ? 'active' : ''}"
        onclick="workspace.activate('${r.id}')">
        ${r.dirty ? '<span class="tab-dirty"></span>' : ''}
        <span>${r.label}</span>
        <span class="tab-close" onclick="event.stopPropagation();workspace.close('${r.id}')">×</span>
      </button>`).join('')
    container.innerHTML = tabs +
      `<button class="repo-tab-add" onclick="workspace.new()" title="New repository">+</button>`
  },

  // ── Lint callback ─────────────────────────────────────────────────────────
  onLintResults(repoId, issues) {
    if (repoId !== this.activeId) return
    renderLintPanel(issues)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT
// ════════════════════════════════════════════════════════════════════════════
const layout = new w2layout({
  box: '#app',
  name: 'main-layout',
  panels: [
    { type: 'top',    size: 77, resizable: false,
      style: 'overflow:hidden;padding:0;background:#1E3A5F;' },
    { type: 'left',   size: 50, resizable: false,
      style: 'background:#F4F6F9;border-right:1px solid #D4DCE6;overflow:hidden;padding:0;' },
    { type: 'main',   style: 'background:#fff;overflow:hidden;position:relative;' },
    { type: 'right',  size: 340, resizable: true,
      style: 'background:#fff;border-left:1px solid #D4DCE6;overflow:hidden;' },
    { type: 'bottom', size: 120, resizable: true,
      style: 'background:#F4F6F9;border-top:1px solid #D4DCE6;overflow:hidden;' }
  ]
})

// ── Toolbar (row 1) + repo tabs (row 2) ──────────────────────────────────────
layout.el('top').innerHTML = `
<div style="height:45px;display:flex;align-items:center;padding:0 10px;gap:2px;">
  <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;
    letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:0 12px;
    white-space:nowrap;">Semantic Process Mediator</span>
  <span class="tb-sep"></span>

  <div class="tb-group" title="Repository">
    <button class="tb-btn" id="btn-new-repo">New repo</button>
    <button class="tb-btn" id="btn-save-repo">Save</button>
  </div>
  <span class="tb-sep"></span>

  <div class="tb-group" title="Import">
    <button class="tb-btn tb-btn-accent" id="btn-import-new"
      title="Initialize a new repository from a platform export">⊕ Init from import</button>
    <button class="tb-btn" id="btn-import-enrich"
      title="Enrich current repository from a platform file">⊞ Import into current</button>
  </div>
  <span class="tb-sep"></span>

  <div class="tb-group" title="Export">
    <button class="tb-btn" id="btn-export-xml">Export XML</button>
    <button class="tb-btn" id="btn-export-flows"
      title="Run a configured export flow">Export flows ▾</button>
  </div>
  <span class="tb-sep"></span>

  <button class="tb-btn" id="btn-fit">Fit</button>
  <span class="tb-sep"></span>
  <button class="tb-btn tb-btn-active" id="btn-repo">⊞ Repository</button>
  <button class="tb-btn" id="btn-props">⊟ Properties</button>
  <button class="tb-btn" id="btn-lint">⚡ Lint</button>
  <span style="flex:1"></span>
  <span id="lint-badge" style="display:none;font-family:monospace;font-size:11px;
    background:rgba(255,255,255,.12);color:#fff;padding:2px 10px;border-radius:20px;
    white-space:nowrap;"></span>
</div>
<div id="repo-tabs" style="height:32px;"></div>`

// ── Canvas host — all repo containers live here ───────────────────────────
const mainEl  = layout.el('main')
mainEl.style.position = 'relative'
const canvasHost = document.createElement('div')
canvasHost.style.cssText = 'position:absolute;inset:0;'
mainEl.appendChild(canvasHost)

// ── Right panel ───────────────────────────────────────────────────────────
layout.el('right').innerHTML = `
<div style="height:100%;display:flex;flex-direction:column;">
  <div id="panel-repo"  style="height:100%;display:flex;flex-direction:column;"></div>
  <div id="panel-props" style="height:100%;display:none;flex-direction:column;">
    <div id="props-slot" style="height:100%;overflow-y:auto;"></div>
  </div>
</div>`

// ── Bottom panel ─────────────────────────────────────────────────────────
layout.el('bottom').innerHTML = `
<div style="height:100%;display:flex;flex-direction:column;">
  <div style="display:flex;align-items:center;padding:3px 12px;
    background:#EDF0F5;border-bottom:1px solid #D4DCE6;gap:8px;flex-shrink:0;">
    <span style="font-family:monospace;font-size:10px;font-weight:600;
      color:#4A6580;letter-spacing:.08em;text-transform:uppercase;">Linting</span>
    <span id="lint-summary" style="font-family:monospace;font-size:10px;color:#8A9BB0;"></span>
  </div>
  <div id="lint-results" style="flex:1;overflow-y:auto;padding:4px 0;"></div>
</div>`

// ════════════════════════════════════════════════════════════════════════════
// RIGHT PANEL — Repository view
// ════════════════════════════════════════════════════════════════════════════
let _rpTab = 'context'

function renderRightPanel() {
  const repo = workspace.active()
  const el   = document.getElementById('panel-repo')
  if (!el) return

  if (!repo) {
    el.innerHTML = `<div style="padding:20px;font-size:12px;color:#8A9BB0;text-align:center;">
      No repository open.<br>Create one with "New repo".</div>`
    return
  }

  const tabs = [
    { id: 'context', label: 'Context' },
    { id: 'flows',   label: 'Flows' },
    { id: 'fields',  label: 'Fields' }
  ].map(t => `<button class="rp-tab ${_rpTab === t.id ? 'active' : ''}"
    onclick="window._rpTab('${t.id}')">${t.label}</button>`).join('')

  const lc = repo.getExtValue('semarch:RepositoryLifecycle')
  const mat = lc.maturity || 'L1'

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:5px 10px;background:#1E3A5F;flex-shrink:0;">
      <span style="font-family:monospace;font-size:10px;font-weight:600;
        color:#A8C4DC;letter-spacing:.08em;text-transform:uppercase;">
        ${repo.label}</span>
      <span style="font-family:monospace;font-size:10px;font-weight:700;
        padding:1px 7px;border-radius:20px;background:rgba(255,255,255,.12);color:#fff;">
        ${mat}</span>
    </div>
    <div class="rp-tabs">${tabs}</div>
    <div class="rp-body" id="rp-body"></div>
    <div style="padding:6px 10px;border-top:1px solid #D4DCE6;flex-shrink:0;">
      <button class="btn-full" onclick="window._rpSaveContext()">↓ Save context to BPMN</button>
    </div>`

  renderRpBody()
}

function renderRpBody() {
  const el   = document.getElementById('rp-body')
  const repo = workspace.active()
  if (!el || !repo) return

  if (_rpTab === 'context') el.innerHTML = buildContextTab(repo)
  if (_rpTab === 'flows')   el.innerHTML = buildFlowsTab(repo)
  if (_rpTab === 'fields')  el.innerHTML = buildFieldsTab(repo)
}

window._rpTab = function(id) { _rpTab = id; renderRpBody() }

// ── Context tab ───────────────────────────────────────────────────────────
function buildContextTab(repo) {
  const bc = repo.getExtValue('semarch:BusinessContext')
  const lc = repo.getExtValue('semarch:RepositoryLifecycle')
  const f  = (id, label, val, ph, type = 'input', hint = '') => {
    const inner = type === 'select'
      ? `<select class="f-select" id="${id}">${val}</select>`
      : `<input class="f-input" type="text" id="${id}" placeholder="${ph}" value="${val || ''}"/>`
    return `<div class="f-field">
      <label class="f-label" for="${id}">${label}</label>${inner}
      ${hint ? `<div class="f-hint">${hint}</div>` : ''}</div>`
  }
  const typeOpts  = ['','BMS','CoC','Programme','Activite']
    .map(v => `<option value="${v}" ${bc.systemType===v?'selected':''}>${v||'— select —'}</option>`).join('')
  const matOpts   = ['L1','L2','L3','L4']
    .map(v => `<option value="${v}" ${lc.maturity===v?'selected':''}>${v}</option>`).join('')
  const statOpts  = ['Draft','Active','Archived','Deprecated']
    .map(v => `<option value="${v}" ${lc.status===v?'selected':''}>${v}</option>`).join('')

  return `
    <div class="f-section">Applicative System</div>
    ${f('ctx-type',  'System Type',    `<option value="">—</option>${typeOpts}`, '', 'select',
      'BMS · CoC · Programme · Activite')}
    ${f('ctx-name',  'System Name',    bc.systemName    ||'', 'CoC Avionics Process Repository',
      'input', 'Name the applicative system — not the software product')}
    ${f('ctx-owner', 'Owner',          bc.owner         ||'', 'CoC Avionics')}
    ${f('ctx-org',   'Organisation',   bc.organization  ||'', 'Airbus Defence and Space')}
    <div class="f-section">Normative</div>
    ${f('ctx-std',   'Normative Refs', bc.normativeRefs ||'', 'DO-178C ECSS-Q-ST-80',
      'input', 'Space-separated')}
    ${f('ctx-prog',  'Programmes',     bc.programs      ||'', 'A400M EURODRONE',
      'input', 'Space-separated')}
    ${f('ctx-com',   'Communities',    bc.communities   ||'', 'MIWG ASD-SSG AFIS',
      'input', 'Space-separated')}
    <div class="f-section">Lifecycle</div>
    ${f('ctx-mat',    'Maturity',  matOpts,  '', 'select')}
    ${f('ctx-status', 'Status',    statOpts, '', 'select')}
    ${f('ctx-ver',    'Version',   lc.version    ||'1.0', '1.0')}
    ${f('ctx-review', 'Last Review', lc.lastReview||'',  'YYYY-MM-DD')}
    ${f('ctx-gov',   'Governed By', lc.governedBy||'', 'CoC Process Owner')}`
}

window._rpSaveContext = function() {
  const repo = workspace.active()
  if (!repo || !repo._modeler) return

  const merge = repo._mergeEngine
  const defs  = repo.getDefinitions()
  if (!defs) return

  merge.mergeDefinitions(defs, 'semarch', {
    BusinessContext: {
      systemType:          document.getElementById('ctx-type')?.value   || '',
      systemName:          document.getElementById('ctx-name')?.value   || '',
      owner:               document.getElementById('ctx-owner')?.value  || '',
      organization:        document.getElementById('ctx-org')?.value    || '',
      normativeRefs:       document.getElementById('ctx-std')?.value    || '',
      programs:            document.getElementById('ctx-prog')?.value   || '',
      communities:         document.getElementById('ctx-com')?.value    || ''
    },
    RepositoryLifecycle: {
      version:     document.getElementById('ctx-ver')?.value    || '1.0',
      status:      document.getElementById('ctx-status')?.value || 'Draft',
      maturity:    document.getElementById('ctx-mat')?.value    || 'L1',
      lastReview:  document.getElementById('ctx-review')?.value || '',
      reviewCycle: 'Annual',
      governedBy:  document.getElementById('ctx-gov')?.value   || ''
    }
  })

  repo._updateProfileContext()
  renderRightPanel()
}

// ── Flows tab ─────────────────────────────────────────────────────────────
function buildFlowsTab(repo) {
  const importFlowCards = repo.importFlows.map((f, i) => `
    <div class="flow-card">
      <div class="flow-card-title">${f.label || f.mapId}</div>
      <div class="flow-card-sub">map: ${f.mapId} · ${f.source}</div>
      <div class="flow-card-actions">
        <button class="btn-sm" onclick="window._runImportFlow('${i}')">▶ Run</button>
        <button class="btn-sm danger" onclick="window._deleteImportFlow('${i}')">✕</button>
      </div>
    </div>`).join('')

  const exportFlowCards = repo.exportFlows.map((f, i) => `
    <div class="flow-card">
      <div class="flow-card-title">${f.label || f.mapId}</div>
      <div class="flow-card-sub">map: ${f.mapId} · ${f.filename || 'auto'}</div>
      <div class="flow-card-actions">
        <button class="btn-sm" onclick="window._runExportFlow('${i}')">▶ Run</button>
        <button class="btn-sm danger" onclick="window._deleteExportFlow('${i}')">✕</button>
      </div>
    </div>`).join('')

  const mapOptions = (maps) => maps.map(m =>
    `<option value="${m.id}">${m.label || m.id}</option>`).join('')

  return `
    <div class="f-section">Import Flows
      <button class="btn-add" style="float:right;margin-top:-2px;"
        onclick="window._addImportFlow()">+ Add</button>
    </div>
    ${importFlowCards || '<div class="f-hint" style="margin-bottom:8px;">No import flows defined.</div>'}

    <div class="f-section">Export Flows
      <button class="btn-add" style="float:right;margin-top:-2px;"
        onclick="window._addExportFlow()">+ Add</button>
    </div>
    ${exportFlowCards || '<div class="f-hint" style="margin-bottom:8px;">No export flows defined.</div>'}

    <div class="f-section">Quick Export</div>
    <div class="f-hint" style="margin-bottom:6px;">Run an ad-hoc export without saving a flow.</div>
    <select class="f-select" id="quick-export-map">${mapOptions(exportMaps)}</select>
    <button class="btn-full" onclick="window._quickExport()" style="margin-top:4px;">
      Export with selected map
    </button>

    <div class="f-section">Serialization</div>
    <div class="f-hint" style="margin-bottom:6px;">
      Save the canonical BPMN (all namespaces preserved) to your filesystem.
    </div>
    <button class="btn-full" onclick="window._serializeRepo()">
      ↓ Save canonical BPMN
    </button>`
}

window._addImportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  const mapOpts = importMaps.map(m =>
    `<option value="${m.id}">${m.label || m.id}</option>`).join('')
  w2popup.open({
    title: '+ Add Import Flow', width: 420, height: 280,
    body: `<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Label</label>
        <input class="f-input" id="if-label" placeholder="Import from EA"/></div>
      <div class="f-field"><label class="f-label">Import Map</label>
        <select class="f-select" id="if-map">${mapOpts}</select></div>
      <div class="f-field"><label class="f-label">Source</label>
        <select class="f-select" id="if-source">
          <option value="file">File picker</option>
          <option value="url">URL</option>
        </select></div></div>`,
    buttons: `<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._saveImportFlow()">Save</button>`
  })
}

window._saveImportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  repo.importFlows.push({
    label  : document.getElementById('if-label')?.value  || '',
    mapId  : document.getElementById('if-map')?.value    || '',
    source : document.getElementById('if-source')?.value || 'file'
  })
  w2popup.close(); renderRpBody()
}

window._addExportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  const mapOpts = exportMaps.map(m =>
    `<option value="${m.id}">${m.label || m.id}</option>`).join('')
  w2popup.open({
    title: '+ Add Export Flow', width: 420, height: 300,
    body: `<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Label</label>
        <input class="f-input" id="ef-label" placeholder="Export to ARIS"/></div>
      <div class="f-field"><label class="f-label">Export Map</label>
        <select class="f-select" id="ef-map">${mapOpts}</select></div>
      <div class="f-field"><label class="f-label">Filename Template</label>
        <input class="f-input" id="ef-filename" placeholder="{repoId}_{date}.bpmn"
          value="{repoId}_{date}.bpmn"/>
        <div class="f-hint">{repoId} {date} {owner} are replaced at export time</div></div>
      </div>`,
    buttons: `<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._saveExportFlow()">Save</button>`
  })
}

window._saveExportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  repo.exportFlows.push({
    label   : document.getElementById('ef-label')?.value    || '',
    mapId   : document.getElementById('ef-map')?.value      || '',
    filename: document.getElementById('ef-filename')?.value || '{repoId}_{date}.bpmn'
  })
  w2popup.close(); renderRpBody()
}

window._deleteImportFlow = function(i) {
  const repo = workspace.active(); if (!repo) return
  repo.importFlows.splice(i, 1); renderRpBody()
}
window._deleteExportFlow = function(i) {
  const repo = workspace.active(); if (!repo) return
  repo.exportFlows.splice(i, 1); renderRpBody()
}

window._runImportFlow = async function(i) {
  const repo = workspace.active(); if (!repo) return
  const flow = repo.importFlows[i]; if (!flow) return
  const map  = importMaps.find(m => m.id === flow.mapId)
  if (!map) { alert(`Import map "${flow.mapId}" not found.`); return }
  const xml = await _pickFile()
  if (!xml) return
  const engine   = new ImportEngine(globalRegistry)
  const enriched = engine.apply(map, xml)
  await repo._modeler.importXML(enriched)
  repo.bpmnXml = enriched; repo.dirty = true
  workspace.renderTabs()
}

window._runExportFlow = async function(i) {
  const repo = workspace.active(); if (!repo) return
  const flow = repo.exportFlows[i]; if (!flow) return
  const map  = exportMaps.find(m => m.id === flow.mapId)
  if (!map) { alert(`Export map "${flow.mapId}" not found.`); return }
  const xml      = await repo.serialize()
  const engine   = new ExportEngine(globalRegistry)
  const output   = engine.apply(map, xml)
  const filename = _resolveFilename(flow.filename || '{repoId}_{date}.bpmn', repo)
  await _saveFile(output, filename, 'application/xml', 'BPMN', ['.bpmn','.xml'])
}

window._quickExport = async function() {
  const repo  = workspace.active(); if (!repo) return
  const mapId = document.getElementById('quick-export-map')?.value
  const map   = exportMaps.find(m => m.id === mapId)
  if (!map) return
  const xml    = await repo.serialize()
  const engine = new ExportEngine(globalRegistry)
  const output = engine.apply(map, xml)
  const fn     = _resolveFilename(`{repoId}_{date}.bpmn`, repo)
  await _saveFile(output, fn, 'application/xml', 'BPMN', ['.bpmn','.xml'])
}

window._serializeRepo = async function() {
  const repo = workspace.active(); if (!repo) return
  const xml  = await repo.serialize()
  const fn   = _resolveFilename('{repoId}_{date}.bpmn', repo)
  await _saveFile(xml, fn, 'application/xml', 'BPMN Canonical', ['.bpmn','.xml'])
  repo.markClean()
}

// ── Fields tab — active profile fields for selected element ───────────────
function buildFieldsTab(repo) {
  const profiles = repo.profileEngine.getActiveProfiles()
  if (!profiles.length) {
    return `<div class="f-hint" style="padding:10px;">
      No profiles active.<br>Set System Type and Maturity in the Context tab.
    </div>`
  }
  return `<div class="f-hint" style="margin-bottom:8px;">
    Active profiles: ${profiles.map(p => `<b>${p.label}</b>`).join(', ')}<br>
    Select an element on the canvas to edit its extension fields.
  </div>
  <div id="fields-body">
    <div style="font-size:11px;color:#8A9BB0;padding:8px 0;">
      No element selected.</div>
  </div>`
}

// ════════════════════════════════════════════════════════════════════════════
// ELEMENT FIELD PANEL — rendered when user selects an element
// ════════════════════════════════════════════════════════════════════════════
function renderElementFields(repo, element) {
  const el = document.getElementById('fields-body')
  if (!el || !element) return

  const currentValues = {} // namespace → { TypeName → { attr → val } }
  const bo = element.businessObject
  ;(bo.extensionElements?.values || []).forEach(entry => {
    const [ns, typeName] = entry.$type.split(':')
    if (!currentValues[ns]) currentValues[ns] = {}
    if (!currentValues[ns][typeName]) currentValues[ns][typeName] = {}
    Object.keys(entry).forEach(k => {
      if (!k.startsWith('$')) currentValues[ns][typeName][k] = entry[k]
    })
  })

  const fields    = repo.profileEngine.getFields(element.type, currentValues)
  const activeNS  = new Set(repo.profileEngine.getActiveNamespaces())
  const rules     = repo.profileEngine.getRules()
  const fv        = {}  // 'prefix:attr' → value (for rule eval)
  fields.forEach(f => { fv[f.id] = f.value })

  // Group active fields by group
  const groups = {}
  fields.filter(f => f.state === 'active').forEach(f => {
    const g = f.group || f.namespace
    if (!groups[g]) groups[g] = []
    groups[g].push(f)
  })

  // Inactive-present fields
  const inactive = fields.filter(f => f.state === 'inactive-present')

  let html = ''

  // Active groups
  Object.entries(groups).forEach(([group, gfields]) => {
    html += `<div class="ext-group-title">${group}</div>`
    gfields.forEach(field => {
      const violation = rules.find(r => {
        const issue = repo.profileEngine.evaluateRule(r, fv)
        return issue && (r.field === field.id || r.requires === field.id)
      })
      const borderColor = violation
        ? (violation.severity === 'error' ? '#B84040' : '#C47A2B')
        : undefined
      const style = borderColor ? `border-color:${borderColor};` : ''

      let input
      if (field.type === 'enum') {
        const opts = (field.values || []).map(v =>
          `<option value="${v}" ${field.value===v?'selected':''}>${v}</option>`).join('')
        input = `<select style="${style}"
          onchange="window._setField('${repo.id}','${element.id}','${field.id}',this.value,
            '${field.namespace}','${field.targetType}','${field.targetAttr}')">
          <option value="">—</option>${opts}</select>`
      } else {
        input = `<input type="text" value="${field.value || ''}"
          style="${style}"
          placeholder="${field.hint || ''}"
          onchange="window._setField('${repo.id}','${element.id}','${field.id}',this.value,
            '${field.namespace}','${field.targetType}','${field.targetAttr}')"/>`
      }

      html += `<div class="ext-field active">
        <div class="ext-field-label">
          <span>${field.label}${field.required ? ' <span style="color:#B84040">*</span>' : ''}</span>
          <span class="ext-field-ns">${field.id}</span>
        </div>
        ${input}
        ${violation ? `<div style="font-size:10px;color:${borderColor};margin-top:2px;">
          ${violation.description || violation.message}</div>` : ''}
      </div>`
    })
  })

  // Inactive-present section
  if (inactive.length) {
    html += `<div class="ext-inactive-header" id="inactive-toggle"
      onclick="document.getElementById('inactive-body').style.display=
        document.getElementById('inactive-body').style.display==='none'?'block':'none'">
      <span>Data from inactive profiles (${inactive.length} field${inactive.length>1?'s':''})</span>
      <span>▾</span>
    </div>
    <div id="inactive-body" style="display:none;">`
    inactive.forEach(field => {
      html += `<div class="ext-field inactive">
        <div class="ext-field-label">
          <span>${field.label}</span>
          <span class="ext-field-ns">${field.id}</span>
        </div>
        <input type="text" value="${field.value || ''}" readonly
          style="background:#F0F0F0;color:#8A9BB0;cursor:not-allowed;"/>
        <div style="display:flex;justify-content:flex-end;margin-top:3px;">
          <button class="btn-sm danger" style="font-size:9px;padding:1px 7px;"
            onclick="window._removeNsData('${repo.id}','${element.id}','${field.namespace}')">
            Remove ${field.namespace}: data</button>
        </div>
      </div>`
    })
    html += '</div>'
  }

  el.innerHTML = html || '<div style="font-size:11px;color:#8A9BB0;">No fields for this element type.</div>'
}

window._setField = function(repoId, elementId, fieldId, value, ns, targetType, targetAttr) {
  const repo = workspace.repos.get(repoId); if (!repo) return
  const el   = repo._modeler.get('elementRegistry').get(elementId); if (!el) return
  const bo   = el.businessObject

  if (!bo.extensionElements) {
    bo.extensionElements = repo._modeler.get('moddle')
      .create('bpmn:ExtensionElements', { values: [] })
    bo.extensionElements.$parent = bo
  }
  if (!Array.isArray(bo.extensionElements.values)) bo.extensionElements.values = []

  const typeName  = targetType  // e.g. 'do178c:SoftwareLevel'
  const attrName  = targetAttr  // e.g. 'dal'
  const moddle    = repo._modeler.get('moddle')

  let entry = bo.extensionElements.values.find(v => v.$type === typeName)
  if (!entry) {
    try {
      entry = moddle.create(typeName, {})
      entry.$parent = bo.extensionElements
      bo.extensionElements.values.push(entry)
    } catch (err) {
      console.warn(`_setField: cannot create ${typeName}:`, err.message)
      return
    }
  }
  entry[attrName] = value
  repo.dirty = true
  workspace.renderTabs()
}

window._removeNsData = function(repoId, elementId, namespace) {
  const repo = workspace.repos.get(repoId); if (!repo) return
  const el   = repo._modeler.get('elementRegistry').get(elementId); if (!el) return

  const preview = repo._mergeEngine.prepareRemove(el, namespace)
  if (!preview.length) return

  const list = preview.map(p => `• ${p.type}`).join('\n')
  if (!confirm(`Remove all "${namespace}:" data from this element?\n\n${list}`)) return

  repo._mergeEngine.remove(el, namespace)
  renderElementFields(repo, el)
}

// ════════════════════════════════════════════════════════════════════════════
// LINTING PANEL
// ════════════════════════════════════════════════════════════════════════════
function renderLintPanel(issues = []) {
  const container = document.getElementById('lint-results')
  const summary   = document.getElementById('lint-summary')
  const badge     = document.getElementById('lint-badge')
  if (!container) return

  const E = issues.filter(i => i.severity === 'error').length
  const W = issues.filter(i => i.severity === 'warning').length
  const I = issues.filter(i => i.severity === 'info').length

  if (!issues.length) {
    if (badge) { badge.style.display = 'none' }
    if (summary) summary.textContent = 'No issues'
    container.innerHTML = `<div style="padding:8px 14px;font-family:monospace;
      font-size:11px;color:#6BAF92;">✓ All rules passed</div>`
    return
  }

  const parts = []
  if (E) parts.push(`${E}E`); if (W) parts.push(`${W}W`); if (I) parts.push(`${I}I`)
  if (badge) { badge.style.display = ''; badge.textContent = parts.join(' · ') }
  if (summary) summary.textContent = `${issues.length} issue${issues.length > 1 ? 's' : ''}`

  const sev = {
    error:   { dot:'#B84040', bg:'#FBF3F3', text:'#7A2020' },
    warning: { dot:'#C47A2B', bg:'#FBF6F0', text:'#6A4010' },
    info:    { dot:'#2E6DA4', bg:'#EEF4FB', text:'#1A3A5A' }
  }
  container.innerHTML = issues.map(issue => {
    const c    = sev[issue.severity] || sev.info
    const name = issue.element.businessObject?.name ? ` — ${issue.element.businessObject.name}` : ''
    return `<div class="lint-row" data-repo="${workspace.activeId}"
      data-eid="${issue.element.id}"
      onmouseover="this.style.background='${c.bg}'" onmouseout="this.style.background=''">
      <span style="width:6px;height:6px;border-radius:50%;background:${c.dot};
        flex-shrink:0;margin-top:4px;"></span>
      <div>
        <span style="font-family:monospace;font-size:10px;color:#8A9BB0;">${issue.rule}</span>
        <span style="font-family:monospace;font-size:10px;font-weight:600;
          color:${c.text};margin-left:6px;">${issue.element.id}${name}</span>
        <div style="font-size:11px;color:#4A6580;line-height:1.35;">${issue.message}</div>
      </div>
    </div>`
  }).join('')

  container.querySelectorAll('.lint-row').forEach(row => {
    row.addEventListener('click', () => {
      const repo = workspace.repos.get(row.dataset.repo); if (!repo) return
      const el   = repo._modeler.get('elementRegistry').get(row.dataset.eid)
      if (el) { repo._modeler.get('selection').select(el); repo._modeler.get('canvas').scrollToElement(el) }
    })
  })
}

// ════════════════════════════════════════════════════════════════════════════
// FILE UTILITIES
// ════════════════════════════════════════════════════════════════════════════
function _pickFile(accept = '.bpmn,.xml') {
  return new Promise(resolve => {
    const input    = document.createElement('input')
    input.type     = 'file'
    input.accept   = accept
    input.onchange = () => {
      const file = input.files[0]
      if (!file) { resolve(null); return }
      const reader  = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.readAsText(file)
    }
    input.click()
  })
}

async function _saveFile(content, suggestedName, mimeType, description, exts) {
  if (window.showSaveFilePicker) {
    try {
      const handle   = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description, accept: { [mimeType]: exts } }]
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }
  const blob = new Blob([content], { type: mimeType })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = suggestedName
  a.click()
  URL.revokeObjectURL(a.href)
}

function _resolveFilename(template, repo) {
  const bc   = repo.getExtValue('semarch:BusinessContext')
  const date = new Date().toISOString().slice(0, 10)
  return template
    .replace('{repoId}', repo.id)
    .replace('{date}', date)
    .replace('{owner}', (bc.owner || 'repo').replace(/[^a-zA-Z0-9_-]/g, '_'))
}

// ════════════════════════════════════════════════════════════════════════════
// TOOLBAR EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════
document.getElementById('btn-new-repo').addEventListener('click', () => {
  workspace.new()
})

document.getElementById('btn-save-repo').addEventListener('click', async () => {
  const repo = workspace.active(); if (!repo) return
  const xml  = await repo.serialize()
  const fn   = _resolveFilename('{repoId}_{date}.bpmn', repo)
  await _saveFile(xml, fn, 'application/xml', 'BPMN Canonical', ['.bpmn','.xml'])
  repo.markClean()
})

document.getElementById('btn-import-new').addEventListener('click', async () => {
  // Initialize a new repository from a platform export
  const mapOpts = importMaps.map(m =>
    `<option value="${m.id}">${m.label || m.id}</option>`).join('')

  w2popup.open({
    title: '⊕ Initialize new repository from import', width: 440, height: 260,
    body: `<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Import Map</label>
        <select class="f-select" id="ini-map">${mapOpts}</select>
        <div class="f-hint">Applies the selected map to enrich the imported file
          and creates a new repository.</div></div>
      <div class="f-field"><label class="f-label">Repository Label</label>
        <input class="f-input" id="ini-label" placeholder="EA CoC Avionics import"/></div>
    </div>`,
    buttons: `<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._doInitFromImport()">
        Choose file & import</button>`
  })
})

window._doInitFromImport = async function() {
  const mapId = document.getElementById('ini-map')?.value
  const label = document.getElementById('ini-label')?.value || 'Imported repository'
  const map   = importMaps.find(m => m.id === mapId)
  if (!map) { alert('Select an import map.'); return }
  w2popup.close()
  const xml = await _pickFile()
  if (!xml) return
  await workspace.initFromImport(xml, map, label)
}

document.getElementById('btn-import-enrich').addEventListener('click', async () => {
  const repo = workspace.active(); if (!repo) return
  const mapOpts = importMaps.map(m =>
    `<option value="${m.id}">${m.label || m.id}</option>`).join('')

  w2popup.open({
    title: '⊞ Import into current repository', width: 400, height: 220,
    body: `<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Import Map</label>
        <select class="f-select" id="enr-map">${mapOpts}</select>
        <div class="f-hint">Enriches the current repository with platform-specific data.</div>
      </div></div>`,
    buttons: `<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._doEnrichImport()">
        Choose file & enrich</button>`
  })
})

window._doEnrichImport = async function() {
  const repo  = workspace.active(); if (!repo) return
  const mapId = document.getElementById('enr-map')?.value
  const map   = importMaps.find(m => m.id === mapId)
  if (!map) { alert('Select a map.'); return }
  w2popup.close()
  const xml = await _pickFile()
  if (!xml) return
  const engine   = new ImportEngine(globalRegistry)
  const enriched = engine.apply(map, xml)
  await repo._modeler.importXML(enriched)
  repo.bpmnXml = enriched; repo.dirty = true
  workspace.renderTabs()
}

document.getElementById('btn-export-xml').addEventListener('click', async () => {
  const repo = workspace.active(); if (!repo) return
  const xml  = await repo.serialize()
  const fn   = _resolveFilename('{repoId}_{date}.bpmn', repo)
  await _saveFile(xml, fn, 'application/xml', 'BPMN', ['.bpmn','.xml'])
})

document.getElementById('btn-export-flows').addEventListener('click', () => {
  _rpTab = 'flows'; renderRightPanel()
  document.getElementById('panel-repo').style.display  = 'flex'
  document.getElementById('panel-props').style.display = 'none'
  document.getElementById('btn-repo').classList.add('tb-btn-active')
  document.getElementById('btn-props').classList.remove('tb-btn-active')
})

document.getElementById('btn-fit').addEventListener('click', () => {
  workspace.active()?._modeler?.get('canvas').zoom('fit-viewport')
})

document.getElementById('btn-repo').addEventListener('click', () => {
  document.getElementById('panel-repo').style.display  = 'flex'
  document.getElementById('panel-props').style.display = 'none'
  document.getElementById('btn-repo').classList.add('tb-btn-active')
  document.getElementById('btn-props').classList.remove('tb-btn-active')
  renderRightPanel()
})

document.getElementById('btn-props').addEventListener('click', () => {
  document.getElementById('panel-repo').style.display  = 'none'
  document.getElementById('panel-props').style.display = 'flex'
  document.getElementById('btn-props').classList.add('tb-btn-active')
  document.getElementById('btn-repo').classList.remove('tb-btn-active')
})

document.getElementById('btn-lint').addEventListener('click', () => {
  workspace.active()?._linterEngine?.run()
})

// ── Element selection → field panel ───────────────────────────────────────
// Uses a MutationObserver on canvas hosts to catch selection events
// after modeler is lazily initialized
function hookSelectionEvent(repo) {
  repo._modeler.on('selection.changed', ({ newSelection }) => {
    if (workspace.activeId !== repo.id) return
    if (_rpTab !== 'fields') return
    const el = newSelection?.[0]
    renderElementFields(repo, el || null)
  })
}

// Patch activate to hook selection after lazy init
const _origEnsure = Repository.prototype.ensureModeler
Repository.prototype.ensureModeler = async function() {
  const wasNull = !this._modeler
  const result  = await _origEnsure.call(this)
  if (wasNull && this._modeler) hookSelectionEvent(this)
  return result
}

// ════════════════════════════════════════════════════════════════════════════
// INITIAL STATE — one default repository
// ════════════════════════════════════════════════════════════════════════════
workspace.new({ label: 'New Repository' })
