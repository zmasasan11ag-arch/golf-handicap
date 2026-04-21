import React, { useState } from 'react'

export default function TapSelector({
  value,
  options,
  onSelect,
  className = '',
  placeholder = '-',
  minValue = 1,
  maxValue = 15,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isManual, setIsManual] = useState(false)
  const [manualValue, setManualValue] = useState('')

  const displayValue = value === '' || value == null ? placeholder : value

  function handleSelect(v) {
    onSelect(v)
    setIsOpen(false)
    setIsManual(false)
    setManualValue('')
  }

  function handleManualSubmit() {
    const n = parseInt(manualValue)
    if (!isNaN(n) && n >= minValue && n <= maxValue) {
      handleSelect(n)
    }
  }

  function handleOpen() {
    setIsOpen(true)
    setIsManual(false)
  }

  function handleClose(e) {
    e.stopPropagation()
    setIsOpen(false)
    setIsManual(false)
    setManualValue('')
  }

  return (
    <>
      <button
        type="button"
        className={`tap-selector-cell ${className}`}
        onClick={handleOpen}
        aria-label={ariaLabel}
      >
        {displayValue}
      </button>

      {isOpen && (
        <div className="tap-selector-overlay" onClick={handleClose}>
          <div className="tap-selector-panel" onClick={e => e.stopPropagation()}>
            <div className="tap-selector-title">
              {ariaLabel}
            </div>
            {isManual ? (
              <div className="tap-selector-manual">
                <input
                  type="number"
                  inputMode="numeric"
                  min={minValue}
                  max={maxValue}
                  value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  className="tap-selector-manual-input"
                  autoFocus
                  placeholder="数字を入力"
                />
                <button
                  type="button"
                  className="tap-selector-manual-ok"
                  onClick={handleManualSubmit}
                >
                  OK
                </button>
                <button
                  type="button"
                  className="tap-selector-manual-cancel"
                  onClick={() => setIsManual(false)}
                >
                  戻る
                </button>
              </div>
            ) : (
              <div className="tap-selector-options">
                {options.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`tap-selector-option${value === opt ? ' selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  type="button"
                  className="tap-selector-option manual"
                  onClick={() => setIsManual(true)}
                >
                  直接
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
