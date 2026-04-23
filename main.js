// ── w2ui ─────────────────────────────────────────────────────────────────────
import { w2layout, w2popup } from 'w2ui/w2ui-2.0.es6.js'
import 'w2ui/w2ui-2.0.min.css'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import '@bpmn-io/properties-panel/assets/properties-panel.css'
import { ModdleRegistry } from './engines/ModdleRegistry.js'
import { MergeEngine }    from './engines/MergeEngine.js'
import { ProfileEngine }  from './engines/ProfileEngine.js'
import { ImportEngine }   from './engines/ImportEngine.js'
import { ExportEngine }   from './engines/ExportEngine.js'
import { LinterEngine }   from './engines/LinterEngine.js'

const namespaceModules = import.meta.glob('./extensions/namespaces/*.json', { eager: true })
const importMapModules = import.meta.glob('./extensions/import-maps/*.json', { eager: true })
const exportMapModules = import.meta.glob('./extensions/export-maps/*.json', { eager: true })
const profileModules   = import.meta.glob('./extensions/profiles/*.json',    { eager: true })

const globalRegistry = new ModdleRegistry()
globalRegistry.loadAll(namespaceModules)
const importMaps  = Object.values(importMapModules).map(m => m.default ?? m)
const exportMaps  = Object.values(exportMapModules).map(m => m.default ?? m)
const allProfiles = Object.values(profileModules).map(m => m.default ?? m)

// ── Styles ────────────────────────────────────────────────────────────────────
const style = document.createElement('style')
style.textContent = `
.tb-btn { background:transparent; color:rgba(255,255,255,.85); border:none;
  padding:4px 10px; font-size:12px; font-family:'DM Sans',sans-serif;
  cursor:pointer; height:45px; border-radius:3px; white-space:nowrap; transition:background .15s; }
.tb-btn:hover  { background:rgba(255,255,255,.12); color:#fff; }
.tb-btn-accent { border:1px solid rgba(255,255,255,.3); }
.tb-btn-active { background:rgba(255,255,255,.18) !important; color:#fff !important; }
.tb-sep { display:inline-block; width:1px; height:20px;
  background:rgba(255,255,255,.2); margin:0 4px; vertical-align:middle; }

#repo-tabs { display:flex; align-items:stretch; background:#162032;
  border-bottom:1px solid rgba(255,255,255,.1); overflow-x:auto; flex-shrink:0; height:32px; }
.repo-tab { display:flex; align-items:center; gap:6px; padding:0 14px; font-size:11px;
  font-family:'DM Sans',sans-serif; color:rgba(255,255,255,.5); cursor:pointer; border:none;
  background:none; white-space:nowrap; border-right:1px solid rgba(255,255,255,.06); }
.repo-tab:hover  { background:rgba(255,255,255,.06); color:rgba(255,255,255,.8); }
.repo-tab.active { background:#1E3A5F; color:#fff; }
.repo-tab .tab-close { font-size:13px; opacity:.4; padding:0 2px; }
.repo-tab .tab-close:hover { opacity:1; background:rgba(255,255,255,.2); }
.repo-tab .tab-dirty { width:6px; height:6px; border-radius:50%; background:#F59E0B; flex-shrink:0; }
.repo-tab-add { padding:0 12px; color:rgba(255,255,255,.4); cursor:pointer;
  font-size:16px; line-height:32px; border:none; background:none; }
.repo-tab-add:hover { color:rgba(255,255,255,.8); }

.repo-canvas-host { position:absolute; inset:0; }
.repo-canvas-host.hidden { display:none; }
.bpmn-canvas-inner { width:100%; height:100%; }

.canvas-empty { position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:10px; background:#FAFBFC; pointer-events:none; }
.canvas-empty-icon  { font-size:40px; opacity:.12; }
.canvas-empty-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700;
  color:#4A6580; opacity:.5; }
.canvas-empty-sub   { font-size:11px; color:#8A9BB0; text-align:center;
  max-width:280px; line-height:1.5; }

.lint-row { display:flex; align-items:flex-start; gap:8px; padding:3px 12px;
  cursor:pointer; border-bottom:1px solid #EDF0F5; }
.rp-tabs { display:flex; border-bottom:2px solid #D4DCE6; background:#F4F6F9; flex-shrink:0; }
.rp-tab  { padding:6px 12px; cursor:pointer; font-size:10px; font-weight:600; color:#8A9BB0;
  border:none; background:none; letter-spacing:.04em; text-transform:uppercase;
  border-bottom:2px solid transparent; margin-bottom:-2px; }
.rp-tab:hover  { color:#2E6DA4; }
.rp-tab.active { color:#1E3A5F; border-bottom-color:#2E6DA4; }
.rp-body { flex:1; overflow-y:auto; padding:10px 12px; }

.f-field { margin-bottom:8px; }
.f-label { display:block; font-size:10px; font-weight:600; color:#4A6580;
  text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
.f-input, .f-select { width:100%; padding:4px 7px; border:1px solid #D4DCE6; border-radius:3px;
  font-size:12px; font-family:'DM Sans',sans-serif; color:#1A2535; background:#fff; box-sizing:border-box; }
.f-input:focus, .f-select:focus { outline:none; border-color:#2E6DA4; }
.f-hint    { font-size:10px; color:#8A9BB0; font-style:italic; margin-top:2px; }
.f-section { font-size:10px; font-weight:700; color:#2E6DA4; text-transform:uppercase;
  letter-spacing:.08em; border-bottom:1px solid #D4DCE6; padding-bottom:3px; margin:10px 0 7px; }
.f-section:first-child { margin-top:0; }

.flow-card { background:#F4F6F9; border:1px solid #D4DCE6; border-radius:4px;
  padding:7px 10px; margin-bottom:6px; }
.flow-card-title { font-weight:600; font-size:11px; color:#1E3A5F; }
.flow-card-sub   { font-size:10px; color:#8A9BB0; margin-top:2px; }
.flow-card-actions { display:flex; gap:4px; margin-top:5px; }

.btn-sm { padding:3px 9px; border-radius:3px; font-size:11px; cursor:pointer;
  font-family:'DM Sans',sans-serif; border:1px solid #D4DCE6; background:#fff; color:#2E6DA4; }
.btn-sm:hover { background:#EEF4FB; }
.btn-sm.danger { color:#B84040; border-color:#DDB8B8; }
.btn-sm.danger:hover { background:#FBF3F3; }
.btn-full { width:100%; padding:6px; background:#1E3A5F; color:#fff; border:none;
  border-radius:3px; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif;
  cursor:pointer; margin-top:6px; }
.btn-full:hover { background:#2E6DA4; }
.btn-add { display:inline-flex; align-items:center; gap:3px; padding:3px 9px;
  background:#EEF4FB; border:1px solid #A8C0D8; border-radius:3px;
  color:#2E6DA4; font-size:10px; font-weight:600; cursor:pointer; }

.ext-field        { padding:6px 8px; border-radius:3px; margin-bottom:5px; }
.ext-field.active { background:#EEF4FB; border:1px solid #C0D4E8; }
.ext-field.inactive { background:#F8F8F8; border:1px solid #E8E8E8; opacity:.7; }
.ext-field-label  { font-size:10px; font-weight:600; color:#4A6580; text-transform:uppercase;
  letter-spacing:.04em; margin-bottom:3px; display:flex; justify-content:space-between; }
.ext-field-ns     { font-size:9px; color:#A8C0D8; font-weight:400; font-family:monospace; }
.ext-field input, .ext-field select { width:100%; padding:3px 6px; border:1px solid #D4DCE6;
  border-radius:3px; font-size:11px; font-family:'DM Sans',sans-serif; background:#fff; }
.ext-group-title  { font-size:10px; font-weight:700; color:#2E6DA4; letter-spacing:.06em;
  text-transform:uppercase; margin:8px 0 4px; padding-bottom:2px; border-bottom:1px solid #D4DCE6; }
.ext-inactive-header { display:flex; align-items:center; justify-content:space-between;
  padding:4px 6px; background:#F0F0F0; border-radius:3px; cursor:pointer;
  font-size:10px; color:#8A9BB0; margin-bottom:4px; }

#bpmn-canvas { width:100%; height:100%; }
.bio-properties-panel { height:100%; }
.djs-palette-entries  { overflow-y:auto; }
.djs-palette .djs-palette-toggle { display:none; }
`
document.head.appendChild(style)

