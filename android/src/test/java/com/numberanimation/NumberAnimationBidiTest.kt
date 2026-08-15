package com.numberanimation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NumberAnimationBidiTest {
  @Test
  fun retainsLeftToRightSlotOrder() {
    val slots = slots("$", "1", "2", "3")
    assertEquals(slots, NumberAnimationBidi.reorder(slots, "\$123", "auto"))
    assertFalse(NumberAnimationBidi.isRightToLeft("\$123", slots, "auto"))
  }

  @Test
  fun usesDirectionalControlsForHebrewCurrency() {
    val slots = slots("1", ",", "2", "3", "4", ".", "5", "0", " ", "₪")
    val formattedValue = "\u200f1,234.50 \u200f₪"
    val visual = NumberAnimationBidi.reorder(slots, formattedValue, "auto")
    assertEquals(listOf("₪", " ", "1", ",", "2", "3", "4", ".", "5", "0"), visual.map { it.text })
    assertTrue(NumberAnimationBidi.isRightToLeft(formattedValue, slots, "auto"))
  }

  @Test
  fun leftToRightMarkControlsFarsiBaseDirection() {
    val slots = slots("ر", "ی", "ا", "ل", " ", "۱", "٬", "۲", "۳", "۵")
    val formattedValue = "\u200eریال ۱٬۲۳۵"
    val visual = NumberAnimationBidi.reorder(slots, formattedValue, "auto")
    assertEquals(listOf("۱", "٬", "۲", "۳", "۵", " ", "ل", "ا", "ی", "ر"), visual.map { it.text })
    assertFalse(NumberAnimationBidi.isRightToLeft(formattedValue, slots, "auto"))
  }

  private fun slots(vararg text: String): List<NativeSlot> = text.mapIndexed { index, glyph ->
    NativeSlot(
      key = index.toString(),
      text = glyph,
      digitValue = -1,
      delta = 0,
      entering = false,
    )
  }
}
