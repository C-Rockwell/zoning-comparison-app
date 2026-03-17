import { useState, useRef, useEffect } from 'react'
import { useStore, getEffectiveDrawingDefaults } from '../../store/useStore'

/**
 * HTML overlay for text input when using the Text or Leader drawing tools.
 * Positioned at screen coordinates computed at click time.
 * Renders outside the R3F Canvas.
 */
const DrawingTextInput = () => {
    const textEditState = useStore(state => state.textEditState)
    const setTextEditState = useStore(state => state.setTextEditState)
    const addDrawingObject = useStore(state => state.addDrawingObject)
    const [inputText, setInputText] = useState('')
    const inputRef = useRef(null)

    useEffect(() => {
        if (textEditState && inputRef.current) {
            setInputText('')
            // Defer focus to next tick so the input is mounted
            requestAnimationFrame(() => inputRef.current?.focus())
        }
    }, [textEditState])

    if (!textEditState) return null

    const { screenPosition, worldPosition, tool, targetPoint } = textEditState
    const [sx, sy] = screenPosition

    const handleCommit = () => {
        if (!inputText.trim()) {
            setTextEditState(null)
            return
        }

        const state = useStore.getState()
        const layerId = state.activeDrawingLayerId
        const defaults = getEffectiveDrawingDefaults(state, layerId)

        if (tool === 'text') {
            addDrawingObject({
                layerId,
                type: 'text',
                position: [...worldPosition],
                text: inputText.trim(),
                fontSize: defaults.fontSize,
                fontFamily: defaults.fontFamily,
                textColor: defaults.textColor,
                outlineWidth: defaults.outlineWidth ?? 0.1,
                outlineColor: defaults.outlineColor ?? '#ffffff',
                opacity: 1,
            })
        } else if (tool === 'leader') {
            addDrawingObject({
                layerId,
                type: 'leader',
                targetPoint: [...targetPoint],
                textPosition: [...worldPosition],
                text: inputText.trim(),
                fontSize: defaults.fontSize,
                fontFamily: defaults.fontFamily,
                textColor: defaults.textColor,
                strokeColor: defaults.strokeColor,
                strokeWidth: defaults.strokeWidth,
                lineType: defaults.lineType,
                opacity: 1,
            })
        } else if (tool === 'elbowLeader') {
            addDrawingObject({
                layerId,
                type: 'leader',
                targetPoint: [...targetPoint],
                textPosition: [...worldPosition],
                text: inputText.trim(),
                fontSize: defaults.fontSize,
                fontFamily: defaults.fontFamily,
                textColor: defaults.textColor,
                strokeColor: defaults.strokeColor,
                strokeWidth: defaults.strokeWidth,
                lineType: defaults.lineType,
                elbow: true,
                elbowLength: defaults.elbowLength ?? 5,
                opacity: 1,
            })
        }

        setTextEditState(null)
    }

    const handleKeyDown = (e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCommit()
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            setTextEditState(null)
        }
    }

    return (
        <div
            className="absolute z-50"
            style={{ left: sx, top: sy, transform: 'translate(-50%, -100%)' }}
        >
            <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    // Small delay to allow Enter key to fire before blur
                    setTimeout(() => {
                        if (useStore.getState().textEditState) {
                            handleCommit()
                        }
                    }, 100)
                }}
                className="px-2 py-1 text-sm rounded shadow-lg"
                style={{
                    backgroundColor: 'var(--ui-bg-primary)',
                    color: 'var(--ui-text-primary)',
                    border: '2px solid var(--ui-accent)',
                    minWidth: '120px',
                    outline: 'none',
                }}
                placeholder="Type text..."
            />
        </div>
    )
}

export default DrawingTextInput