// ── Diagram templates ─────────────────────────────────────────────────────────
function newCollaborationXml(id) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:semarch="http://semarch.io/schema/1.0"
  targetNamespace="http://semarch.io/repository" id="Def_${id}">
  <bpmn:extensionElements>
    <semarch:BusinessContext systemType="" systemName="" owner=""
      organization="" normativeRefs="" programs="" communities=""/>
    <semarch:RepositoryLifecycle version="1.0" status="Draft"
      maturity="L1" lastReview="" reviewCycle="Annual" governedBy=""/>
  </bpmn:extensionElements>
  <bpmn:collaboration id="Collab_${id}">
    <bpmn:participant id="Part_A_${id}" name="System A" processRef="Proc_A_${id}"/>
    <bpmn:participant id="Part_B_${id}" name="System B" processRef="Proc_B_${id}"/>
  </bpmn:collaboration>
  <bpmn:process id="Proc_A_${id}" isExecutable="true">
    <bpmn:startEvent id="Start_A_${id}" name="Start"/>
  </bpmn:process>
  <bpmn:process id="Proc_B_${id}" isExecutable="false">
    <bpmn:startEvent id="Start_B_${id}" name="Start"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_${id}">
    <bpmndi:BPMNPlane id="Plane_${id}" bpmnElement="Collab_${id}">
      <bpmndi:BPMNShape id="PA_${id}" bpmnElement="Part_A_${id}" isHorizontal="true">
        <dc:Bounds x="120" y="80" width="600" height="160"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="SA_${id}" bpmnElement="Start_A_${id}">
        <dc:Bounds x="200" y="142" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="PB_${id}" bpmnElement="Part_B_${id}" isHorizontal="true">
        <dc:Bounds x="120" y="280" width="600" height="160"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="SB_${id}" bpmnElement="Start_B_${id}">
        <dc:Bounds x="200" y="342" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}

function newProcessXml(id, label) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:semarch="http://semarch.io/schema/1.0"
  targetNamespace="http://semarch.io/repository" id="Def_${id}">
  <bpmn:extensionElements>
    <semarch:BusinessContext systemType="" systemName="" owner=""
      organization="" normativeRefs="" programs="" communities=""/>
    <semarch:RepositoryLifecycle version="1.0" status="Draft"
      maturity="L1" lastReview="" reviewCycle="Annual" governedBy=""/>
  </bpmn:extensionElements>
  <bpmn:process id="Proc_${id}" name="${label}" isExecutable="true">
    <bpmn:startEvent id="Start_${id}" name="Start"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_${id}">
    <bpmndi:BPMNPlane id="Plane_${id}" bpmnElement="Proc_${id}">
      <bpmndi:BPMNShape id="S_${id}" bpmnElement="Start_${id}">
        <dc:Bounds x="200" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}

// Safe zoom — only when container has real dimensions
function safeZoom(modeler) {
  requestAnimationFrame(() => {
    try {
      const canvas = modeler.get('canvas')
      const c = canvas._container
      if (c && c.offsetWidth > 0 && c.offsetHeight > 0) canvas.zoom('fit-viewport')
    } catch {}
  })
}

