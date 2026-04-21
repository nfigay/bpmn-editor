/**
 * ModdleRegistry
 *
 * Loads and manages moddle extension descriptors at runtime.
 * The registry is completely agnostic of which namespaces exist —
 * it only knows the JSON structure of a moddle descriptor.
 *
 * Usage:
 *   const registry = new ModdleRegistry()
 *   await registry.loadAll(descriptorMap)   // from import.meta.glob
 *   const modeler = new BpmnModeler({
 *     moddleExtensions: registry.getExtensions()
 *   })
 */
export class ModdleRegistry {
  constructor() {
    // Map<prefix, descriptor>
    this._descriptors = new Map()
  }

  /**
   * Load all descriptors from a Vite import.meta.glob result.
   * @param {Object} modules - result of import.meta.glob('...', { eager:true })
   */
  loadAll(modules) {
    Object.values(modules).forEach(mod => {
      const descriptor = mod.default ?? mod
      if (descriptor && descriptor.prefix) {
        this._descriptors.set(descriptor.prefix, descriptor)
      } else {
        console.warn('[ModdleRegistry] Descriptor missing prefix:', descriptor)
      }
    })
  }

  /**
   * Register a single descriptor directly.
   * @param {Object} descriptor - moddle JSON descriptor
   */
  register(descriptor) {
    if (!descriptor?.prefix) throw new Error('ModdleRegistry: descriptor must have a prefix')
    this._descriptors.set(descriptor.prefix, descriptor)
  }

  /**
   * Unregister a namespace by prefix.
   */
  unregister(prefix) {
    this._descriptors.delete(prefix)
  }

  /**
   * Returns the moddleExtensions object expected by BpmnModeler.
   * Keys = prefix, values = descriptor.
   */
  getExtensions() {
    const result = {}
    this._descriptors.forEach((desc, prefix) => {
      result[prefix] = desc
    })
    return result
  }

  /**
   * Returns all known namespace URIs mapped to their prefix.
   * Useful for XML namespace declarations.
   */
  getNamespaceMap() {
    const map = {}
    this._descriptors.forEach(desc => {
      if (desc.uri) map[desc.prefix] = desc.uri
    })
    return map
  }

  /**
   * Returns the descriptor for a given prefix.
   */
  get(prefix) {
    return this._descriptors.get(prefix) || null
  }

  /**
   * Returns all known prefixes.
   */
  getPrefixes() {
    return Array.from(this._descriptors.keys())
  }

  /**
   * Returns the namespace URI for a given prefix.
   */
  getUri(prefix) {
    return this._descriptors.get(prefix)?.uri || null
  }

  /**
   * Returns all prefixes whose category matches the given value.
   * Category is a custom field in the descriptor: "A" | "B" | "C"
   */
  getPrefixesByCategory(category) {
    const result = []
    this._descriptors.forEach((desc, prefix) => {
      if (desc.category === category) result.push(prefix)
    })
    return result
  }
}
