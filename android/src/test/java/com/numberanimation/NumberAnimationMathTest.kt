package com.numberanimation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NumberAnimationMathTest {
  @Test
  fun signedDigitOffsetWrapsToNearestGlyph() {
    assertEquals(1f, NumberAnimationMath.signedDigitOffset(0, 9f), 0.0001f)
    assertEquals(-1f, NumberAnimationMath.signedDigitOffset(9, 0f), 0.0001f)
    assertEquals(-0.25f, NumberAnimationMath.signedDigitOffset(2, 2.25f), 0.0001f)
  }

  @Test
  fun exitDeltaHonorsTrendAndShortestPath() {
    assertEquals(7, NumberAnimationMath.exitDelta(3, 1))
    assertEquals(-3, NumberAnimationMath.exitDelta(3, -1))
    assertEquals(-3, NumberAnimationMath.exitDelta(3, 0))
    assertEquals(3, NumberAnimationMath.exitDelta(7, 0))
    assertEquals(0, NumberAnimationMath.exitDelta(0, 1))
  }

  @Test
  fun cubicAnimationHitsEndpoints() {
    val motion = testMotion(durationMs = 100.0)
    assertEquals(0f, NumberAnimationMath.interpolate(motion, 0f), 0.001f)
    assertEquals(1f, NumberAnimationMath.interpolate(motion, 100f), 0.001f)
  }

  @Test
  fun animatedScalarInterruptsFromCurrentPresentation() {
    val scalar = AnimatedScalar(0f)
    val motion = testMotion(durationMs = 100.0)
    scalar.animateTo(10f, motion, 0L)
    scalar.update(50_000_000L)
    val interruptedAt = scalar.current
    assertTrue(interruptedAt > 0f)
    assertTrue(interruptedAt < 10f)

    scalar.animateTo(20f, motion, 50_000_000L)
    assertEquals(interruptedAt, scalar.current, 0.0001f)
    scalar.update(150_000_000L)
    assertEquals(20f, scalar.current, 0.0001f)
    assertFalse(scalar.isRunning)
  }

  @Test
  fun springRemainsFiniteForInvalidPhysicalInputs() {
    val motion = testMotion(durationMs = 500.0).copy(
      easing = "spring",
      damping = 0f,
      stiffness = 0f,
      mass = 0f,
    )
    assertTrue(NumberAnimationMath.interpolate(motion, 250f).isFinite())
  }

  private fun testMotion(durationMs: Double) = MotionSpec(
    durationMs = durationMs,
    easing = "cubicBezier",
    x1 = 0.22f,
    y1 = 1f,
    x2 = 0.36f,
    y2 = 1f,
    damping = 1f,
    stiffness = 100f,
    mass = 1f,
    initialVelocity = 0f,
  )
}