// ── Repository class ──────────────────────────────────────────────────────────
let _repoCounter = 0
class Repository {
  constructor(options = {}) {
    _repoCounter++
    this.id          = options.id      || `repo-${_repoCounter}`
    this.label       = options.label   || `Repository ${_repoCounter}`
    this.bpmnXml     = options.bpmnXml || null
    this.dirty       = false
    this.importFlows = options.importFlows || []
    this.exportFlows = options.exportFlows || []

    this.container = document.createElement('div')
    this.container.className = 'repo-canvas-host hidden'
    this.container.dataset.repoId = this.id

    this._canvasEl = document.createElement('div')
    this._canvasEl.id = `bpmn-canvas-${this.id}`
    this._canvasEl.className = 'bpmn-canvas-inner'
    this.container.appendChild(this._canvasEl)

    this._emptyEl = document.createElement('div')
    this._emptyEl.className = 'canvas-empty'
    this._emptyEl.innerHTML = `
      <div class="canvas-empty-icon">⬜</div>
      <div class="canvas-empty-title">Empty repository</div>
      <div class="canvas-empty-sub">
        Click <b>+ Diagram</b> to create a new diagram,<br>
        or <b>Import file</b> to load an existing BPMN file.
      </div>`
    this.container.appendChild(this._emptyEl)

    this.propsEl = document.createElement('div')
    this.propsEl.id = `bpmn-props-${this.id}`
    this.propsEl.style.cssText = 'height:100%;overflow-y:auto;'

    this.profileEngine = new ProfileEngine(allProfiles)
    this._modeler      = null
    this._mergeEngine  = null
    this._linterEngine = null
    this._lintIssues   = []
    this._modelerReady = false
  }

  _setEmpty(isEmpty) {
    this._emptyEl.style.display  = isEmpty ? 'flex'  : 'none'
    this._canvasEl.style.display = isEmpty ? 'none'  : 'block'
  }

  async ensureModeler() {
    if (this._modelerReady) return this._modeler
    const modeler = new BpmnModeler({
      container: this._canvasEl,
      propertiesPanel: { parent: this.propsEl },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
      moddleExtensions: globalRegistry.getExtensions()
    })
    this._modeler     = modeler
    this._mergeEngine = new MergeEngine(modeler.get('moddle'))
    this._linterEngine = new LinterEngine(
      modeler,
      issues => { this._lintIssues = issues; workspace.onLintResults(this.id, issues) },
      this.profileEngine, this._mergeEngine
    )
    modeler.on('commandStack.changed', async () => {
      try {
        const { xml } = await modeler.saveXML({ format: true })
        this.bpmnXml = xml; this.dirty = true; workspace.renderTabs()
      } catch {}
    })
    if (this.bpmnXml) {
      await modeler.importXML(this.bpmnXml)
      this._setEmpty(false)
    } else {
      this._setEmpty(true)
    }
    this._modelerReady = true
    this._extractPalette()
    this._updateProfileContext()
    return modeler
  }

  async loadXml(xml) {
    await this.ensureModeler()
    await this._modeler.importXML(xml)
    this.bpmnXml = xml; this.dirty = true
    this._setEmpty(false)
    safeZoom(this._modeler)
    this._extractPalette()
    this._updateProfileContext()
    workspace.renderTabs()
  }

  _extractPalette() {
    if (!this._modeler) return
    const el   = this.container.querySelector('.djs-palette')
    const left = layout.el('left')
    if (!el || left._currentRepoId === this.id) return
    left.innerHTML = ''
    left.appendChild(el)
    left._currentRepoId = this.id
    Object.assign(el.style, {
      position:'relative', left:'0', top:'0', width:'100%', height:'100%',
      border:'none', borderRadius:'0', boxShadow:'none', background:'transparent'
    })
  }

