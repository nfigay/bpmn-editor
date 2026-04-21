/**
 * ExportEngine
 *
 * Transforms a canonical BPMN XML string into a platform-specific
 * output by applying an export-map.
 *
 * Export flow:
 *   Canonical BPMN (all namespaces) → ExportEngine → Platform BPMN
 *
 * The export-map defines:
 *   - which namespaces to preserve
 *   - which to strip
 *   - how to map semarch/domain fields to platform-specific extension elements
 */
export class ExportEngine {
  /**
   * @param {ModdleRegistry} registry
   */
  constructor(registry) {
    this._registry = registry
  }

  /**
   * Apply an export-map to a canonical BPMN XML string.
   *
   * @param {Object} exportMap - export-map JSON descriptor
   * @param {string} bpmnXml   - canonical BPMN XML (all namespaces)
   * @returns {string}         - platform-specific BPMN XML
   */
  apply(exportMap, bpmnXml) {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(bpmnXml, 'application/xml')

    const parseErr = doc.querySelector('parsererror')
    if (parseErr) throw new Error('ExportEngine: XML parse error — ' + parseErr.textContent)

    // Ensure target namespace is declared
    if (exportMap.targetNamespacePrefix) {
      this._ensureNamespaceDeclaration(doc,
        exportMap.targetNamespacePrefix,
        this._registry.getUri(exportMap.targetNamespacePrefix))
    }

    // Process all BPMN elements
    const allElements = this._getAllBpmnElements(doc)

    allElements.forEach(el => {
      const extEl = this._getExtensionElements(el)
      if (!extEl) return

      // Apply mappings: source → target
      if (exportMap.mappings?.length) {
        exportMap.mappings.forEach(mapping => {
          this._applyMapping(doc, extEl, mapping, exportMap)
        })
      }

      // Strip unwanted namespaces
      if (exportMap.strip?.length) {
        this._stripNamespaces(extEl, exportMap.strip)
      }

      // Remove empty extensionElements
      if (extEl.childNodes.length === 0) {
        el.removeChild(extEl)
      }
    })

    // Clean up stripped namespace declarations from root
    if (exportMap.strip?.length) {
      this._removeNamespaceDeclarations(doc, exportMap.strip)
    }

    const serializer = new XMLSerializer()
    return serializer.serializeToString(doc)
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _applyMapping(doc, extEl, mapping, exportMap) {
    const { sourceType, sourceAttr, targetType, targetAttr, transform } = mapping
    const [sourcePrefix, sourceLocalName] = sourceType.split(':')
    const sourceNsUri = this._registry.getUri(sourcePrefix)

    // Find source elements
    const sourceEls = Array.from(extEl.childNodes).filter(child => {
      if (child.nodeType !== 1) return false
      return child.localName === sourceLocalName &&
             (child.prefix === sourcePrefix || child.namespaceURI === sourceNsUri)
    })

    sourceEls.forEach(sourceEl => {
      let value
      if (sourceAttr.startsWith('tag=')) {
        const tagName = sourceAttr.replace('tag=', '')
        value = sourceEl.getAttribute(tagName)
      } else {
        value = sourceEl.getAttribute(sourceAttr)
      }
      if (value === null || value === undefined) return

      const transformed = this._applyTransform(value, transform)

      // Find or create target element
      const [targetPrefix, targetLocalName] = targetType.split(':')
      const targetNsUri = this._registry.getUri(targetPrefix)

      let targetEl = Array.from(extEl.childNodes).find(child =>
        child.nodeType === 1 &&
        child.localName === targetLocalName &&
        (child.prefix === targetPrefix || child.namespaceURI === targetNsUri)
      )

      if (!targetEl && exportMap.addMissing !== false) {
        targetEl = targetNsUri
          ? doc.createElementNS(targetNsUri, `${targetPrefix}:${targetLocalName}`)
          : doc.createElement(`${targetPrefix}:${targetLocalName}`)
        extEl.appendChild(targetEl)
      }

      if (targetEl) {
        if (targetAttr.startsWith('tag=')) {
          targetEl.setAttribute(targetAttr.replace('tag=', ''), transformed)
        } else {
          targetEl.setAttribute(targetAttr, transformed)
        }
      }
    })
  }

  _stripNamespaces(extEl, prefixes) {
    const toRemove = []
    extEl.childNodes.forEach(child => {
      if (child.nodeType !== 1) return
      if (prefixes.some(p => {
        const prefix = p.endsWith(':') ? p.slice(0, -1) : p
        return child.prefix === prefix
      })) {
        toRemove.push(child)
      }
    })
    toRemove.forEach(el => extEl.removeChild(el))
  }

  _removeNamespaceDeclarations(doc, prefixes) {
    const root = doc.documentElement
    prefixes.forEach(p => {
      const prefix = p.endsWith(':') ? p.slice(0, -1) : p
      root.removeAttribute(`xmlns:${prefix}`)
    })
  }

  _applyTransform(value, transform) {
    if (!transform || transform === 'none') return value
    if (transform.startsWith('prefix:')) {
      const tmpl = transform.replace('prefix:', '')
      return tmpl.replace('{value}', value)
    }
    if (transform.startsWith('strip-prefix:')) {
      const strip = transform.replace('strip-prefix:', '')
      return value.startsWith(strip) ? value.slice(strip.length) : value
    }
    if (transform === 'upper') return value.toUpperCase()
    if (transform === 'lower') return value.toLowerCase()
    return value
  }

  _getAllBpmnElements(doc) {
    const bpmnNs = 'http://www.omg.org/spec/BPMN/20100524/MODEL'
    const all    = []
    const walker = doc.createNodeIterator(doc.documentElement, 1)
    let node
    while ((node = walker.nextNode())) {
      if (node.namespaceURI === bpmnNs || node.prefix === 'bpmn') all.push(node)
    }
    return all
  }

  _getExtensionElements(bpmnEl) {
    return Array.from(bpmnEl.childNodes).find(
      c => c.nodeType === 1 && c.localName === 'extensionElements'
    ) || null
  }

  _ensureNamespaceDeclaration(doc, prefix, uri) {
    if (!prefix || !uri) return
    const root = doc.documentElement
    if (!root.hasAttribute(`xmlns:${prefix}`)) root.setAttribute(`xmlns:${prefix}`, uri)
  }
}
