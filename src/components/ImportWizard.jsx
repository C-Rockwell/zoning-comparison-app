import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, ArrowRight, ArrowLeft, Check, X, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseCSV, APP_FIELDS, autoMatchHeaders, applyMapping } from '../utils/importParser'

/**
 * ImportWizard - A 3-step modal for importing CSV data into the entity lot system.
 *
 * Step 1: File Upload (drag-and-drop + file input)
 * Step 2: Field Mapping (CSV columns -> app fields with auto-match)
 * Step 3: Preview & Import (review mapped data, confirm import)
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
const ImportWizard = ({ isOpen, onClose }) => {
  const addLot = useStore(state => state.addLot)

  // Wizard state
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)

  // Parsed data
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])

  // Field mapping: column index -> app field key (or null for skip)
  const [mapping, setMapping] = useState({})

  // Import result
  const [importCount, setImportCount] = useState(0)
  const [imported, setImported] = useState(false)

  const fileInputRef = useRef(null)

  // ============================================
  // File Processing
  // ============================================

  const processFile = useCallback((file) => {
    setError('')

    if (!file) return

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file (.csv)')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.')
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const parsed = parseCSV(text)

        if (parsed.headers.length === 0) {
          setError('Could not parse CSV file. The file appears to be empty.')
          return
        }

        if (parsed.rows.length === 0) {
          setError('CSV file has headers but no data rows.')
          return
        }

        setHeaders(parsed.headers)
        setRows(parsed.rows)

        // Auto-match headers and convert to index-based mapping
        const headerMapping = autoMatchHeaders(parsed.headers)
        const indexMapping = {}
        parsed.headers.forEach((header, index) => {
          indexMapping[index] = headerMapping[header] || null
        })
        setMapping(indexMapping)

        // Advance to step 2
        setStep(2)
      } catch (err) {
        setError(`Failed to parse CSV: ${err.message}`)
      }
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
    }
    reader.readAsText(file)
  }, [])

  // ============================================
  // Drag and Drop Handlers
  // ============================================

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileInput = useCallback((e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [processFile])

  // ============================================
  // Mapping Handlers
  // ============================================

  const updateMapping = useCallback((columnIndex, fieldKey) => {
    setMapping(prev => ({
      ...prev,
      [columnIndex]: fieldKey === 'skip' ? null : fieldKey,
    }))
  }, [])

  // Get mapped lots preview data
  const getMappedLots = useCallback(() => {
    return applyMapping(rows, mapping)
  }, [rows, mapping])

  // ============================================
  // Import Handler
  // ============================================

  const handleImport = useCallback(() => {
    const lots = getMappedLots()

    if (lots.length === 0) {
      setError('No valid data to import. Check your field mapping.')
      return
    }

    // Create lots in the store
    for (const lotData of lots) {
      addLot(lotData)
    }

    setImportCount(lots.length)
    setImported(true)
  }, [getMappedLots, addLot])

  // ============================================
  // Reset / Close
  // ============================================

  const handleClose = useCallback(() => {
    setStep(1)
    setError('')
    setFileName('')
    setDragActive(false)
    setHeaders([])
    setRows([])
    setMapping({})
    setImportCount(0)
    setImported(false)
    onClose()
  }, [onClose])

  const handleBack = useCallback(() => {
    setError('')
    if (step === 3) {
      setStep(2)
    } else if (step === 2) {
      setStep(1)
      setFileName('')
      setHeaders([])
      setRows([])
      setMapping({})
    }
  }, [step])

  // ============================================
  // Render Helpers
  // ============================================

  if (!isOpen) return null

  // Group APP_FIELDS by group for the dropdown
  const fieldGroups = {}
  for (const field of APP_FIELDS) {
    if (!fieldGroups[field.group]) fieldGroups[field.group] = []
    fieldGroups[field.group].push(field)
  }

  // Get a friendly label for a field key
  const getFieldLabel = (key) => {
    const field = APP_FIELDS.find(f => f.key === key)
    return field ? field.label : key
  }

  // Count how many columns are mapped
  const mappedCount = Object.values(mapping).filter(v => v !== null).length

  // Preview lots for step 3
  const previewLots = step === 3 ? getMappedLots() : []

  // Get all field keys that are mapped (for preview table columns)
  const mappedFieldKeys = step === 3
    ? [...new Set(Object.values(mapping).filter(v => v !== null))]
    : []

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--ui-bg-primary)',
          border: '1px solid var(--ui-border)',
          color: 'var(--ui-text-primary)',
          maxWidth: '720px',
          maxHeight: '85vh',
          width: '95%',
        }}
        className="rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--ui-border)' }}
        >
          <div className="flex items-center gap-3">
            <FileText size={18} style={{ color: 'var(--ui-accent)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
              Import CSV Data
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      backgroundColor: step >= s ? 'var(--ui-accent)' : 'var(--ui-bg-tertiary)',
                      color: step >= s ? '#fff' : 'var(--ui-text-secondary)',
                    }}
                  >
                    {step > s ? <Check size={12} /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className="w-4 h-px"
                      style={{
                        backgroundColor: step > s ? 'var(--ui-accent)' : 'var(--ui-border)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: 'var(--ui-text-secondary)' }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          {/* Error Display */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded mb-4 text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
              }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: File Upload */}
          {step === 1 && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--ui-text-secondary)' }}>
                Upload a CSV file to import lot data. Each row in the CSV will create a new lot.
              </p>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center py-12 px-6"
                style={{
                  border: `2px dashed ${dragActive ? 'var(--ui-accent)' : 'var(--ui-border)'}`,
                  backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--ui-bg-secondary)',
                }}
              >
                <Upload
                  size={36}
                  className="mb-3"
                  style={{ color: dragActive ? 'var(--ui-accent)' : 'var(--ui-text-secondary)' }}
                />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--ui-text-primary)' }}>
                  Drag and drop your CSV file here
                </p>
                <p className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
                  or click to browse files
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />

              {/* File format hint */}
              <div
                className="mt-4 p-3 rounded text-xs"
                style={{
                  backgroundColor: 'var(--ui-bg-tertiary)',
                  color: 'var(--ui-text-secondary)',
                }}
              >
                <p className="font-medium mb-1" style={{ color: 'var(--ui-text-primary)' }}>
                  Expected format:
                </p>
                <p>CSV with a header row. Column names will be automatically matched to lot parameters.</p>
                <p className="mt-1 font-mono" style={{ color: 'var(--ui-text-secondary)', fontSize: '11px' }}>
                  lot_width, lot_depth, front_setback, building_width, ...
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
                  Map CSV columns to lot parameters. {mappedCount} of {headers.length} columns mapped.
                </p>
                {fileName && (
                  <span className="text-xs px-2 py-1 rounded" style={{
                    backgroundColor: 'var(--ui-bg-tertiary)',
                    color: 'var(--ui-text-secondary)',
                  }}>
                    {fileName}
                  </span>
                )}
              </div>

              {/* Mapping Table */}
              <div
                className="rounded border overflow-hidden mb-4"
                style={{ borderColor: 'var(--ui-border)' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>
                      <th
                        className="text-left px-3 py-2 font-medium text-xs"
                        style={{ color: 'var(--ui-text-secondary)', width: '40%' }}
                      >
                        CSV Column
                      </th>
                      <th
                        className="text-center px-2 py-2 font-medium text-xs"
                        style={{ color: 'var(--ui-text-secondary)', width: '10%' }}
                      >
                      </th>
                      <th
                        className="text-left px-3 py-2 font-medium text-xs"
                        style={{ color: 'var(--ui-text-secondary)', width: '50%' }}
                      >
                        Map To
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header, index) => (
                      <tr
                        key={index}
                        className="border-t"
                        style={{ borderColor: 'var(--ui-border)' }}
                      >
                        <td className="px-3 py-2">
                          <span
                            className="font-mono text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--ui-bg-tertiary)',
                              color: 'var(--ui-text-primary)',
                            }}
                          >
                            {header}
                          </span>
                        </td>
                        <td className="text-center">
                          <ArrowRight
                            size={14}
                            style={{
                              color: mapping[index] ? 'var(--ui-accent)' : 'var(--ui-border)',
                              display: 'inline',
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping[index] || 'skip'}
                            onChange={(e) => updateMapping(index, e.target.value)}
                            className="w-full px-2 py-1 rounded text-xs cursor-pointer"
                            style={{
                              backgroundColor: 'var(--ui-bg-secondary)',
                              color: mapping[index] ? 'var(--ui-text-primary)' : 'var(--ui-text-secondary)',
                              border: '1px solid var(--ui-border)',
                            }}
                          >
                            <option value="skip">-- Skip this column --</option>
                            {Object.entries(fieldGroups).map(([group, fields]) => (
                              <optgroup key={group} label={group}>
                                {fields.map(field => (
                                  <option key={field.key} value={field.key}>
                                    {field.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Data Preview */}
              {rows.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--ui-text-secondary)' }}>
                    Data Preview (first {Math.min(3, rows.length)} of {rows.length} rows)
                  </p>
                  <div
                    className="rounded border overflow-x-auto"
                    style={{ borderColor: 'var(--ui-border)' }}
                  >
                    <table className="w-full text-xs" style={{ minWidth: '100%' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>
                          {headers.map((header, i) => (
                            <th
                              key={i}
                              className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                              style={{ color: 'var(--ui-text-secondary)' }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 3).map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="border-t"
                            style={{ borderColor: 'var(--ui-border)' }}
                          >
                            {headers.map((_, colIdx) => (
                              <td
                                key={colIdx}
                                className="px-2 py-1.5 whitespace-nowrap"
                                style={{
                                  color: mapping[colIdx]
                                    ? 'var(--ui-text-primary)'
                                    : 'var(--ui-text-secondary)',
                                  opacity: mapping[colIdx] ? 1 : 0.5,
                                }}
                              >
                                {row[colIdx] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview & Import */}
          {step === 3 && !imported && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--ui-text-secondary)' }}>
                {previewLots.length === 0
                  ? 'No lots can be created with the current mapping. Go back and adjust your field mapping.'
                  : `Ready to create ${previewLots.length} lot${previewLots.length !== 1 ? 's' : ''} with the following data:`
                }
              </p>

              {previewLots.length > 0 && (
                <div
                  className="rounded border overflow-x-auto mb-4"
                  style={{ borderColor: 'var(--ui-border)' }}
                >
                  <table className="w-full text-xs" style={{ minWidth: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>
                        <th
                          className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                          style={{ color: 'var(--ui-text-secondary)' }}
                        >
                          #
                        </th>
                        {mappedFieldKeys.map(key => (
                          <th
                            key={key}
                            className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                            style={{ color: 'var(--ui-text-secondary)' }}
                          >
                            {getFieldLabel(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewLots.map((lot, index) => (
                        <tr
                          key={index}
                          className="border-t"
                          style={{ borderColor: 'var(--ui-border)' }}
                        >
                          <td
                            className="px-2 py-1.5 font-medium"
                            style={{ color: 'var(--ui-text-secondary)' }}
                          >
                            {index + 1}
                          </td>
                          {mappedFieldKeys.map(key => (
                            <td
                              key={key}
                              className="px-2 py-1.5 whitespace-nowrap"
                              style={{ color: 'var(--ui-text-primary)' }}
                            >
                              {getNestedValue(lot, key) ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Success */}
          {step === 3 && imported && (
            <div className="flex flex-col items-center justify-center py-8">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
              >
                <Check size={24} style={{ color: '#22c55e' }} />
              </div>
              <p className="text-base font-medium mb-1" style={{ color: 'var(--ui-text-primary)' }}>
                Import Complete
              </p>
              <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
                Successfully created {importCount} lot{importCount !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-bg-secondary)' }}
        >
          <div>
            {step > 1 && !imported && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-opacity hover:opacity-80"
                style={{ color: 'var(--ui-text-secondary)' }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 rounded text-sm transition-opacity hover:opacity-80"
              style={{ color: 'var(--ui-text-secondary)' }}
            >
              {imported ? 'Close' : 'Cancel'}
            </button>

            {step === 2 && (
              <button
                onClick={() => {
                  setError('')
                  setStep(3)
                }}
                disabled={mappedCount === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--ui-accent)',
                  color: '#fff',
                }}
              >
                Next
                <ArrowRight size={14} />
              </button>
            )}

            {step === 3 && !imported && (
              <button
                onClick={handleImport}
                disabled={previewLots.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--ui-accent)',
                  color: '#fff',
                }}
              >
                <Check size={14} />
                Import {previewLots.length} Lot{previewLots.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Extract a display value from a lot data object for a given field key.
 * Handles the nested structure produced by applyMapping.
 *
 * @param {Object} lot - Lot data object from applyMapping
 * @param {string} fieldKey - APP_FIELDS key
 * @returns {number|null}
 */
function getNestedValue(lot, fieldKey) {
  switch (fieldKey) {
    case 'lotWidth': return lot.lotWidth ?? null
    case 'lotDepth': return lot.lotDepth ?? null
    case 'setbackFront': return lot.setbacks?.principal?.front ?? null
    case 'setbackRear': return lot.setbacks?.principal?.rear ?? null
    case 'setbackSideLeft': return lot.setbacks?.principal?.sideInterior ?? null
    case 'setbackSideRight': return lot.setbacks?.principal?.minSideStreet ?? null
    case 'buildingWidth': return lot.buildings?.principal?.width ?? null
    case 'buildingDepth': return lot.buildings?.principal?.depth ?? null
    case 'buildingHeight': return lot.buildings?.principal?.maxHeight ?? null
    case 'maxHeight': return lot.buildings?.principal?.maxHeight ?? null
    case 'buildingStories': return lot.buildings?.principal?.stories ?? null
    case 'firstFloorHeight': return lot.buildings?.principal?.firstFloorHeight ?? null
    case 'upperFloorHeight': return lot.buildings?.principal?.upperFloorHeight ?? null
    case 'accessoryWidth': return lot.buildings?.accessory?.width ?? null
    case 'accessoryDepth': return lot.buildings?.accessory?.depth ?? null
    case 'accessoryMaxHeight': return lot.buildings?.accessory?.maxHeight ?? null
    default: return null
  }
}

export default ImportWizard