  getDefinitions() {
    try {
      if (!this._modeler) return null
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
    this.profileEngine.activate({
      businessContext: { systemType: bc.systemType, normativeRefs: bc.normativeRefs },
      lifecycle: { maturity: lc.maturity, status: lc.status },
      technicalRealization: tr
    })
    if (this._linterEngine) this._linterEngine.run()
  }

  async serialize() {
    if (this._modeler && this.bpmnXml) {
      const { xml } = await this._modeler.saveXML({ format: true })
      this.bpmnXml = xml
    }
    return this.bpmnXml
  }

  markClean() { this.dirty = false; workspace.renderTabs() }
}

// ── Workspace ─────────────────────────────────────────────────────────────────
const workspace = {
  repos: new Map(), activeId: null,

  new(options = {}) {
    const repo = new Repository(options)
    this.repos.set(repo.id, repo)
    canvasHost.appendChild(repo.container)
    this.activate(repo.id)
    return repo
  },

  async openXml(xml, label) {
    const repo = this.new({ label })
    await repo.loadXml(xml)
    return repo
  },

  async initFromImport(xml, importMap, label) {
    const engine = new ImportEngine(globalRegistry)
    let enriched
    try   { enriched = engine.apply(importMap, xml) }
    catch (err) { alert(`Import transform failed: ${err.message}`); return null }
    return this.openXml(enriched, label || `Imported — ${importMap.label}`)
  },

  close(id) {
    const repo = this.repos.get(id); if (!repo) return
    if (repo.dirty && !confirm(`"${repo.label}" has unsaved changes. Close anyway?`)) return
    canvasHost.removeChild(repo.container)
    this.repos.delete(id)
    if (this.activeId === id) {
      const remaining = Array.from(this.repos.keys())
      if (remaining.length) this.activate(remaining[remaining.length - 1])
      else { this.activeId = null; this.renderTabs(); renderRightPanel() }
    } else { this.renderTabs() }
  },

  async activate(id) {
    this.repos.forEach(r => r.container.classList.add('hidden'))
    const repo = this.repos.get(id); if (!repo) return
    this.activeId = id
    repo.container.classList.remove('hidden')  // show BEFORE ensureModeler
    await repo.ensureModeler()
    if (repo._modeler && repo.bpmnXml) safeZoom(repo._modeler)  // zoom after visible
    const slot = document.getElementById('props-slot')
    if (slot) { slot.innerHTML = ''; slot.appendChild(repo.propsEl) }
    repo._extractPalette()
    this.renderTabs()
    renderRightPanel()
    renderLintPanel(repo._lintIssues)
  },

  active() { return this.repos.get(this.activeId) || null },

  renderTabs() {
    const el = document.getElementById('repo-tabs'); if (!el) return
    const tabs = Array.from(this.repos.values()).map(r => `
      <button class="repo-tab ${r.id === this.activeId ? 'active' : ''}"
        onclick="workspace.activate('${r.id}')">
        ${r.dirty ? '<span class="tab-dirty"></span>' : ''}
        <span>${r.label}</span>
        <span class="tab-close"
          onclick="event.stopPropagation();workspace.close('${r.id}')">x</span>
      </button>`).join('')
    el.innerHTML = tabs +
      `<button class="repo-tab-add" onclick="workspace.new()" title="New repository">+</button>`
  },

  onLintResults(repoId, issues) {
    if (repoId === this.activeId) renderLintPanel(issues)
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────
const layout = new w2layout({
  box: '#app', name: 'main-layout',
  panels: [
    { type:'top',    size:77, resizable:false,
      style:'overflow:hidden;padding:0;background:#1E3A5F;' },
    { type:'left',   size:50, resizable:false,
      style:'background:#F4F6F9;border-right:1px solid #D4DCE6;overflow:hidden;padding:0;' },
    { type:'main',   style:'background:#fff;overflow:hidden;position:relative;' },
    { type:'right',  size:340, resizable:true,
      style:'background:#fff;border-left:1px solid #D4DCE6;overflow:hidden;' },
    { type:'bottom', size:120, resizable:true,
      style:'background:#F4F6F9;border-top:1px solid #D4DCE6;overflow:hidden;' }
  ]
})

layout.el('top').innerHTML = `
<div style="height:45px;display:flex;align-items:center;padding:0 10px;gap:2px;">
  <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;
    letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:0 12px;
    white-space:nowrap;">Semantic Process Mediator</span>
  <span class="tb-sep"></span>
  <button class="tb-btn" id="btn-new-repo">New repo</button>
  <button class="tb-btn" id="btn-save-repo">Save</button>
  <span class="tb-sep"></span>
  <button class="tb-btn tb-btn-accent" id="btn-new-diagram">+ Diagram</button>
  <span class="tb-sep"></span>
  <button class="tb-btn" id="btn-import-file">Import file</button>
  <button class="tb-btn tb-btn-accent" id="btn-import-new">⊕ Init from import</button>
  <span class="tb-sep"></span>
  <button class="tb-btn" id="btn-export-xml">Export XML</button>
  <button class="tb-btn" id="btn-export-flows">Export flows</button>
  <span class="tb-sep"></span>
  <button class="tb-btn" id="btn-fit">Fit</button>
  <span class="tb-sep"></span>
  <button class="tb-btn tb-btn-active" id="btn-repo">Repository</button>
  <button class="tb-btn" id="btn-props">Properties</button>
  <button class="tb-btn" id="btn-lint">Lint</button>
  <span style="flex:1"></span>
  <span id="lint-badge" style="display:none;font-family:monospace;font-size:11px;
    background:rgba(255,255,255,.12);color:#fff;padding:2px 10px;border-radius:20px;"></span>
</div>
<div id="repo-tabs"></div>`

const mainEl = layout.el('main')
mainEl.style.position = 'relative'
const canvasHost = document.createElement('div')
canvasHost.style.cssText = 'position:absolute;inset:0;'
mainEl.appendChild(canvasHost)

layout.el('right').innerHTML = `
<div style="height:100%;display:flex;flex-direction:column;">
  <div id="panel-repo"  style="height:100%;display:flex;flex-direction:column;"></div>
  <div id="panel-props" style="height:100%;display:none;flex-direction:column;">
    <div id="props-slot" style="height:100%;overflow-y:auto;"></div>
  </div>
</div>`

layout.el('bottom').innerHTML = `
<div style="height:100%;display:flex;flex-direction:column;">
  <div style="display:flex;align-items:center;padding:3px 12px;background:#EDF0F5;
    border-bottom:1px solid #D4DCE6;gap:8px;flex-shrink:0;">
    <span style="font-family:monospace;font-size:10px;font-weight:600;color:#4A6580;
      letter-spacing:.08em;text-transform:uppercase;">Linting</span>
    <span id="lint-summary" style="font-family:monospace;font-size:10px;color:#8A9BB0;"></span>
  </div>
  <div id="lint-results" style="flex:1;overflow-y:auto;padding:4px 0;"></div>
</div>`

// ── Right panel ───────────────────────────────────────────────────────────────
let _rpTab = 'context'

function renderRightPanel() {
  const repo = workspace.active()
  const el   = document.getElementById('panel-repo'); if (!el) return
  if (!repo) {
    el.innerHTML = `<div style="padding:24px 16px;font-size:12px;color:#8A9BB0;
      text-align:center;line-height:1.6;">
      No repository open.<br>Click <b>New repo</b> to start.</div>`
    return
  }
  const lc  = repo.getExtValue('semarch:RepositoryLifecycle')
  const mat = lc.maturity || 'L1'
  const tabs = ['context','flows','fields'].map(t =>
    `<button class="rp-tab ${_rpTab===t?'active':''}" onclick="window._rpTab('${t}')">
      ${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:5px 10px;background:#1E3A5F;flex-shrink:0;">
      <span style="font-family:monospace;font-size:10px;color:#A8C4DC;
        letter-spacing:.08em;text-transform:uppercase;overflow:hidden;
        text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${repo.label}</span>
      <span style="font-family:monospace;font-size:10px;font-weight:700;
        padding:1px 7px;border-radius:20px;background:rgba(255,255,255,.12);
        color:#fff;flex-shrink:0;">${mat}</span>
    </div>
    <div class="rp-tabs">${tabs}</div>
    <div class="rp-body" id="rp-body"></div>
    <div style="padding:6px 10px;border-top:1px solid #D4DCE6;flex-shrink:0;">
      <button class="btn-full" onclick="window._rpSaveContext()">
        Save context to BPMN</button>
    </div>`
  renderRpBody()
}

function renderRpBody() {
  const el = document.getElementById('rp-body')
  const repo = workspace.active()
  if (!el || !repo) return
  if (_rpTab === 'context') el.innerHTML = buildContextTab(repo)
  if (_rpTab === 'flows')   el.innerHTML = buildFlowsTab(repo)
  if (_rpTab === 'fields')  el.innerHTML = buildFieldsTab(repo)
}

window._rpTab = id => { _rpTab = id; renderRpBody() }

function buildContextTab(repo) {
  const bc = repo.getExtValue('semarch:BusinessContext')
  const lc = repo.getExtValue('semarch:RepositoryLifecycle')
  const f  = (id, label, val, ph, type='input', hint='') => {
    const inner = type === 'select'
      ? `<select class="f-select" id="${id}">${val}</select>`
      : `<input class="f-input" type="text" id="${id}" placeholder="${ph}" value="${val||''}"/>`
    return `<div class="f-field"><label class="f-label">${label}</label>${inner}
      ${hint ? `<div class="f-hint">${hint}</div>` : ''}</div>`
  }
  const typeOpts = ['','BMS','CoC','Programme','Activite'].map(v =>
    `<option value="${v}" ${bc.systemType===v?'selected':''}>${v||'— select —'}</option>`).join('')
  const matOpts  = ['L1','L2','L3','L4'].map(v =>
    `<option value="${v}" ${lc.maturity===v?'selected':''}>${v}</option>`).join('')
  const statOpts = ['Draft','Active','Archived','Deprecated'].map(v =>
    `<option value="${v}" ${lc.status===v?'selected':''}>${v}</option>`).join('')
  return `
    <div class="f-section">Applicative System</div>
    ${f('ctx-type','System Type',`<option value="">-</option>${typeOpts}`,'','select',
      'BMS · CoC · Programme · Activite')}
    ${f('ctx-name','System Name',bc.systemName||'','CoC Avionics Process Repository',
      'input','Name the system — not the software product')}
    ${f('ctx-owner','Owner',bc.owner||'','CoC Avionics')}
    ${f('ctx-org','Organisation',bc.organization||'','Airbus Defence and Space')}
    <div class="f-section">Normative</div>
    ${f('ctx-std','Normative Refs',bc.normativeRefs||'','DO-178C ECSS-Q-ST-80',
      'input','Space-separated')}
    ${f('ctx-prog','Programmes',bc.programs||'','A400M EURODRONE','input','Space-separated')}
    ${f('ctx-com','Communities',bc.communities||'','MIWG ASD-SSG AFIS','input','Space-separated')}
    <div class="f-section">Lifecycle</div>
    ${f('ctx-mat','Maturity',matOpts,'','select')}
    ${f('ctx-status','Status',statOpts,'','select')}
    ${f('ctx-ver','Version',lc.version||'1.0','1.0')}
    ${f('ctx-review','Last Review',lc.lastReview||'','YYYY-MM-DD')}
    ${f('ctx-gov','Governed By',lc.governedBy||'','CoC Process Owner')}`
}

window._rpSaveContext = function() {
  const repo = workspace.active()
  if (!repo || !repo._modeler) return
  const defs = repo.getDefinitions(); if (!defs) return
  repo._mergeEngine.mergeDefinitions(defs, 'semarch', {
    BusinessContext: {
      systemType:    document.getElementById('ctx-type')?.value   || '',
      systemName:    document.getElementById('ctx-name')?.value   || '',
      owner:         document.getElementById('ctx-owner')?.value  || '',
      organization:  document.getElementById('ctx-org')?.value    || '',
      normativeRefs: document.getElementById('ctx-std')?.value    || '',
      programs:      document.getElementById('ctx-prog')?.value   || '',
      communities:   document.getElementById('ctx-com')?.value    || ''
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

function buildFlowsTab(repo) {
  const iCards = repo.importFlows.map((f,i) => `
    <div class="flow-card">
      <div class="flow-card-title">${f.label||f.mapId}</div>
      <div class="flow-card-sub">map: ${f.mapId}</div>
      <div class="flow-card-actions">
        <button class="btn-sm" onclick="window._runImportFlow('${i}')">Run</button>
        <button class="btn-sm danger" onclick="window._deleteImportFlow('${i}')">x</button>
      </div>
    </div>`).join('')
  const eCards = repo.exportFlows.map((f,i) => `
    <div class="flow-card">
      <div class="flow-card-title">${f.label||f.mapId}</div>
      <div class="flow-card-sub">map: ${f.mapId} · ${f.filename||'auto'}</div>
      <div class="flow-card-actions">
        <button class="btn-sm" onclick="window._runExportFlow('${i}')">Run</button>
        <button class="btn-sm danger" onclick="window._deleteExportFlow('${i}')">x</button>
      </div>
    </div>`).join('')
  const mapOpts = exportMaps.map(m =>
    `<option value="${m.id}">${m.label||m.id}</option>`).join('')
  return `
    <div class="f-section">Import Flows
      <button class="btn-add" style="float:right"
        onclick="window._addImportFlow()">+ Add</button></div>
    ${iCards||'<div class="f-hint">No import flows.</div>'}
    <div class="f-section">Export Flows
      <button class="btn-add" style="float:right"
        onclick="window._addExportFlow()">+ Add</button></div>
    ${eCards||'<div class="f-hint">No export flows.</div>'}
    <div class="f-section">Quick Export</div>
    <select class="f-select" id="quick-export-map">${mapOpts}</select>
    <button class="btn-full" style="margin-top:4px"
      onclick="window._quickExport()">Export with selected map</button>
    <div class="f-section">Serialization</div>
    <button class="btn-full" onclick="window._serializeRepo()">
      Save canonical BPMN</button>`
}

function buildFieldsTab(repo) {
  const profiles = repo.profileEngine.getActiveProfiles()
  if (!profiles.length) {
    return `<div class="f-hint" style="padding:10px;">
      No profiles active. Set System Type and Maturity in Context tab.</div>`
  }
  return `
    <div class="f-hint" style="margin-bottom:8px;">
      Active: ${profiles.map(p=>`<b>${p.label}</b>`).join(', ')}<br>
      Select an element on the canvas to edit its extension fields.
    </div>
    <div id="fields-body">
      <div style="font-size:11px;color:#8A9BB0;padding:8px 0;">No element selected.</div>
    </div>`
}

// Flow management
window._addImportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  const opts = importMaps.map(m=>`<option value="${m.id}">${m.label||m.id}</option>`).join('')
  w2popup.open({ title:'+ Add Import Flow', width:400, height:220,
    body:`<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Label</label>
        <input class="f-input" id="if-label" placeholder="Import from EA"/></div>
      <div class="f-field"><label class="f-label">Import Map</label>
        <select class="f-select" id="if-map">${opts}</select></div></div>`,
    buttons:`<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._saveImportFlow()">Save</button>`
  })
}
window._saveImportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  repo.importFlows.push({
    label: document.getElementById('if-label')?.value||'',
    mapId: document.getElementById('if-map')?.value||'', source:'file'
  })
  w2popup.close(); renderRpBody()
}
window._deleteImportFlow = i => { workspace.active()?.importFlows.splice(i,1); renderRpBody() }
window._runImportFlow = async function(i) {
  const repo = workspace.active(); if (!repo) return
  const flow = repo.importFlows[i]; if (!flow) return
  const map  = importMaps.find(m=>m.id===flow.mapId); if (!map) { alert('Map not found'); return }
  const xml  = await _pickFile(); if (!xml) return
  const enriched = new ImportEngine(globalRegistry).apply(map, xml)
  await repo.loadXml(enriched)
}
window._addExportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  const opts = exportMaps.map(m=>`<option value="${m.id}">${m.label||m.id}</option>`).join('')
  w2popup.open({ title:'+ Add Export Flow', width:400, height:260,
    body:`<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Label</label>
        <input class="f-input" id="ef-label" placeholder="Export to ARIS"/></div>
      <div class="f-field"><label class="f-label">Export Map</label>
        <select class="f-select" id="ef-map">${opts}</select></div>
      <div class="f-field"><label class="f-label">Filename</label>
        <input class="f-input" id="ef-filename" value="{repoId}_{date}.bpmn"/>
        <div class="f-hint">{repoId} {date} {owner}</div></div></div>`,
    buttons:`<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._saveExportFlow()">Save</button>`
  })
}
window._saveExportFlow = function() {
  const repo = workspace.active(); if (!repo) return
  repo.exportFlows.push({
    label:    document.getElementById('ef-label')?.value||'',
    mapId:    document.getElementById('ef-map')?.value||'',
    filename: document.getElementById('ef-filename')?.value||'{repoId}_{date}.bpmn'
  })
  w2popup.close(); renderRpBody()
}
window._deleteExportFlow = i => { workspace.active()?.exportFlows.splice(i,1); renderRpBody() }
window._runExportFlow = async function(i) {
  const repo = workspace.active(); if (!repo) return
  const flow = repo.exportFlows[i]; if (!flow) return
  const map  = exportMaps.find(m=>m.id===flow.mapId); if (!map) { alert('Map not found'); return }
  const xml  = await repo.serialize(); if (!xml) return
  const out  = new ExportEngine(globalRegistry).apply(map, xml)
  await _saveFile(out, _resolveFilename(flow.filename||'{repoId}_{date}.bpmn', repo),
    'application/xml', 'BPMN', ['.bpmn','.xml'])
}
window._quickExport = async function() {
  const repo  = workspace.active(); if (!repo) return
  const mapId = document.getElementById('quick-export-map')?.value
  const map   = exportMaps.find(m=>m.id===mapId); if (!map) return
  const xml   = await repo.serialize(); if (!xml) return
  const out   = new ExportEngine(globalRegistry).apply(map, xml)
  await _saveFile(out, _resolveFilename('{repoId}_{date}.bpmn', repo),
    'application/xml', 'BPMN', ['.bpmn','.xml'])
}
window._serializeRepo = async function() {
  const repo = workspace.active(); if (!repo) return
  const xml  = await repo.serialize()
  if (!xml) { alert('Nothing to save yet.'); return }
  await _saveFile(xml, _resolveFilename('{repoId}_{date}.bpmn', repo),
    'application/xml', 'BPMN Canonical', ['.bpmn','.xml'])
  repo.markClean()
}

// Element fields
function renderElementFields(repo, element) {
  const el = document.getElementById('fields-body'); if (!el) return
  if (!element) {
    el.innerHTML = '<div style="font-size:11px;color:#8A9BB0;padding:8px 0;">No element selected.</div>'
    return
  }
  const bo = element.businessObject
  const currentValues = {}
  ;(bo.extensionElements?.values||[]).forEach(entry => {
    const [ns, typeName] = entry.$type.split(':')
    if (!currentValues[ns]) currentValues[ns] = {}
    if (!currentValues[ns][typeName]) currentValues[ns][typeName] = {}
    Object.keys(entry).forEach(k => { if (!k.startsWith('$')) currentValues[ns][typeName][k] = entry[k] })
  })
  const fields   = repo.profileEngine.getFields(element.type, currentValues)
  const groups   = {}
  fields.filter(f=>f.state==='active').forEach(f => {
    const g = f.group||f.namespace; if (!groups[g]) groups[g]=[]
    groups[g].push(f)
  })
  const inactive = fields.filter(f=>f.state==='inactive-present')
  let html = ''
  Object.entries(groups).forEach(([group, gfields]) => {
    html += `<div class="ext-group-title">${group}</div>`
    gfields.forEach(field => {
      const ph = (field.hint||'').replace(/"/g,"'")
      const input = field.type === 'enum'
        ? `<select onchange="window._setField('${repo.id}','${element.id}',this.value,'${field.targetType}','${field.targetAttr}')">
            <option value="">-</option>
            ${(field.values||[]).map(v=>`<option value="${v}" ${field.value===v?'selected':''}>${v}</option>`).join('')}
           </select>`
        : `<input type="text" value="${field.value||''}" placeholder="${ph}"
            onchange="window._setField('${repo.id}','${element.id}',this.value,'${field.targetType}','${field.targetAttr}')"/>`
      html += `<div class="ext-field active">
        <div class="ext-field-label">
          <span>${field.label}${field.required?' <span style="color:#B84040">*</span>':''}</span>
          <span class="ext-field-ns">${field.id}</span>
        </div>${input}</div>`
    })
  })
  if (inactive.length) {
    html += `<div class="ext-inactive-header"
      onclick="var b=document.getElementById('inact');b.style.display=b.style.display==='none'?'block':'none'">
      <span>Inactive data (${inactive.length})</span><span>v</span></div>
      <div id="inact" style="display:none;">`
    inactive.forEach(field => {
      html += `<div class="ext-field inactive">
        <div class="ext-field-label"><span>${field.label}</span>
          <span class="ext-field-ns">${field.id}</span></div>
        <input type="text" value="${field.value||''}" readonly
          style="background:#F0F0F0;color:#8A9BB0;cursor:not-allowed;"/>
        <div style="text-align:right;margin-top:3px;">
          <button class="btn-sm danger" style="font-size:9px;padding:1px 7px"
            onclick="window._removeNsData('${repo.id}','${element.id}','${field.namespace}')">
            Remove ${field.namespace}:</button></div></div>`
    })
    html += '</div>'
  }
  el.innerHTML = html || '<div style="font-size:11px;color:#8A9BB0;">No fields for this type.</div>'
}

window._setField = function(repoId, elementId, value, targetType, targetAttr) {
  const repo   = workspace.repos.get(repoId); if (!repo) return
  const el     = repo._modeler?.get('elementRegistry').get(elementId); if (!el) return
  const bo     = el.businessObject
  const moddle = repo._modeler.get('moddle')
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values:[] })
    bo.extensionElements.$parent = bo
  }
  if (!Array.isArray(bo.extensionElements.values)) bo.extensionElements.values = []
  let entry = bo.extensionElements.values.find(v=>v.$type===targetType)
  if (!entry) {
    try { entry = moddle.create(targetType, {}); entry.$parent = bo.extensionElements
          bo.extensionElements.values.push(entry) }
    catch (err) { console.warn('_setField:', err.message); return }
  }
  entry[targetAttr] = value; repo.dirty = true; workspace.renderTabs()
}

window._removeNsData = function(repoId, elementId, namespace) {
  const repo = workspace.repos.get(repoId); if (!repo) return
  const el   = repo._modeler?.get('elementRegistry').get(elementId); if (!el) return
  const preview = repo._mergeEngine.prepareRemove(el, namespace)
  if (!preview.length) return
  if (!confirm(`Remove all "${namespace}:" data?\n\n${preview.map(p=>`- ${p.type}`).join('\n')}`)) return
  repo._mergeEngine.remove(el, namespace)
  renderElementFields(repo, el)
}

// Linting
function renderLintPanel(issues=[]) {
  const container = document.getElementById('lint-results')
  const summary   = document.getElementById('lint-summary')
  const badge     = document.getElementById('lint-badge')
  if (!container) return
  if (!issues.length) {
    if (badge) badge.style.display='none'
    if (summary) summary.textContent='No issues'
    container.innerHTML=`<div style="padding:8px 14px;font-family:monospace;
      font-size:11px;color:#6BAF92;">All rules passed</div>`
    return
  }
  const E=issues.filter(i=>i.severity==='error').length
  const W=issues.filter(i=>i.severity==='warning').length
  const I=issues.filter(i=>i.severity==='info').length
  const parts=[]; if(E) parts.push(`${E}E`); if(W) parts.push(`${W}W`); if(I) parts.push(`${I}I`)
  if (badge) { badge.style.display=''; badge.textContent=parts.join(' - ') }
  if (summary) summary.textContent=`${issues.length} issue${issues.length>1?'s':''}`
  const sev = {
    error:  {dot:'#B84040',bg:'#FBF3F3',text:'#7A2020'},
    warning:{dot:'#C47A2B',bg:'#FBF6F0',text:'#6A4010'},
    info:   {dot:'#2E6DA4',bg:'#EEF4FB',text:'#1A3A5A'}
  }
  container.innerHTML = issues.map(issue => {
    const c    = sev[issue.severity]||sev.info
    const name = issue.element.businessObject?.name ? ` - ${issue.element.businessObject.name}` : ''
    return `<div class="lint-row" data-repo="${workspace.activeId}" data-eid="${issue.element.id}"
      onmouseover="this.style.background='${c.bg}'" onmouseout="this.style.background=''">
      <span style="width:6px;height:6px;border-radius:50%;background:${c.dot};
        flex-shrink:0;margin-top:4px;"></span>
      <div>
        <span style="font-family:monospace;font-size:10px;color:#8A9BB0;">${issue.rule}</span>
        <span style="font-family:monospace;font-size:10px;font-weight:600;
          color:${c.text};margin-left:6px;">${issue.element.id}${name}</span>
        <div style="font-size:11px;color:#4A6580;line-height:1.35;">${issue.message}</div>
      </div></div>`
  }).join('')
  container.querySelectorAll('.lint-row').forEach(row => {
    row.addEventListener('click', () => {
      const repo = workspace.repos.get(row.dataset.repo); if (!repo) return
      const el   = repo._modeler?.get('elementRegistry').get(row.dataset.eid)
      if (el) { repo._modeler.get('selection').select(el)
                repo._modeler.get('canvas').scrollToElement(el) }
    })
  })
}

// File utilities
function _pickFile(accept='.bpmn,.xml') {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type='file'; input.accept=accept
    input.onchange = () => {
      const file = input.files[0]; if (!file) { resolve(null); return }
      const reader = new FileReader()
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
        suggestedName, types:[{description, accept:{[mimeType]:exts}}]
      })
      const writable = await handle.createWritable()
      await writable.write(content); await writable.close(); return
    } catch (err) { if (err.name==='AbortError') return }
  }
  const blob=new Blob([content],{type:mimeType}), a=document.createElement('a')
  a.href=URL.createObjectURL(blob); a.download=suggestedName; a.click()
  URL.revokeObjectURL(a.href)
}

