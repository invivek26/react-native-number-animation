package com.numberanimation

internal data class NativeSlot(
  val key: String,
  val text: String,
  val digitValue: Int,
  val delta: Int,
  val entering: Boolean,
) {
  val isDigit: Boolean
    get() = digitValue >= 0
}

internal data class MotionSpec(
  var durationMs: Double,
  var easing: String,
  var x1: Float,
  var y1: Float,
  var x2: Float,
  var y2: Float,
  var damping: Float,
  var stiffness: Float,
  var mass: Float,
  var initialVelocity: Float,
) {
  fun copyFrom(other: MotionSpec) {
    durationMs = other.durationMs
    easing = other.easing
    x1 = other.x1
    y1 = other.y1
    x2 = other.x2
    y2 = other.y2
    damping = other.damping
    stiffness = other.stiffness
    mass = other.mass
    initialVelocity = other.initialVelocity
  }
}

internal data class RendererProps(
  var active: Boolean = false,
  var revision: Int = 0,
  var formattedValue: String = "",
  var slots: List<NativeSlot> = emptyList(),
  var initialSlots: List<NativeSlot> = emptyList(),
  var digitGlyphs: List<String> = DEFAULT_DIGIT_GLYPHS,
  var trend: Int = 0,
  var mask: Boolean = true,
  var reduceMotion: Boolean = false,
  var textColor: Int = DEFAULT_TEXT_COLOR,
  var fontFamily: String? = null,
  var fontSize: Float = DEFAULT_FONT_SIZE,
  var fontWeight: String = "normal",
  var italic: Boolean = false,
  var fontVariant: List<String> = emptyList(),
  var letterSpacing: Float = 0f,
  var lineHeight: Float = 0f,
  var textAlign: String = "auto",
  var writingDirection: String = "auto",
  val digitMotion: MotionSpec = defaultDigitMotion(),
  val layoutMotion: MotionSpec = defaultLayoutMotion(),
  val opacityMotion: MotionSpec = defaultOpacityMotion(),
)

internal const val DEFAULT_TEXT_COLOR = 0xff000000.toInt()
internal const val DEFAULT_FONT_SIZE = 14f
internal val DEFAULT_DIGIT_GLYPHS: List<String> = (0..9).map(Int::toString)

private fun defaultDigitMotion() = MotionSpec(
  durationMs = 800.0,
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

private fun defaultLayoutMotion() = defaultDigitMotion()

private fun defaultOpacityMotion() = defaultDigitMotion().copy(durationMs = 450.0)
