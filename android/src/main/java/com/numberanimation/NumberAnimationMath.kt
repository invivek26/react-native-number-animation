package com.numberanimation

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

internal object NumberAnimationMath {
  fun signedDigitOffset(digit: Int, position: Float, wheelSize: Int = 10): Float {
    val raw = ((digit - position) % wheelSize + wheelSize) % wheelSize
    val half = wheelSize / 2f
    return if (raw >= half) raw - wheelSize else raw
  }

  fun exitDelta(previousDigit: Int, trend: Int, wheelSize: Int = 10): Int {
    if (previousDigit == 0) return 0
    if (trend > 0) return wheelSize - previousDigit
    if (trend < 0) return -previousDigit
    return if (previousDigit <= wheelSize / 2) -previousDigit else wheelSize - previousDigit
  }

  fun interpolate(spec: MotionSpec, elapsedMs: Float): Float {
    if (spec.durationMs <= 0.0) return 1f
    val progress = (elapsedMs / spec.durationMs.toFloat()).coerceIn(0f, 1f)
    if (progress >= 1f) return 1f
    return if (spec.easing == "spring") spring(progress, spec) else cubicBezier(progress, spec)
  }

  private fun cubicBezier(progress: Float, spec: MotionSpec): Float {
    if (spec.x1 == spec.y1 && spec.x2 == spec.y2) return progress
    var lower = 0f
    var upper = 1f
    var parameter = progress
    repeat(BEZIER_ITERATIONS) {
      parameter = (lower + upper) * 0.5f
      val x = bezierCoordinate(parameter, spec.x1, spec.x2)
      if (x < progress) lower = parameter else upper = parameter
    }
    return bezierCoordinate(parameter, spec.y1, spec.y2)
  }

  private fun bezierCoordinate(t: Float, first: Float, second: Float): Float {
    val inverse = 1f - t
    return 3f * inverse * inverse * t * first + 3f * inverse * t * t * second + t * t * t
  }

  /** Unit-step damped oscillator, normalized to the configured visual duration. */
  private fun spring(progress: Float, spec: MotionSpec): Float {
    val mass = max(spec.mass, MIN_SPRING_VALUE)
    val stiffness = max(spec.stiffness, MIN_SPRING_VALUE)
    val damping = max(spec.damping, MIN_SPRING_VALUE)
    val durationSeconds = max(spec.durationMs.toFloat() / 1000f, MIN_SPRING_VALUE)
    val time = progress * durationSeconds
    val naturalFrequency = sqrt(stiffness / mass)
    val dampingRatio = damping / (2f * sqrt(stiffness * mass))
    val velocity = spec.initialVelocity

    val value = when {
      dampingRatio < 1f -> {
        val dampedFrequency = naturalFrequency * sqrt(1f - dampingRatio * dampingRatio)
        val envelope = exp(-dampingRatio * naturalFrequency * time)
        val coefficient = (dampingRatio * naturalFrequency - velocity) / dampedFrequency
        1f - envelope * (cos(dampedFrequency * time) + coefficient * sin(dampedFrequency * time))
      }
      abs(dampingRatio - 1f) < CRITICAL_EPSILON -> {
        val envelope = exp(-naturalFrequency * time)
        1f - envelope * (1f + (naturalFrequency - velocity) * time)
      }
      else -> {
        val root = sqrt(dampingRatio * dampingRatio - 1f)
        val firstRoot = -naturalFrequency * (dampingRatio - root)
        val secondRoot = -naturalFrequency * (dampingRatio + root)
        val firstCoefficient = (velocity - secondRoot) / (firstRoot - secondRoot)
        val secondCoefficient = 1f - firstCoefficient
        1f - firstCoefficient * exp(firstRoot * time) - secondCoefficient * exp(secondRoot * time)
      }
    }
    return min(MAX_SPRING_PROGRESS, max(MIN_SPRING_PROGRESS, value))
  }

  private const val BEZIER_ITERATIONS = 12
  private const val MIN_SPRING_VALUE = 0.01f
  private const val CRITICAL_EPSILON = 0.0001f
  private const val MIN_SPRING_PROGRESS = -4f
  private const val MAX_SPRING_PROGRESS = 5f
}

internal class AnimatedScalar(initialValue: Float) {
  var current: Float = initialValue
    private set
  var target: Float = initialValue
    private set
  private var start: Float = initialValue
  private var startNanos: Long = 0L
  private var spec: MotionSpec? = null

  val isRunning: Boolean
    get() = spec != null

  fun animateTo(value: Float, motion: MotionSpec, nowNanos: Long) {
    update(nowNanos)
    if (current == value || motion.durationMs <= 0.0) {
      snapTo(value)
      return
    }
    start = current
    target = value
    startNanos = nowNanos
    spec = motion.copy()
  }

  fun snapTo(value: Float) {
    current = value
    target = value
    start = value
    spec = null
  }

  fun update(nowNanos: Long): Boolean {
    val activeSpec = spec ?: return false
    val elapsedMs = (nowNanos - startNanos).coerceAtLeast(0L) / NANOS_PER_MILLISECOND
    if (elapsedMs >= activeSpec.durationMs) {
      snapTo(target)
      return true
    }
    val progress = NumberAnimationMath.interpolate(activeSpec, elapsedMs.toFloat())
    current = start + (target - start) * progress
    return false
  }

  private companion object {
    private const val NANOS_PER_MILLISECOND = 1_000_000.0
  }
}