function _resolveFilename(template, repo) {
  const bc=repo.getExtValue('semarch:BusinessContext')
  const date=new Date().toISOString().slice(0,10)
  return template
    .replace('{repoId}', repo.id)
    .replace('{date}', date)
    .replace('{owner}', (bc.owner||'repo').replace(/[^a-zA-Z0-9_-]/g,'_'))
}

// Toolbar events
document.getElementById('btn-new-repo').addEventListener('click', () => workspace.new())

document.getElementById('btn-save-repo').addEventListener('click', async () => {
  const repo=workspace.active(); if (!repo) return
  const xml=await repo.serialize()
  if (!xml) { alert('Nothing to save yet.'); return }
  await _saveFile(xml, _resolveFilename('{repoId}_{date}.bpmn',repo),
    'application/xml','BPMN Canonical',['.bpmn','.xml'])
  repo.markClean()
})

document.getElementById('btn-new-diagram').addEventListener('click', () => {
  const repo=workspace.active()
  if (!repo) { alert('Create or open a repository first.'); return }
  w2popup.open({ title:'+ New Diagram', width:380, height:220,
    body:`<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Diagram type</label>
        <select class="f-select" id="nd-type">
          <option value="collaboration">Collaboration (pools + message flows)</option>
          <option value="process">Single Process</option>
        </select>
        <div class="f-hint">Collaboration enables Message Flows between systems.</div></div>
      <div class="f-field"><label class="f-label">Label</label>
        <input class="f-input" id="nd-label" placeholder="e.g. SDLC Overview"/></div></div>`,
    buttons:`<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._doNewDiagram()">Create</button>`
  })
})

