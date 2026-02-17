import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

/**
 * Collapsible section component for panel organization (dark theme).
 *
 * @param {string} title - Section heading text
 * @param {React.ReactNode} icon - Optional icon element rendered before the title
 * @param {boolean} defaultOpen - Whether the section is open on first render (default: true)
 * @param {React.ReactNode} children - Content rendered when section is open
 * @param {React.ReactNode} headerRight - Optional element(s) rendered right-aligned in the header, before the chevron
 */
const Section = ({ title, icon, defaultOpen = true, children, headerRight }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="mb-3">
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } }}
                className="w-full flex items-center justify-between p-2 rounded font-bold uppercase tracking-wide hover-bg-secondary transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', borderLeft: '3px solid var(--ui-accent)', fontSize: '11px', letterSpacing: '0.08em' }}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {headerRight}
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>
            {isOpen && (
                <div className="p-2 space-y-2">
                    {children}
                </div>
            )}
        </div>
    )
}

export default Section
