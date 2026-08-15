package com.numberanimation

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Shader
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.Choreographer
import android.view.View
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.text.ReactTypefaceUtils
import kotlin.math.max

class NumberAnimationView : View, Choreographer.FrameCallback {
  constructor(context: Context) : super(context)
  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs)
  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(
    context,
    attrs,
    defStyleAttr,
  )

  internal val pendingProps = RendererProps()
  private var committedProps = RendererProps()
  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG or Paint.LINEAR_TEXT_FLAG)
  private val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val maskMatrix = Matrix()
  private val verticalFadeIn = LinearGradient(
    0f,
    0f,
    0f,
    1f,
    Color.TRANSPARENT,
    Color.BLACK,
    Shader.TileMode.CLAMP,
  )
  private val verticalFadeOut = LinearGradient(
    0f,
    0f,
    0f,
    1f,
    Color.BLACK,
    Color.TRANSPARENT,
    Shader.TileMode.CLAMP,
  )
  private val glyphWidths = HashMap<String, Float>()
  private val activeSlots = LinkedHashMap<String, RenderSlot>()
  private val exitingSlots = ArrayList<RenderSlot>()
  private var lineHeightPx = 0f
  private var baseline = 0f
  private var letterSpacingPx = 0f
  private var framePosted = false
  private var sessionRunning = false
  private var activeRevision: Int? = null
  private var eventListener: AnimationEventListener? = null

  init {
    isFocusable = false
    isClickable = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    contentDescription = null
    setWillNotDraw(false)
  }

  internal fun setAnimationEventListener(listener: AnimationEventListener?) {
    eventListener = listener
  }

  internal fun commitProps() {
    val now = System.nanoTime()
    updateTracks(now)
    val previousProps = committedProps
    committedProps = pendingProps.deepCopy()
    configurePaint()

    if (!committedProps.active) {
      settleAll()
      seedSlots(committedProps.slots)
      stopFrames()
      sessionRunning = false
      activeRevision = null
      invalidate()
      return
    }

    val startsNewSession = !previousProps.active || previousProps.revision != committedProps.revision
    if (!startsNewSession) {
      if (layoutStyleChanged(previousProps, committedProps)) relayoutSlots(now, animate = false)
      invalidate()
      return
    }

    if (activeSlots.isEmpty() && exitingSlots.isEmpty()) {
      seedSlots(committedProps.initialSlots.ifEmpty { committedProps.slots })
    }

    if (committedProps.reduceMotion) {
      startCrossfade(committedProps.slots, now)
    } else {
      transitionTo(committedProps.slots, now)
    }

    if (activeRevision != committedProps.revision) {
      activeRevision = committedProps.revision
      sessionRunning = true
      eventListener?.onAnimationStart(committedProps.revision)
    }

    if (hasRunningTracks()) {
      postFrame()
    } else {
      finishSession()
    }
    invalidate()
  }

  internal fun resetForRecycle() {
    settleAll()
    stopFrames()
    activeSlots.clear()
    exitingSlots.clear()
    glyphWidths.clear()
    pendingProps.copyFrom(RendererProps())
    committedProps = RendererProps()
    sessionRunning = false
    activeRevision = null
    eventListener = null
    invalidate()
  }

  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(width, height, oldWidth, oldHeight)
    configurePaint()
    if (activeSlots.isEmpty()) return
    val now = System.nanoTime()
    relayoutSlots(now, animate = oldWidth > 0 && width != oldWidth)
    if (hasRunningTracks()) postFrame()
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (width <= 0 || height <= 0) return

    if (!committedProps.mask) {
      drawSlots(canvas, drawDigits = true)
      drawSlots(canvas, drawDigits = false)
      return
    }

    val layer = canvas.saveLayer(0f, 0f, width.toFloat(), height.toFloat(), null)
    drawSlots(canvas, drawDigits = true)
    drawMask(canvas)
    canvas.restoreToCount(layer)
    drawSlots(canvas, drawDigits = false)
  }

  override fun doFrame(frameTimeNanos: Long) {
    framePosted = false
    if (!isAttachedToWindow || !committedProps.active) return
    updateTracks(frameTimeNanos)
    exitingSlots.removeAll { !it.opacity.isRunning && it.opacity.current <= VISIBILITY_EPSILON }
    invalidate()
    if (hasRunningTracks()) {
      postFrame()
    } else {
      finishSession()
    }
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    if (visibility == VISIBLE) {
      if (committedProps.active && hasRunningTracks()) postFrame()
      return
    }
    settleAndComplete()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (committedProps.active && hasRunningTracks()) postFrame()
  }

  override fun onDetachedFromWindow() {
    settleAndComplete()
    super.onDetachedFromWindow()
  }

  private fun seedSlots(slots: List<NativeSlot>) {
    activeSlots.clear()
    computeLayout(slots).forEach { target ->
      activeSlots[target.slot.key] = RenderSlot.from(target, target.slot.digitValue.toFloat())
    }
  }

  private fun transitionTo(slots: List<NativeSlot>, now: Long) {
    val targets = computeLayout(slots)
    val targetKeys = targets.mapTo(HashSet()) { it.slot.key }
    val removedKeys = activeSlots.keys.filterNot(targetKeys::contains)
    removedKeys.forEach { key ->
      val removed = activeSlots.remove(key) ?: return@forEach
      removed.exiting = true
      removed.opacity.animateTo(0f, committedProps.opacityMotion, now)
      if (removed.isDigit) {
        val delta = NumberAnimationMath.exitDelta(removed.digitValue, committedProps.trend)
        removed.wheelTarget += delta
        removed.wheel.animateTo(removed.wheelTarget, committedProps.digitMotion, now)
      }
      exitingSlots.add(removed)
    }

    targets.forEach { target ->
      var state = activeSlots[target.slot.key]
      if (state != null && state.isDigit != target.slot.isDigit) {
        activeSlots.remove(target.slot.key)
        state.exiting = true
        state.opacity.animateTo(0f, committedProps.opacityMotion, now)
        exitingSlots.add(state)
        state = null
      }

      if (state == null) {
        val startDigit = if (target.slot.entering && target.slot.isDigit) 0f else target.slot.digitValue.toFloat()
        state = RenderSlot.from(target, startDigit)
        if (target.slot.entering) state.opacity.snapTo(0f)
        activeSlots[target.slot.key] = state
      }

      state.text = target.slot.text
      state.digitValue = target.slot.digitValue
      state.exiting = false
      state.x.animateTo(target.x, committedProps.layoutMotion, now)
      state.width.animateTo(target.width, committedProps.layoutMotion, now)
      state.opacity.animateTo(1f, committedProps.opacityMotion, now)
      if (target.slot.isDigit && target.slot.delta != 0) {
        state.wheelTarget += target.slot.delta
        state.wheel.animateTo(state.wheelTarget, committedProps.digitMotion, now)
      } else if (target.slot.isDigit && !state.wheel.isRunning) {
        state.wheelTarget = target.slot.digitValue.toFloat()
        state.wheel.snapTo(state.wheelTarget)
      }
    }
  }

  private fun startCrossfade(slots: List<NativeSlot>, now: Long) {
    activeSlots.values.forEach { previous ->
      val snapshot = previous.snapshot("${previous.key}:reduce:${committedProps.revision}")
      snapshot.exiting = true
      snapshot.opacity.animateTo(0f, committedProps.opacityMotion, now)
      exitingSlots.add(snapshot)
    }
    activeSlots.clear()
    computeLayout(slots).forEach { target ->
      val state = RenderSlot.from(target, target.slot.digitValue.toFloat())
      state.opacity.snapTo(0f)
      state.opacity.animateTo(1f, committedProps.opacityMotion, now)
      activeSlots[target.slot.key] = state
    }
  }

  private fun computeLayout(slots: List<NativeSlot>): List<LayoutTarget> {
    val visualSlots = reorderForDisplay(slots)
    val widths = visualSlots.map(::measureSlot)
    val contentWidth = widths.sum() + letterSpacingPx * max(0, visualSlots.size - 1)
    val rtl = resolvedRightToLeft(visualSlots)
    val alignment = resolveAlignment(rtl)
    var cursor = when (alignment) {
      Paint.Align.RIGHT -> width - contentWidth
      Paint.Align.CENTER -> (width - contentWidth) * 0.5f
      else -> 0f
    }
    return visualSlots.mapIndexed { index, slot ->
      LayoutTarget(slot, cursor, widths[index]).also {
        cursor += widths[index]
        if (index < visualSlots.lastIndex) cursor += letterSpacingPx
      }
    }
  }

  private fun reorderForDisplay(slots: List<NativeSlot>): List<NativeSlot> =
    NumberAnimationBidi.reorder(slots, committedProps.formattedValue, committedProps.writingDirection)

  private fun resolvedRightToLeft(slots: List<NativeSlot>): Boolean =
    NumberAnimationBidi.isRightToLeft(
      committedProps.formattedValue,
      slots,
      committedProps.writingDirection,
    )

  private fun resolveAlignment(rtl: Boolean): Paint.Align = when (committedProps.textAlign) {
    "center" -> Paint.Align.CENTER
    "right" -> Paint.Align.RIGHT
    "left" -> Paint.Align.LEFT
    "end" -> if (rtl) Paint.Align.LEFT else Paint.Align.RIGHT
    else -> if (rtl) Paint.Align.RIGHT else Paint.Align.LEFT
  }

  private fun drawSlots(canvas: Canvas, drawDigits: Boolean) {
    exitingSlots.forEach { slot ->
      if (slot.isDigit == drawDigits) drawSlot(canvas, slot)
    }
    activeSlots.values.forEach { slot ->
      if (slot.isDigit == drawDigits) drawSlot(canvas, slot)
    }
  }

  private fun drawSlot(canvas: Canvas, slot: RenderSlot) {
    val alpha = (slot.opacity.current.coerceIn(0f, 1f) * Color.alpha(committedProps.textColor)).toInt()
    if (alpha <= 0) return
    textPaint.alpha = alpha
    val x = slot.x.current
    val slotWidth = slot.width.current
    if (!slot.isDigit) {
      canvas.drawText(slot.text, x, baseline, textPaint)
      return
    }

    val save = canvas.save()
    canvas.clipRect(x, 0f, x + slotWidth, height.toFloat())
    committedProps.digitGlyphs.take(WHEEL_SIZE).forEachIndexed { digit, glyph ->
      val offset = NumberAnimationMath.signedDigitOffset(digit, slot.wheel.current)
      if (offset < -VISIBLE_WHEEL_RANGE || offset > VISIBLE_WHEEL_RANGE) return@forEachIndexed
      val glyphWidth = measureGlyph(glyph)
      val glyphX = x + (slotWidth - glyphWidth) * 0.5f
      canvas.drawText(glyph, glyphX, baseline + offset * lineHeightPx, textPaint)
    }
    canvas.restoreToCount(save)
  }

  private fun drawMask(canvas: Canvas) {
    maskPaint.xfermode = DST_IN
    val verticalFade = minOf(max(1f, lineHeightPx * VERTICAL_FADE_RATIO), height * MAX_FADE_RATIO)
    drawVerticalMask(canvas, verticalFade)
    maskPaint.shader = null
    maskPaint.xfermode = null
  }

  private fun drawVerticalMask(canvas: Canvas, fade: Float) {
    applyMaskShader(verticalFadeIn, 1f, fade, 0f, 0f)
    canvas.drawRect(0f, 0f, width.toFloat(), fade, maskPaint)
    maskPaint.shader = null
    maskPaint.color = Color.BLACK
    canvas.drawRect(0f, fade, width.toFloat(), height - fade, maskPaint)
    applyMaskShader(verticalFadeOut, 1f, fade, 0f, height - fade)
    canvas.drawRect(0f, height - fade, width.toFloat(), height.toFloat(), maskPaint)
  }

  private fun applyMaskShader(shader: Shader, scaleX: Float, scaleY: Float, x: Float, y: Float) {
    maskMatrix.setScale(scaleX, scaleY)
    maskMatrix.postTranslate(x, y)
    shader.setLocalMatrix(maskMatrix)
    maskPaint.shader = shader
  }

  private fun configurePaint() {
    val size = PixelUtil.toPixelFromDIP(committedProps.fontSize).coerceAtLeast(1f)
    letterSpacingPx = PixelUtil.toPixelFromDIP(committedProps.letterSpacing)
    textPaint.color = committedProps.textColor
    textPaint.textSize = size
    textPaint.typeface = ReactTypefaceUtils.applyStyles(
      null,
      if (committedProps.italic) Typeface.ITALIC else Typeface.NORMAL,
      resolveFontWeight(committedProps.fontWeight),
      committedProps.fontFamily,
      context.assets,
    )
    textPaint.fontFeatureSettings = resolveFontFeatures(committedProps.fontVariant)
    val metrics = textPaint.fontMetrics
    val naturalHeight = metrics.descent - metrics.ascent
    lineHeightPx = if (committedProps.lineHeight > 0f) {
      PixelUtil.toPixelFromDIP(committedProps.lineHeight)
    } else {
      naturalHeight
    }
    baseline = (height - metrics.descent - metrics.ascent) * 0.5f
    glyphWidths.clear()
  }

  private fun measureSlot(slot: NativeSlot): Float {
    val glyph = if (slot.isDigit) {
      committedProps.digitGlyphs.getOrNull(slot.digitValue) ?: slot.text
    } else {
      slot.text
    }
    return measureGlyph(glyph)
  }

  private fun measureGlyph(glyph: String): Float = glyphWidths.getOrPut(glyph) {
    textPaint.measureText(glyph)
  }

  private fun relayoutSlots(now: Long, animate: Boolean) {
    computeLayout(committedProps.slots).forEach { target ->
      val state = activeSlots[target.slot.key] ?: return@forEach
      if (animate) {
        state.x.animateTo(target.x, committedProps.layoutMotion, now)
        state.width.animateTo(target.width, committedProps.layoutMotion, now)
      } else {
        state.x.snapTo(target.x)
        state.width.snapTo(target.width)
      }
    }
  }

  private fun updateTracks(now: Long) {
    activeSlots.values.forEach { it.update(now) }
    exitingSlots.forEach { it.update(now) }
  }

  private fun hasRunningTracks(): Boolean =
    activeSlots.values.any(RenderSlot::isRunning) || exitingSlots.any(RenderSlot::isRunning)

  private fun settleAll() {
    activeSlots.values.forEach(RenderSlot::settle)
    exitingSlots.clear()
  }

  private fun settleAndComplete() {
    if (!sessionRunning && !framePosted) return
    settleAll()
    stopFrames()
    invalidate()
    finishSession()
  }

  private fun finishSession() {
    if (!sessionRunning) return
    sessionRunning = false
    val revision = activeRevision ?: return
    eventListener?.onAnimationComplete(revision)
  }

  private fun postFrame() {
    if (framePosted || !isAttachedToWindow) return
    framePosted = true
    Choreographer.getInstance().postFrameCallback(this)
  }

  private fun stopFrames() {
    if (!framePosted) return
    Choreographer.getInstance().removeFrameCallback(this)
    framePosted = false
  }

  private data class LayoutTarget(val slot: NativeSlot, val x: Float, val width: Float)

  private class RenderSlot(
    val key: String,
    var text: String,
    var digitValue: Int,
    val isDigit: Boolean,
    var wheelTarget: Float,
    val wheel: AnimatedScalar,
    val x: AnimatedScalar,
    val width: AnimatedScalar,
    val opacity: AnimatedScalar,
    var exiting: Boolean = false,
  ) {
    fun update(now: Long) {
      wheel.update(now)
      x.update(now)
      width.update(now)
      opacity.update(now)
    }

    fun isRunning(): Boolean = wheel.isRunning || x.isRunning || width.isRunning || opacity.isRunning

    fun settle() {
      wheel.snapTo(wheel.target)
      x.snapTo(x.target)
      width.snapTo(width.target)
      opacity.snapTo(opacity.target)
    }

    fun snapshot(snapshotKey: String): RenderSlot = RenderSlot(
      key = snapshotKey,
      text = text,
      digitValue = digitValue,
      isDigit = isDigit,
      wheelTarget = wheel.current,
      wheel = AnimatedScalar(wheel.current),
      x = AnimatedScalar(x.current),
      width = AnimatedScalar(width.current),
      opacity = AnimatedScalar(opacity.current),
      exiting = exiting,
    )

    companion object {
      fun from(target: LayoutTarget, initialDigit: Float): RenderSlot = RenderSlot(
        key = target.slot.key,
        text = target.slot.text,
        digitValue = target.slot.digitValue,
        isDigit = target.slot.isDigit,
        wheelTarget = initialDigit,
        wheel = AnimatedScalar(initialDigit),
        x = AnimatedScalar(target.x),
        width = AnimatedScalar(target.width),
        opacity = AnimatedScalar(1f),
      )
    }
  }

  private companion object {
    const val WHEEL_SIZE = 10
    const val VISIBLE_WHEEL_RANGE = 1.5f
    const val VISIBILITY_EPSILON = 0.001f
    const val VERTICAL_FADE_RATIO = 0.22f
    const val MAX_FADE_RATIO = 0.48f
    val DST_IN = PorterDuffXfermode(PorterDuff.Mode.DST_IN)

    fun resolveFontWeight(weightValue: String): Int =
      when (weightValue) {
        "bold" -> 700
        "normal" -> 400
        else -> weightValue.toIntOrNull()?.coerceIn(100, 900) ?: 400
      }

    fun resolveFontFeatures(variants: List<String>): String? {
      if (variants.isEmpty()) return null
      val tags = variants.mapNotNull {
        when (it) {
          "small-caps" -> "smcp"
          "oldstyle-nums" -> "onum"
          "lining-nums" -> "lnum"
          "tabular-nums" -> "tnum"
          "proportional-nums" -> "pnum"
          else -> null
        }
      }
      return tags.takeIf(List<String>::isNotEmpty)?.joinToString(",") { "'$it'" }
    }
  }
}

