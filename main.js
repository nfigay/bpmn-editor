// ── w2ui ────────────────────────────────────────────────────────────────────
import { w2layout } from 'w2ui/w2ui-2.0.es6.js'
import 'w2ui/w2ui-2.0.min.css'

// ── bpmn-js ──────────────────────────────────────────────────────────────────
import BpmnModeler from 'bpmn-js/lib/Modeler'
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import CamundaBpmnModdle from 'camunda-bpmn-moddle/resources/camunda.json'

import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import '@bpmn-io/properties-panel/assets/properties-panel.css'

// ── Diagramme vide ───────────────────────────────────────────────────────────
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
  targetNamespace="http://bpmn.io/schema/bpmn"
  id="Def_1">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="242" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

// ── 1. Layout w2ui ───────────────────────────────────────────────────────────
const layout = new w2layout({
  box: '#app',
  name: 'main-layout',
  panels: [
    {
      type: 'top',
      size: 45,
      resizable: true,
      style: 'overflow: hidden; padding: 0; background: #2c3e50;'
    },
    {
      type: 'left',
      size: 50,
      resizable: false,
      style: 'background: #f8f8f8; border-right: 1px solid #ddd; overflow: hidden; padding: 0;'
    },
    {
      type: 'main',
      style: 'background: #fff; overflow: hidden;'
    },
    {
      type: 'right',
      size: 320,
      resizable: true,
      style: 'background: #fafafa; border-left: 1px solid #ddd; overflow: hidden;'
    }
  ]
})

// ── 2. Toolbar — HTML natif dans le panel top ────────────────────────────────
layout.el('top').innerHTML = `
  <div style="display:flex; align-items:center; height:45px; padding: 0 8px; gap: 2px;">
    <span class="tb-title">Semantic Mediator — BPMN</span>
    <span class="tb-sep"></span>
    <button class="tb-btn" id="btn-new">New</button>
    <button class="tb-btn" id="btn-import">Import…</button>
    <span class="tb-sep"></span>
    <button class="tb-btn" id="btn-export-xml">Export XML</button>
    <button class="tb-btn" id="btn-export-svg">Export SVG</button>
    <span class="tb-sep"></span>
    <button class="tb-btn" id="btn-fit">Fit</button>
  </div>
`

// ── 3. Conteneurs bpmn-js ────────────────────────────────────────────────────
layout.el('main').innerHTML  = '<div id="bpmn-canvas" style="width:100%;height:100%;"></div>'
layout.el('right').innerHTML = '<div id="bpmn-properties" style="height:100%;"></div>'

// ── 4. Modeler bpmn-js ───────────────────────────────────────────────────────
const modeler = new BpmnModeler({
  container: '#bpmn-canvas',
  propertiesPanel: { parent: '#bpmn-properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
  ],
  moddleExtensions: { camunda: CamundaBpmnModdle },
})

// ── 5. Extraction palette → panel gauche ────────────────────────────────────
function extractPalette() {
  const paletteEl = document.querySelector('#bpmn-canvas .djs-palette')
  if (!paletteEl) return
  const leftEl = layout.el('left')
  leftEl.innerHTML = ''
  leftEl.appendChild(paletteEl)
  Object.assign(paletteEl.style, {
    position: 'relative', left: '0', top: '0',
    width: '100%', height: '100%',
    border: 'none', borderRadius: '0',
    boxShadow: 'none', background: 'transparent',
  })
}

// ── 6. Fonctions métier ──────────────────────────────────────────────────────
async function loadDiagram(xml) {
  try {
    await modeler.importXML(xml)
    modeler.get('canvas').zoom('fit-viewport')
    extractPalette()
  } catch (err) {
    alert('Import failed: ' + err.message)
  }
}

function download(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── 7. Event listeners natifs ────────────────────────────────────────────────
document.getElementById('btn-new').addEventListener('click', () => {
  if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
    loadDiagram(EMPTY_DIAGRAM)
  }
})

const fileInput = document.getElementById('file-input')
document.getElementById('btn-import').addEventListener('click', () => {
  fileInput.value = ''
  fileInput.click()
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
    download(xml, 'diagram.bpmn', 'application/xml')
  } catch (err) {
    alert('XML export failed: ' + err.message)
  }
})

document.getElementById('btn-export-svg').addEventListener('click', async () => {
  try {
    const { svg } = await modeler.saveSVG()
    download(svg, 'diagram.svg', 'image/svg+xml')
  } catch (err) {
    alert('SVG export failed: ' + err.message)
  }
})

document.getElementById('btn-fit').addEventListener('click', () => {
  modeler.get('canvas').zoom('fit-viewport')
})

// ── 8. Chargement initial ────────────────────────────────────────────────────
loadDiagram(EMPTY_DIAGRAM)