package com.numberanimation

import java.text.Bidi

internal object NumberAnimationBidi {
  fun reorder(
    slots: List<NativeSlot>,
    formattedValue: String,
    writingDirection: String,
  ): List<NativeSlot> {
    if (slots.size < 2) return slots
    var text = formattedValue.ifEmpty { slots.joinToString(separator = "") { it.text } }
    if (text.isEmpty()) return slots
    var starts = locateSlots(slots, text)
    if (starts == null) {
      text = slots.joinToString(separator = "") { it.text }
      starts = locateSlots(slots, text) ?: return slots
    }
    val bidi = Bidi(text, directionFor(writingDirection))
    if (!bidi.isMixed && bidi.baseIsLeftToRight()) return slots

    val levels = ByteArray(bidi.runCount) { bidi.getRunLevel(it).toByte() }
    val visualRuns = Array<Any>(bidi.runCount) { it }
    Bidi.reorderVisually(levels, 0, visualRuns, 0, visualRuns.size)
    val result = ArrayList<NativeSlot>(slots.size)
    visualRuns.forEach { visualRun ->
      val run = visualRun as Int
      val runStart = bidi.getRunStart(run)
      val runLimit = bidi.getRunLimit(run)
      val members = slots.indices.filter { starts[it] in runStart until runLimit }
      val ordered = if (bidi.getRunLevel(run) % 2 == 1) members.reversed() else members
      ordered.forEach { result.add(slots[it]) }
    }
    return if (result.size == slots.size) result else slots
  }

  fun isRightToLeft(formattedValue: String, slots: List<NativeSlot>, writingDirection: String): Boolean {
    if (writingDirection == "rtl") return true
    if (writingDirection == "ltr") return false
    val text = formattedValue.ifEmpty { slots.joinToString(separator = "") { it.text } }
    return text.isNotEmpty() && !Bidi(text, Bidi.DIRECTION_DEFAULT_LEFT_TO_RIGHT).baseIsLeftToRight()
  }

  private fun locateSlots(slots: List<NativeSlot>, text: String): IntArray? {
    val starts = IntArray(slots.size)
    var cursor = 0
    slots.forEachIndexed { index, slot ->
      if (slot.text.isEmpty()) {
        starts[index] = cursor
        return@forEachIndexed
      }
      val found = text.indexOf(slot.text, cursor)
      if (found < 0 || text.substring(cursor, found).any { !it.isBidiControl() }) return null
      starts[index] = found
      cursor = found + slot.text.length
    }
    return starts
  }

  private fun directionFor(writingDirection: String): Int = when (writingDirection) {
    "rtl" -> Bidi.DIRECTION_RIGHT_TO_LEFT
    "ltr" -> Bidi.DIRECTION_LEFT_TO_RIGHT
    else -> Bidi.DIRECTION_DEFAULT_LEFT_TO_RIGHT
  }

  private fun Char.isBidiControl(): Boolean =
    this == '\u061c' ||
      this == '\u200e' ||
      this == '\u200f' ||
      this in '\u202a'..'\u202e' ||
      this in '\u2066'..'\u2069'
}