internal interface AnimationEventListener {
  fun onAnimationStart(revision: Int)
  fun onAnimationComplete(revision: Int)
}

private fun RendererProps.deepCopy(): RendererProps = RendererProps(
  active = active,
  revision = revision,
  formattedValue = formattedValue,
  slots = slots,
  initialSlots = initialSlots,
  digitGlyphs = digitGlyphs,
  trend = trend,
  mask = mask,
  reduceMotion = reduceMotion,
  textColor = textColor,
  fontFamily = fontFamily,
  fontSize = fontSize,
  fontWeight = fontWeight,
  italic = italic,
  fontVariant = fontVariant,
  letterSpacing = letterSpacing,
  lineHeight = lineHeight,
  textAlign = textAlign,
  writingDirection = writingDirection,
  digitMotion = digitMotion.copy(),
  layoutMotion = layoutMotion.copy(),
  opacityMotion = opacityMotion.copy(),
)

private fun RendererProps.copyFrom(other: RendererProps) {
  active = other.active
  revision = other.revision
  formattedValue = other.formattedValue
  slots = other.slots
  initialSlots = other.initialSlots
  digitGlyphs = other.digitGlyphs
  trend = other.trend
  mask = other.mask
  reduceMotion = other.reduceMotion
  textColor = other.textColor
  fontFamily = other.fontFamily
  fontSize = other.fontSize
  fontWeight = other.fontWeight
  italic = other.italic
  fontVariant = other.fontVariant
  letterSpacing = other.letterSpacing
  lineHeight = other.lineHeight
  textAlign = other.textAlign
  writingDirection = other.writingDirection
  digitMotion.copyFrom(other.digitMotion)
  layoutMotion.copyFrom(other.layoutMotion)
  opacityMotion.copyFrom(other.opacityMotion)
}

private fun layoutStyleChanged(previous: RendererProps, current: RendererProps): Boolean =
  previous.fontFamily != current.fontFamily ||
    previous.fontSize != current.fontSize ||
    previous.fontWeight != current.fontWeight ||
    previous.italic != current.italic ||
    previous.fontVariant != current.fontVariant ||
    previous.letterSpacing != current.letterSpacing ||
    previous.textAlign != current.textAlign ||
    previous.writingDirection != current.writingDirection ||
    previous.digitGlyphs != current.digitGlyphs
