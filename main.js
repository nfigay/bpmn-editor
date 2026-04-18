// ── w2ui ────────────────────────────────────────────────────────────────────
import { w2layout, w2toolbar, w2alert, w2confirm } from 'w2ui/w2ui-2.0.es6.js'
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
    <bpmn:startEvent id="StartEvent_1" name="Début"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="242" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

// ── 1. Layout w2ui — 4 panels ─────────────────────────────────────────────
const layout = new w2layout({
  box: '#app',
  name: 'main-layout',
  panels: [
    {
      type: 'top',
      size: 45,
      resizable: false,
      style: 'overflow: hidden; padding: 0;'
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

// ── 2. Toolbar ───────────────────────────────────────────────────────────────
const toolbar = new w2toolbar({
  box: layout.el('top'),
  name: 'main-toolbar',
  items: [
    {
      type: 'html',
      id: 'title',
      html: `<div style="
        padding: 0 16px; color: #ecf0f1; font-weight: 700;
        font-size: 12px; letter-spacing: .08em;
        line-height: 45px; text-transform: uppercase; white-space: nowrap;
      ">Médiateur Sémantique — BPMN</div>`
    },
    { type: 'spacer' },
    { type: 'button', id: 'btn-new',    text: 'Nouveau',   icon: 'w2ui-icon-plus' },
    { type: 'button', id: 'btn-import', text: 'Importer…', icon: 'w2ui-icon-folder' },
    { type: 'break' },
    {
      type: 'menu',
      id: 'btn-export',
      text: 'Exporter',
      icon: 'w2ui-icon-save',
      items: [
        { id: 'export-xml', text: 'Exporter BPMN / XML' },
        { id: 'export-svg', text: 'Exporter SVG' },
      ]
    },
    { type: 'break' },
    { type: 'button', id: 'btn-fit', text: 'Ajuster', icon: 'w2ui-icon-zoom' },
  ],
  onClick(event) {
    const id = event.detail?.item?.id ?? event.target
    switch (id) {
      case 'btn-new':    handleNew();       break
      case 'btn-import': handleImport();    break
      case 'export-xml': handleExportXML(); break
      case 'export-svg': handleExportSVG(); break
      case 'btn-fit':    handleFit();       break
    }
  }
})

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

  // Réinitialise le positionnement absolu de bpmn-js
  Object.assign(paletteEl.style, {
    position : 'relative',
    left     : '0',
    top      : '0',
    width    : '100%',
    height   : '100%',
    border   : 'none',
    borderRadius : '0',
    boxShadow    : 'none',
    background   : 'transparent',
  })
}

// ── 6. Fonctions métier ──────────────────────────────────────────────────────
async function loadDiagram(xml) {
  try {
    await modeler.importXML(xml)
    modeler.get('canvas').zoom('fit-viewport')
    extractPalette()
  } catch (err) {
    w2alert('Import échoué : ' + err.message)
  }
}

function handleNew() {
  w2confirm('Créer un nouveau diagramme ? Les modifications non sauvegardées seront perdues.')
    .yes(() => loadDiagram(EMPTY_DIAGRAM))
}

function handleImport() {
  const input = document.getElementById('file-input')
  input.value = ''
  input.onchange = () => {
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => loadDiagram(e.target.result)
    reader.readAsText(file)
  }
  input.click()
}

async function handleExportXML() {
  try {
    const { xml } = await modeler.saveXML({ format: true })
    download(xml, 'diagram.bpmn', 'application/xml')
  } catch (err) {
    w2alert('Export XML échoué : ' + err.message)
  }
}

async function handleExportSVG() {
  try {
    const { svg } = await modeler.saveSVG()
    download(svg, 'diagram.svg', 'image/svg+xml')
  } catch (err) {
    w2alert('Export SVG échoué : ' + err.message)
  }
}

function handleFit() {
  modeler.get('canvas').zoom('fit-viewport')
}

function download(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── 7. Chargement initial ────────────────────────────────────────────────────
loadDiagram(EMPTY_DIAGRAM)