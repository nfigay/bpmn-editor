/**
 * ImportEngine
 *
 * Applies an import-map to a raw BPMN XML string.
 * Works at the XML/DOM level — independent of moddle and of specific namespaces.
 *
 * Import flow:
 *   Source BPMN (platform extensions) → ImportEngine → Enriched BPMN (+ semarch)
 *
 * The import-map JSON defines all the transformation logic.
 * The engine only knows how to execute generic mapping operations.
 */
export class ImportEngine {
  /**
   * @param {ModdleRegistry} registry - used to resolve namespace URIs
   */
  constructor(registry) {
    this._registry = registry
  }

  /**
   * Apply an import-map to a BPMN XML string.
   *
   * @param {Object} importMap - import-map JSON descriptor
   * @param {string} bpmnXml   - raw BPMN XML string to enrich
   * @returns {string}         - enriched BPMN XML string
   */
  apply(importMap, bpmnXml) {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(bpmnXml, 'application/xml')

    // Check for parse errors
    const parseErr = doc.querySelector('parsererror')
    if (parseErr) throw new Error('ImportEngine: XML parse error — ' + parseErr.textContent)

    // Ensure target namespace is declared on the root element
    this._ensureNamespaceDeclaration(doc, importMap.targetNamespacePrefix,
      this._registry.getUri(importMap.targetNamespacePrefix))

    // Find all BPMN elements (recursive)
    const allElements = this._getAllBpmnElements(doc)

    allElements.forEach(el => {
      const extElements = this._getOrCreateExtensionElements(doc, el)
      if (!extElements) return

      // Apply each mapping rule
      importMap.mappings.forEach(mapping => {
        this._applyMapping(doc, el, extElements, mapping, importMap)
      })
    })

    // Serialize back
    const serializer = new XMLSerializer()
    return serializer.serializeToString(doc)
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _applyMapping(doc, bpmnEl, extElements, mapping, importMap) {
    const { sourceType, sourceAttr, targetType, targetAttr, transform } = mapping
    const [sourcePrefix, sourceLocalName] = sourceType.split(':')
    const sourceNsUri = this._registry.getUri(sourcePrefix)
      || this._getNamespaceFromDoc(doc, sourcePrefix)

    // Find source element in extensionElements
    const sourceEls = Array.from(extElements.childNodes).filter(child => {
      if (child.nodeType !== 1) return false
      const localMatch = child.localName === sourceLocalName
      const nsMatch    = !sourceNsUri || child.namespaceURI === sourceNsUri ||
                         child.prefix === sourcePrefix
      return localMatch && nsMatch
    })

    sourceEls.forEach(sourceEl => {
      // Handle tagged value syntax: sourceAttr="tag=someTag"
      let sourceValue
      if (sourceAttr.startsWith('tag=')) {
        const tagName = sourceAttr.replace('tag=', '')
        sourceValue   = sourceEl.getAttribute(tagName) ||
                        sourceEl.querySelector(`[tag="${tagName}"]`)?.getAttribute('value')
      } else {
        sourceValue = sourceEl.getAttribute(sourceAttr)
      }

      if (sourceValue === null || sourceValue === undefined) return

      // Apply transform
      const transformedValue = this._applyTransform(sourceValue, transform)

      // Find or create target element
      const [targetPrefix, targetLocalName] = targetType.split(':')
      const targetNsUri = this._registry.getUri(targetPrefix)

      let targetEl = Array.from(extElements.childNodes).find(child =>
        child.nodeType === 1 &&
        child.localName === targetLocalName &&
        (child.prefix === targetPrefix || child.namespaceURI === targetNsUri)
      )

      if (!targetEl) {
        targetEl = targetNsUri
          ? doc.createElementNS(targetNsUri, `${targetPrefix}:${targetLocalName}`)
          : doc.createElement(`${targetPrefix}:${targetLocalName}`)
        extElements.appendChild(targetEl)
      }

      // Handle tag= syntax for target
      if (targetAttr.startsWith('tag=')) {
        const tagName = targetAttr.replace('tag=', '')
        targetEl.setAttribute(tagName, transformedValue)
      } else {
        targetEl.setAttribute(targetAttr, transformedValue)
      }
    })

    // Handle unmapped strategy
    if (importMap.unmappedStrategy === 'discard') {
      const [sp, sl] = sourceType.split(':')
      Array.from(extElements.childNodes).forEach(child => {
        if (child.nodeType === 1 && child.localName === sl &&
            (child.prefix === sp)) {
          // Only discard if not in any mapping target
          extElements.removeChild(child)
        }
      })
    }
    // Default: 'preserve' — do nothing, source elements stay
  }

  _applyTransform(value, transform) {
    if (!transform || transform === 'none') return value

    if (transform.startsWith('prefix:')) {
      const prefix = transform.replace('prefix:', '').replace('{value}', value)
      return prefix.includes('{value}') ? prefix : prefix + value
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
    // Get all elements that could have extensionElements
    const bpmnNs = 'http://www.omg.org/spec/BPMN/20100524/MODEL'
    const all    = []
    const walker = doc.createNodeIterator(doc.documentElement, 1)
    let node
    while ((node = walker.nextNode())) {
      if (node.namespaceURI === bpmnNs || node.prefix === 'bpmn') {
        all.push(node)
      }
    }
    return all
  }

  _getOrCreateExtensionElements(doc, bpmnEl) {
    const bpmnNs = 'http://www.omg.org/spec/BPMN/20100524/MODEL'
    let extEl    = Array.from(bpmnEl.childNodes).find(
      c => c.nodeType === 1 && c.localName === 'extensionElements'
    )
    if (!extEl) {
      extEl = doc.createElementNS(bpmnNs, 'bpmn:extensionElements')
      // Insert as first child
      bpmnEl.insertBefore(extEl, bpmnEl.firstChild)
    }
    return extEl
  }

  _ensureNamespaceDeclaration(doc, prefix, uri) {
    if (!prefix || !uri) return
    const root = doc.documentElement
    const attr = `xmlns:${prefix}`
    if (!root.hasAttribute(attr)) {
      root.setAttribute(attr, uri)
    }
  }

  _getNamespaceFromDoc(doc, prefix) {
    const root = doc.documentElement
    return root.getAttribute(`xmlns:${prefix}`) || null
  }
}