window._doNewDiagram = async function() {
  const repo  = workspace.active(); if (!repo) return
  const type  = document.getElementById('nd-type')?.value  || 'collaboration'
  const label = document.getElementById('nd-label')?.value || 'New Diagram'
  w2popup.close()
  const id  = label.replace(/[^a-zA-Z0-9]/g,'_') + '_' + Date.now()
  const xml = type === 'collaboration' ? newCollaborationXml(id) : newProcessXml(id, label)
  await repo.loadXml(xml)
  repo.label = label; workspace.renderTabs(); renderRightPanel()
}

document.getElementById('btn-import-file').addEventListener('click', async () => {
  const repo=workspace.active()
  if (!repo) { alert('Create or open a repository first.'); return }
  const xml=await _pickFile(); if (!xml) return
  await repo.loadXml(xml); renderRightPanel()
})

document.getElementById('btn-import-new').addEventListener('click', () => {
  const mapOpts=importMaps.map(m=>`<option value="${m.id}">${m.label||m.id}</option>`).join('')
  w2popup.open({ title:'Init new repo from import', width:420, height:230,
    body:`<div style="padding:14px;font-family:'DM Sans',sans-serif;">
      <div class="f-field"><label class="f-label">Import Map</label>
        <select class="f-select" id="ini-map">${mapOpts}</select></div>
      <div class="f-field"><label class="f-label">Repository Label</label>
        <input class="f-input" id="ini-label" placeholder="EA import"/></div></div>`,
    buttons:`<button class="w2ui-btn" onclick="w2popup.close()">Cancel</button>
      <button class="w2ui-btn w2ui-btn-blue" onclick="window._doInitFromImport()">Choose file</button>`
  })
})

