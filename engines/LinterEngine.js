/**
 * LinterEngine
 *
 * Evaluates linting rules from active profiles against all elements.
 * Rules come from profiles (via ProfileEngine.getRules()) — the engine
 * knows nothing about specific namespaces or field semantics.
 *
 * Replaces the previous SemArchLinter with a fully generic implementation.
 */
export class LinterEngine {
  /**
   * @param {Object} modeler        - bpmn-js modeler instance
   * @param {Function} onResult     - callback(issues[])
   * @param {ProfileEngine} profileEngine
   * @param {MergeEngine}   mergeEngine
   */
  constructor(modeler, onResult, profileEngine, mergeEngine) {
    this._modeler       = modeler
    this._onResult      = onResult
    this._profileEngine = profileEngine
    this._mergeEngine   = mergeEngine
    this._timer         = null
    this._active        = true

    // Auto-run on model changes
    modeler.on('commandStack.changed', () => {
      if (!this._active) return
      clearTimeout(this._timer)
      this._timer = setTimeout(() => this.run(), 900)
    })
    modeler.on('import.done', () => {
      if (!this._active) return
      setTimeout(() => this.run(), 300)
    })
  }

  setActive(active) { this._active = active }

  /**
   * Run all active rules and return issues.
   */
  run() {
    const registry = this._modeler.get('elementRegistry')
    if (!registry) return []

    const rules    = this._profileEngine.getRules()
    const issues   = []

    registry.getAll().forEach(element => {
      if (element.type === 'label') return

      // Build flat field values map: 'prefix:attr' → value
      const fieldValues = this._buildFieldValues(element)

      // Evaluate profile-driven rules
      rules.forEach(rule => {
        // Check appliesTo
        if (rule.appliesTo && !rule.appliesTo.includes('*')) {
          const applies = rule.appliesTo.some(t =>
            element.type === t ||
            element.type.endsWith(':' + t.replace('bpmn:', ''))
          )
          if (!applies) return
        }

        const issue = this._profileEngine.evaluateRule(rule, fieldValues)
        if (issue) {
          issues.push({ ...issue, element })
        }
      })

      // Built-in structural rules (always active)
      issues.push(...this._structuralRules(element, fieldValues))
    })

    // Sort: errors → warnings → info
    const order = { error: 0, warning: 1, info: 2 }
    issues.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))

    this._onResult(issues)
    return issues
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _buildFieldValues(element) {
    const values = {}
    const bo     = element.businessObject
    ;(bo.extensionElements?.values ?? []).forEach(entry => {
      const [ns] = entry.$type.split(':')
      Object.keys(entry).forEach(k => {
        if (!k.startsWith('$')) values[`${ns}:${k}`] = entry[k]
      })
    })
    // Also include standard BPMN properties
    if (bo.name)   values['bpmn:name']   = bo.name
    if (bo.id)     values['bpmn:id']     = bo.id
    return values
  }

  _structuralRules(element, fieldValues) {
    const issues = []

    // Rule: elements should have names
    const nameable = [
      'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ManualTask',
      'bpmn:BusinessRuleTask', 'bpmn:ScriptTask', 'bpmn:CallActivity',
      'bpmn:SubProcess', 'bpmn:ExclusiveGateway', 'bpmn:InclusiveGateway',
      'bpmn:ParallelGateway', 'bpmn:EventBasedGateway',
      'bpmn:StartEvent', 'bpmn:EndEvent',
      'bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent',
      'bpmn:DataObjectReference', 'bpmn:DataStoreReference'
    ]
    if (nameable.includes(element.type)) {
      if (!fieldValues['bpmn:name'] || String(fieldValues['bpmn:name']).trim() === '') {
        issues.push({
          rule    : 'structural/named-element',
          severity: 'info',
          element,
          message : `${element.type.replace('bpmn:', '')} "${element.id}" has no name`
        })
      }
    }

    // Rule: auto-generated IDs are not stable merge keys
    const autoGenRe = /^[A-Za-z]+_[0-9a-zA-Z]{7,}$/
    if (autoGenRe.test(element.id) && element.type !== 'bpmn:Definitions') {
      issues.push({
        rule    : 'structural/stable-id',
        severity: 'warning',
        element,
        message : `Auto-generated ID "${element.id}" — not a stable merge key`
      })
    }

    // Rule: MessageFlow should reference a message
    if (element.type === 'bpmn:MessageFlow') {
      if (!element.businessObject?.messageRef) {
        issues.push({
          rule    : 'structural/typed-message-flow',
          severity: 'warning',
          element,
          message : `MessageFlow "${element.id}" has no messageRef`
        })
      }
    }

    return issues
  }
}
