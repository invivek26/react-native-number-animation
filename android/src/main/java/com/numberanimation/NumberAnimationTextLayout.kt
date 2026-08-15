package com.numberanimation

internal data class TextSlotPosition<T>(
  val slot: T,
  val x: Float,
  val width: Float,
) {
  val end: Float
    get() = x + width
}

internal object NumberAnimationTextLayout {
  fun <T> position(
    slots: List<T>,
    letterSpacing: Float,
    text: (T) -> String,
    measure: (String) -> Float,
  ): List<TextSlotPosition<T>> {
    val shapedPrefix = StringBuilder()
    return slots.mapIndexed { index, slot ->
      val slotText = text(slot)
      shapedPrefix.append(slotText)
      val width = measure(slotText)
      val shapedEnd = measure(shapedPrefix.toString()) + letterSpacing * index
      TextSlotPosition(slot, shapedEnd - width, width)
    }
  }
}
