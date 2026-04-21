/**
 * ProfileEngine
 *
 * Activates profiles based on a runtime context object.
 * A profile defines: which namespaces are visible, which fields
 * are shown for which element types, and which linting rules apply.
 *
 * The engine is completely agnostic of namespace names and field semantics.
 */
export class ProfileEngine {
  /**
   * @param {Array} profiles - array of profile JSON descriptors
   */
  constructor(profiles = []) {
    this._profiles = profiles
    this._active   = []
    this._context  = {}
  }

  /**
   * Register additional profiles at runtime.
   */
  addProfiles(profiles) {
    this._profiles.push(...profiles)
  }

  /**
   * Evaluate all profiles against a context object and set the active set.
   *
   * Context shape (flat paths):
   *   { businessContext: { systemType, maturity },
   *     lifecycle: { maturity, status },
   *     technicalRealization: [{ softwareProduct, applicationSystemId }] }
   *
   * @param {Object} context
   * @returns {Array} active profiles
   */
  activate(context) {
    this._context = context || {}
    this._active  = this._profiles.filter(p => this._matches(p, this._context))
    return this._active
  }

  /**
   * Returns currently active profiles.
   */
  getActiveProfiles() {
    return this._active
  }

  /**
   * Returns all profiles (for display in the profile manager UI).
   */
  getAllProfiles() {
    return this._profiles
  }

  /**
   * Returns merged list of namespace prefixes required by active profiles.
   */
  getActiveNamespaces() {
    const prefixes = new Set()
    this._active.forEach(p => {
      (p.namespaces || []).forEach(ns => prefixes.add(ns))
    })
    return Array.from(prefixes)
  }

  /**
   * Returns visible fields for a given BPMN element type,
   * merged across all active profiles.
   *
   * @param {string} elementType  - e.g. 'bpmn:Task', 'bpmn:Process'
   * @param {Object} currentValues - existing extension values (namespace → plain obj)
   * @returns {Array} field descriptors enriched with current value + state
   *
   * Field state:
   *   'active'          - in active profile, has or hasn't a value
   *   'inactive-present'- NOT in active profile but has data in the element
   *   'inactive-absent' - NOT in active profile, no data → not shown
   */
  getFields(elementType, currentValues = {}) {
    const activeFields  = new Map()  // id → field descriptor
    const activeNS      = new Set(this.getActiveNamespaces())

    // Collect fields from active profiles
    this._active.forEach(profile => {
      (profile.fields || []).forEach(field => {
        const applies = field.appliesTo?.includes('*') ||
                        field.appliesTo?.includes(elementType) ||
                        field.appliesTo?.some(t => elementType.endsWith(t.replace('bpmn:', '')))

        if (applies && !activeFields.has(field.id)) {
          activeFields.set(field.id, { ...field, state: 'active' })
        }
      })
    })

    // Add inactive-present fields (data exists but profile not active)
    Object.entries(currentValues).forEach(([namespace, typeMap]) => {
      if (activeNS.has(namespace)) return  // already handled above
      Object.entries(typeMap || {}).forEach(([typeName, attrs]) => {
        Object.entries(attrs || {}).forEach(([attrName, value]) => {
          const id = `${namespace}:${attrName}`
          if (!activeFields.has(id) && value !== undefined && value !== '') {
            activeFields.set(id, {
              id,
              label   : attrName,
              namespace,
              type    : 'string',
              required: false,
              state   : 'inactive-present',
              value,
              hint    : `From namespace "${namespace}" — not in active profile`
            })
          }
        })
      })
    })

    // Enrich active fields with current values
    return Array.from(activeFields.values()).map(field => {
      if (field.state === 'active') {
        const [ns, attr] = field.id.split(':')
        const typeValues = currentValues[ns] || {}
        // Try to find value across all types in this namespace
        let value = undefined
        Object.values(typeValues).forEach(attrs => {
          if (attr in (attrs || {})) value = attrs[attr]
        })
        return { ...field, value: value ?? '' }
      }
      return field
    })
  }

  /**
   * Returns merged linting rules from all active profiles.
   */
  getRules() {
    const rules = []
    const seen  = new Set()
    this._active.forEach(profile => {
      (profile.rules || []).forEach(rule => {
        if (!seen.has(rule.id)) {
          rules.push(rule)
          seen.add(rule.id)
        }
      })
    })
    return rules
  }

  /**
   * Evaluates a single linting rule against a field value.
   *
   * @param {Object} rule
   * @param {Object} fieldValues - { 'prefix:attr': value }
   * @returns {Object|null} - { rule, severity, message } or null if passed
   */
  evaluateRule(rule, fieldValues) {
    switch (rule.type) {

      case 'required': {
        const val = fieldValues[rule.field]
        if (!val || String(val).trim() === '') {
          return { rule: rule.id, severity: rule.severity,
                   message: rule.description || `${rule.field} is required` }
        }
        break
      }

      case 'conditional-required': {
        const condField = rule.condition?.field
        const condValue = rule.condition?.value
        const condMet   = fieldValues[condField] === condValue
        if (condMet) {
          const val = fieldValues[rule.requires]
          if (!val || String(val).trim() === '') {
            return { rule: rule.id, severity: rule.severity,
                     message: rule.description ||
                       `${rule.requires} required when ${condField}=${condValue}` }
          }
        }
        break
      }

      case 'regex': {
        const val = fieldValues[rule.field]
        if (val && !new RegExp(rule.constraint).test(String(val))) {
          return { rule: rule.id, severity: rule.severity,
                   message: rule.description || `${rule.field} must match ${rule.constraint}` }
        }
        break
      }

      case 'enum': {
        const val     = fieldValues[rule.field]
        const allowed = rule.values || []
        if (val && !allowed.includes(val)) {
          return { rule: rule.id, severity: rule.severity,
                   message: rule.description ||
                     `${rule.field} must be one of: ${allowed.join(', ')}` }
        }
        break
      }

      default:
        break
    }
    return null
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _matches(profile, context) {
    const conditions = profile.activationConditions || {}
    return Object.entries(conditions).every(([path, expected]) => {
      const actual = this._resolvePath(context, path)
      if (Array.isArray(expected)) return expected.includes(actual)
      return actual === expected
    })
  }

  _resolvePath(obj, path) {
    return path.split('.').reduce((cur, key) => {
      if (cur === undefined || cur === null) return undefined
      // Support array — check if any element matches
      if (Array.isArray(cur)) {
        const found = cur.find(item => item[key] !== undefined)
        return found ? found[key] : undefined
      }
      return cur[key]
    }, obj)
  }
}
