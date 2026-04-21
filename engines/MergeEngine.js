/**
 * MergeEngine
 *
 * All writes to bpmn extensionElements go through this engine.
 * Core invariant: only the active namespace is modified.
 * All other namespaces are preserved unconditionally.
 *
 * "The file is the source of truth — the profile is a view."
 */
export class MergeEngine {
  /**
   * @param {Object} moddle - modeler.get('moddle')
   */
  constructor(moddle) {
    this._moddle = moddle
  }

  /**
   * Merge incoming values into an element's extensionElements.
   *
   * @param {Object} element       - bpmn-js element (from elementRegistry)
   * @param {string} namespace     - prefix of the active namespace (e.g. 'semarch')
   * @param {Object} values        - { TypeName: { attr: value, ... }, ... }
   *                                 TypeName is WITHOUT prefix (e.g. 'Meta', not 'semarch:Meta')
   * @returns {void}
   */
  merge(element, namespace, values) {
    const bo     = element.businessObject
    const moddle = this._moddle

    // Ensure extensionElements exists
    if (!bo.extensionElements) {
      bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
      bo.extensionElements.$parent = bo
    }
    if (!Array.isArray(bo.extensionElements.values)) {
      bo.extensionElements.values = []
    }

    // Step 1: preserve everything NOT in the active namespace
    const preserved = bo.extensionElements.values.filter(
      v => !v.$type.startsWith(namespace + ':')
    )

    // Step 2: build new entries for the active namespace
    const incoming = []
    Object.entries(values).forEach(([typeName, attrs]) => {
      const fullType = `${namespace}:${typeName}`
      try {
        const el = moddle.create(fullType, attrs)
        el.$parent = bo.extensionElements
        incoming.push(el)
      } catch (err) {
        console.warn(`[MergeEngine] Cannot create ${fullType}:`, err.message)
      }
    })

    // Step 3: write back — preserved + incoming only
    bo.extensionElements.values = [...preserved, ...incoming]
  }

  /**
   * Merge at the Definitions level (repository context, app systems...).
   *
   * @param {Object} definitions  - bpmn:Definitions business object
   * @param {string} namespace    - active namespace prefix
   * @param {Object} values       - same structure as merge()
   */
  mergeDefinitions(definitions, namespace, values) {
    const moddle = this._moddle

    if (!definitions.extensionElements) {
      definitions.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
      definitions.extensionElements.$parent = definitions
    }
    if (!Array.isArray(definitions.extensionElements.values)) {
      definitions.extensionElements.values = []
    }

    const preserved = definitions.extensionElements.values.filter(
      v => !v.$type.startsWith(namespace + ':')
    )

    const incoming = []
    Object.entries(values).forEach(([typeName, attrs]) => {
      const fullType = `${namespace}:${typeName}`
      try {
        // Handle arrays (multiple instances of same type, e.g. ApplicationSystem)
        const items = Array.isArray(attrs) ? attrs : [attrs]
        items.forEach(item => {
          const el = moddle.create(fullType, item)
          el.$parent = definitions.extensionElements
          incoming.push(el)
        })
      } catch (err) {
        console.warn(`[MergeEngine] Cannot create ${fullType}:`, err.message)
      }
    })

    definitions.extensionElements.values = [...preserved, ...incoming]
  }

  /**
   * Read all extension values for a given namespace from an element.
   *
   * @param {Object} element    - bpmn-js element OR business object
   * @param {string} namespace  - prefix to read
   * @returns {Array}           - array of moddle objects for that namespace
   */
  read(element, namespace) {
    const bo = element.businessObject ?? element
    return (bo.extensionElements?.values ?? [])
      .filter(v => v.$type.startsWith(namespace + ':'))
  }

  /**
   * Read a single typed entry by its full type name.
   *
   * @param {Object} element  - bpmn-js element OR business object
   * @param {string} fullType - e.g. 'semarch:Meta'
   * @returns {Object|null}
   */
  readOne(element, fullType) {
    const bo = element.businessObject ?? element
    return (bo.extensionElements?.values ?? [])
      .find(v => v.$type === fullType) || null
  }

  /**
   * Returns true if the element has any data in the given namespace.
   */
  hasNamespaceData(element, namespace) {
    return this.read(element, namespace).length > 0
  }

  /**
   * Returns a plain object of { typeName: { attr: value } } for a namespace.
   * Useful for populating form fields.
   */
  readAsPlain(element, namespace) {
    const result = {}
    this.read(element, namespace).forEach(entry => {
      const typeName = entry.$type.replace(namespace + ':', '')
      const plain = {}
      Object.keys(entry).forEach(k => {
        if (!k.startsWith('$') && entry[k] !== undefined) plain[k] = entry[k]
      })
      result[typeName] = plain
    })
    return result
  }

  /**
   * Explicit removal of a namespace from an element.
   * Returns the list of affected attributes BEFORE removing,
   * so the caller can show a confirmation dialog.
   *
   * @param {Object} element    - bpmn-js element
   * @param {string} namespace  - prefix to remove
   * @returns {Array}           - array of { type, attrs } that will be removed
   */
  prepareRemove(element, namespace) {
    return this.read(element, namespace).map(entry => ({
      type : entry.$type,
      attrs: this.readAsPlain(element, namespace)[entry.$type.replace(namespace + ':', '')] || {}
    }))
  }

  /**
   * Actually removes all data for a namespace from an element.
   * Call only after user confirmation.
   */
  remove(element, namespace) {
    const bo = element.businessObject ?? element
    if (!bo.extensionElements?.values) return
    bo.extensionElements.values = bo.extensionElements.values
      .filter(v => !v.$type.startsWith(namespace + ':'))
  }

  /**
   * List all namespaces present in an element's extensionElements.
   * Returns array of prefix strings.
   */
  listNamespaces(element) {
    const bo = element.businessObject ?? element
    const prefixes = new Set()
    ;(bo.extensionElements?.values ?? []).forEach(v => {
      const prefix = v.$type.split(':')[0]
      if (prefix) prefixes.add(prefix)
    })
    return Array.from(prefixes)
  }
}