window._doInitFromImport = async function() {
  const mapId=document.getElementById('ini-map')?.value
  const label=document.getElementById('ini-label')?.value||'Imported repository'
  const map=importMaps.find(m=>m.id===mapId); if (!map) { alert('Select a map.'); return }
  w2popup.close()
  const xml=await _pickFile(); if (!xml) return
  await workspace.initFromImport(xml, map, label)
}

document.getElementById('btn-export-xml').addEventListener('click', async () => {
  const repo=workspace.active(); if (!repo) return
  const xml=await repo.serialize()
  if (!xml) { alert('Nothing to export yet.'); return }
  await _saveFile(xml, _resolveFilename('{repoId}_{date}.bpmn',repo),
    'application/xml','BPMN',['.bpmn','.xml'])
})

document.getElementById('btn-export-flows').addEventListener('click', () => {
  _rpTab='flows'
  document.getElementById('panel-repo').style.display  ='flex'
  document.getElementById('panel-props').style.display ='none'
  document.getElementById('btn-repo').classList.add('tb-btn-active')
  document.getElementById('btn-props').classList.remove('tb-btn-active')
  renderRightPanel()
})

document.getElementById('btn-fit').addEventListener('click', () => {
  const repo=workspace.active()
  if (repo?._modeler && repo.bpmnXml) safeZoom(repo._modeler)
})

