import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const Section = ({ title, children, isOpen, onToggle, className = "" }) => (
    <div className={`border-b border-gray-700 last:border-0 ${className}`}>
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-colors"
        >
            {title}
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {isOpen && <div className="p-2 bg-gray-900 space-y-2">{children}</div>}
    </div>
)

export default Section
