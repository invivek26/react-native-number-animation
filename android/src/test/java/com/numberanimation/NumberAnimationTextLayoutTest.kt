package com.numberanimation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NumberAnimationTextLayoutTest {
  @Test
  fun kerningAwarePositionsEndAtTheShapedTextBoundary() {
    val glyphWidths = mapOf(
      "$" to 5.97f,
      "1" to 3.01f,
      "0" to 6.14f,
      "," to 1.84f,
    )
    val slots = "$100,000".map(Char::toString)
    val positions = NumberAnimationTextLayout.position(
      slots = slots,
      letterSpacing = 0f,
      text = { it },
      measure = { value ->
        val standalone = value.sumOf { glyphWidths.getValue(it.toString()).toDouble() }.toFloat()
        standalone + when (value) {
          "$100" -> -0.5f
          "$100," -> -0.5f
          "$100,0" -> -1f
          "$100,00" -> -1f
          "$100,000" -> -1f
          else -> 0f
        }
      },
    )

    val isolatedWidth = slots.sumOf { glyphWidths.getValue(it).toDouble() }.toFloat()
    val finalSlot = positions.last()

    assertTrue(isolatedWidth > finalSlot.end)
    assertEquals(40.52f, finalSlot.end, 0.0001f)
    assertEquals(finalSlot.end - glyphWidths.getValue("0"), finalSlot.x, 0.0001f)
  }

  @Test
  fun letterSpacingIsAppliedOnlyBetweenSlots() {
    val positions = NumberAnimationTextLayout.position(
      slots = listOf("1", "2", "3"),
      letterSpacing = 2f,
      text = { it },
      measure = { it.length * 5f },
    )

    assertEquals(0f, positions[0].x, 0.0001f)
    assertEquals(7f, positions[1].x, 0.0001f)
    assertEquals(14f, positions[2].x, 0.0001f)
    assertEquals(19f, positions.last().end, 0.0001f)
  }
}
