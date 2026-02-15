/**
 * Auto-stack parallel dimensions to avoid overlaps.
 * Groups dimensions by approximate direction, sorts, and assigns offsets
 * with a minimum gap between parallel dimensions.
 */

/**
 * Compute adjusted offsets for a set of dimensions to prevent overlaps.
 *
 * @param {Array<{ id: string, start: [number,number,number], end: [number,number,number], baseOffset: number, priority?: number }>} dimensions
 * @param {number} gap - Minimum gap between stacked dimensions (default: 8)
 * @returns {Object} Map of dimension id to adjusted offset: { [id]: number }
 */
export const computeDimensionOffsets = (dimensions, gap = 8) => {
    if (!dimensions || dimensions.length === 0) return {}

    // Group dimensions by approximate direction (parallel sets)
    const groups = groupByDirection(dimensions)
    const result = {}

    for (const group of Object.values(groups)) {
        if (group.length <= 1) {
            // Single dimension in group, use its base offset
            for (const dim of group) {
                result[dim.id] = dim.baseOffset
            }
            continue
        }

        // Sort by absolute base offset (closest to feature first)
        const sorted = [...group].sort((a, b) => {
            // Priority first (lower = closer)
            if (a.priority !== b.priority) return (a.priority || 0) - (b.priority || 0)
            return Math.abs(a.baseOffset) - Math.abs(b.baseOffset)
        })

        // Determine offset direction (sign of first dimension's offset)
        const sign = sorted[0].baseOffset >= 0 ? 1 : -1

        // Stack with minimum gap
        let currentOffset = Math.abs(sorted[0].baseOffset)
        for (let i = 0; i < sorted.length; i++) {
            const dim = sorted[i]
            const desiredOffset = Math.abs(dim.baseOffset)

            if (i === 0) {
                result[dim.id] = sign * currentOffset
            } else {
                // Ensure minimum gap from previous dimension
                const minOffset = currentOffset + gap
                const adjustedOffset = Math.max(desiredOffset, minOffset)
                result[dim.id] = sign * adjustedOffset
                currentOffset = adjustedOffset
            }
        }
    }

    return result
}

/**
 * Group dimensions by approximate direction.
 * Dimensions within ~15 degrees of each other are considered parallel.
 */
function groupByDirection(dimensions) {
    const ANGLE_THRESHOLD = Math.PI / 12 // 15 degrees
    const groups = {}
    let groupId = 0

    for (const dim of dimensions) {
        const dx = dim.end[0] - dim.start[0]
        const dy = dim.end[1] - dim.start[1]
        const angle = Math.atan2(dy, dx)
        // Normalize angle to [0, PI) (direction-agnostic)
        const normalizedAngle = ((angle % Math.PI) + Math.PI) % Math.PI

        let matched = false
        for (const [gId, group] of Object.entries(groups)) {
            const refAngle = group[0]._normalizedAngle
            const diff = Math.abs(normalizedAngle - refAngle)
            if (diff < ANGLE_THRESHOLD || Math.abs(diff - Math.PI) < ANGLE_THRESHOLD) {
                group.push({ ...dim, _normalizedAngle: normalizedAngle })
                matched = true
                break
            }
        }

        if (!matched) {
            groups[groupId] = [{ ...dim, _normalizedAngle: normalizedAngle }]
            groupId++
        }
    }

    return groups
}