document.getElementById('btn-repo').addEventListener('click', () => {
  document.getElementById('panel-repo').style.display  ='flex'
  document.getElementById('panel-props').style.display ='none'
  document.getElementById('btn-repo').classList.add('tb-btn-active')
  document.getElementById('btn-props').classList.remove('tb-btn-active')
  renderRightPanel()
})

document.getElementById('btn-props').addEventListener('click', () => {
  document.getElementById('panel-repo').style.display  ='none'
  document.getElementById('panel-props').style.display ='flex'
  document.getElementById('btn-props').classList.add('tb-btn-active')
  document.getElementById('btn-repo').classList.remove('tb-btn-active')
})

document.getElementById('btn-lint').addEventListener('click', () => {
  workspace.active()?._linterEngine?.run()
})

// Element selection hook
function hookSelectionEvent(repo) {
  repo._modeler.on('selection.changed', ({newSelection}) => {
    if (workspace.activeId !== repo.id) return
    if (_rpTab !== 'fields') return
    renderElementFields(repo, newSelection?.[0]||null)
  })
}
const _origEnsure = Repository.prototype.ensureModeler
Repository.prototype.ensureModeler = async function() {
  const wasNull = !this._modelerReady
  const result  = await _origEnsure.call(this)
  if (wasNull && this._modeler) hookSelectionEvent(this)
  return result
}

// Initial state — one empty repository, no diagram loaded
workspace.new({ label: 'New Repository' })
