import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

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
  const [popupStyle, setPopupStyle] = useState({})
  const wrapperRef = useRef(null)

  const displayValue = value === '' || value == null ? placeholder : value

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const popupHeight = 70
    const popupWidth = Math.min(window.innerWidth - 16, 360)
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom

    let top
    if (spaceAbove > popupHeight + 10) {
      top = rect.top - popupHeight - 6
    } else if (spaceBelow > popupHeight + 10) {
      top = rect.bottom + 6
    } else {
      top = Math.max(8, window.innerHeight - popupHeight - 20)
    }

    let left = rect.left + rect.width / 2 - popupWidth / 2
    if (left < 8) left = 8
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8
    }

    setPopupStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popupWidth}px`,
    })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        const popup = document.querySelector('.tap-selector-popup')
        if (popup && popup.contains(e.target)) return
        setIsOpen(false)
        setIsManual(false)
        setManualValue('')
      }
    }
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  const popup = isOpen && (
    <div className="tap-selector-popup" style={popupStyle}>
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
            placeholder="数字"
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
            入力
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="tap-selector-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`tap-selector-cell ${className}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
      >
        {displayValue}
      </button>
      {popup && createPortal(popup, document.body)}
    </div>
  )
}
