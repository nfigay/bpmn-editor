import BpmnModeler from 'bpmn-js/lib/Modeler';

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel';

import CamundaBpmnModdle from 'camunda-bpmn-moddle/resources/camunda.json';

import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';

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
</bpmn:definitions>`;

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties-panel' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
  ],
  moddleExtensions: {
    camunda: CamundaBpmnModdle,
  },
});

async function loadDiagram(xml) {
  try {
    await modeler.importXML(xml);
    modeler.get('canvas').zoom('fit-viewport');
  } catch (err) {
    console.error('Import error:', err);
    alert('Import failed: ' + err.message);
  }
}

loadDiagram(EMPTY_DIAGRAM);

document.getElementById('btn-new').addEventListener('click', () => {
  if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
    loadDiagram(EMPTY_DIAGRAM);
  }
});

const fileInput = document.getElementById('file-input');

document.getElementById('btn-import').addEventListener('click', () => {
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => loadDiagram(e.target.result);
  reader.readAsText(file);
});

document.getElementById('btn-export').addEventListener('click', async () => {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    download(xml, 'diagram.bpmn', 'application/xml');
  } catch (err) {
    alert('XML export failed: ' + err.message);
  }
});

document.getElementById('btn-export-svg').addEventListener('click', async () => {
  try {
    const { svg } = await modeler.saveSVG();
    download(svg, 'diagram.svg', 'image/svg+xml');
  } catch (err) {
    alert('SVG export failed: ' + err.message);
  }
});

function download(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}