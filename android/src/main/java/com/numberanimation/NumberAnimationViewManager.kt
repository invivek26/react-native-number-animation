package com.numberanimation

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.NumberAnimationViewManagerDelegate
import com.facebook.react.viewmanagers.NumberAnimationViewManagerInterface

@ReactModule(name = NumberAnimationViewManager.NAME)
class NumberAnimationViewManager : SimpleViewManager<NumberAnimationView>(),
  NumberAnimationViewManagerInterface<NumberAnimationView> {
  private val delegate: ViewManagerDelegate<NumberAnimationView> = NumberAnimationViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<NumberAnimationView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): NumberAnimationView =
    NumberAnimationView(context)

  override fun addEventEmitters(context: ThemedReactContext, view: NumberAnimationView) {
    super.addEventEmitters(context, view)
    val dispatcher = UIManagerHelper.getEventDispatcher(context)
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    view.setAnimationEventListener(object : AnimationEventListener {
      override fun onAnimationStart(revision: Int) {
        dispatcher?.dispatchEvent(NumberAnimationEvent(surfaceId, view.id, true, revision))
      }

      override fun onAnimationComplete(revision: Int) {
        dispatcher?.dispatchEvent(NumberAnimationEvent(surfaceId, view.id, false, revision))
      }
    })
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    (super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()).apply {
      put(NumberAnimationEvent.START_EVENT, mapOf("registrationName" to "onAnimationStart"))
      put(NumberAnimationEvent.COMPLETE_EVENT, mapOf("registrationName" to "onAnimationComplete"))
    }

  override fun onAfterUpdateTransaction(view: NumberAnimationView) {
    super.onAfterUpdateTransaction(view)
    view.commitProps()
  }

  override fun onDropViewInstance(view: NumberAnimationView) {
    view.resetForRecycle()
    super.onDropViewInstance(view)
  }

  @ReactProp(name = "active")
  override fun setActive(view: NumberAnimationView, value: Boolean) { view.pendingProps.active = value }

  @ReactProp(name = "revision")
  override fun setRevision(view: NumberAnimationView, value: Int) { view.pendingProps.revision = value }

  @ReactProp(name = "formattedValue")
  override fun setFormattedValue(view: NumberAnimationView, value: String?) {
    view.pendingProps.formattedValue = value.orEmpty()
  }

  @ReactProp(name = "slots")
  override fun setSlots(view: NumberAnimationView, value: ReadableArray?) {
    view.pendingProps.slots = value.toSlots()
  }

  @ReactProp(name = "initialSlots")
  override fun setInitialSlots(view: NumberAnimationView, value: ReadableArray?) {
    view.pendingProps.initialSlots = value.toSlots()
  }

  @ReactProp(name = "digitGlyphs")
  override fun setDigitGlyphs(view: NumberAnimationView, value: ReadableArray?) {
    val glyphs = value.toStrings()
    view.pendingProps.digitGlyphs = if (glyphs.size == DIGIT_COUNT) glyphs else DEFAULT_DIGIT_GLYPHS
  }

  @ReactProp(name = "trend")
  override fun setTrend(view: NumberAnimationView, value: Int) { view.pendingProps.trend = value }

  @ReactProp(name = "mask")
  override fun setMask(view: NumberAnimationView, value: Boolean) { view.pendingProps.mask = value }

  @ReactProp(name = "reduceMotion")
  override fun setReduceMotion(view: NumberAnimationView, value: Boolean) {
    view.pendingProps.reduceMotion = value
  }

  @ReactProp(name = "textColor", customType = "Color")
  override fun setTextColor(view: NumberAnimationView, value: Int?) {
    view.pendingProps.textColor = value ?: DEFAULT_TEXT_COLOR
  }

  @ReactProp(name = "fontFamily")
  override fun setFontFamily(view: NumberAnimationView, value: String?) {
    view.pendingProps.fontFamily = value
  }

  @ReactProp(name = "fontSize")
  override fun setFontSize(view: NumberAnimationView, value: Float) {
    view.pendingProps.fontSize = value.finiteOr(DEFAULT_FONT_SIZE)
  }

  @ReactProp(name = "fontWeight")
  override fun setFontWeight(view: NumberAnimationView, value: String?) {
    view.pendingProps.fontWeight = value
  }

  @ReactProp(name = "italic")
  override fun setItalic(view: NumberAnimationView, value: Boolean) { view.pendingProps.italic = value }

  @ReactProp(name = "fontVariant")
  override fun setFontVariant(view: NumberAnimationView, value: ReadableArray?) {
    view.pendingProps.fontVariant = value.toStrings()
  }

  @ReactProp(name = "letterSpacing")
  override fun setLetterSpacing(view: NumberAnimationView, value: Float) {
    view.pendingProps.letterSpacing = value.finiteOr(0f)
  }

  @ReactProp(name = "lineHeight")
  override fun setLineHeight(view: NumberAnimationView, value: Float) {
    view.pendingProps.lineHeight = value.finiteOr(0f)
  }

  @ReactProp(name = "textAlign")
  override fun setTextAlign(view: NumberAnimationView, value: String?) {
    view.pendingProps.textAlign = value ?: "auto"
  }

  @ReactProp(name = "writingDirection")
  override fun setWritingDirection(view: NumberAnimationView, value: String?) {
    view.pendingProps.writingDirection = value ?: "auto"
  }

  @ReactProp(name = "digitDurationMs")
  override fun setDigitDurationMs(view: NumberAnimationView, value: Double) {
    view.pendingProps.digitMotion.durationMs = value.finiteOr(800.0)
  }

  @ReactProp(name = "digitEasing")
  override fun setDigitEasing(view: NumberAnimationView, value: String?) {
    view.pendingProps.digitMotion.easing = value ?: "cubicBezier"
  }

  @ReactProp(name = "digitX1")
  override fun setDigitX1(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.x1 = value.finiteOr(0.22f) }
  @ReactProp(name = "digitY1")
  override fun setDigitY1(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.y1 = value.finiteOr(1f) }
  @ReactProp(name = "digitX2")
  override fun setDigitX2(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.x2 = value.finiteOr(0.36f) }
  @ReactProp(name = "digitY2")
  override fun setDigitY2(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.y2 = value.finiteOr(1f) }
  @ReactProp(name = "digitDamping")
  override fun setDigitDamping(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.damping = value.finiteOr(1f) }
  @ReactProp(name = "digitStiffness")
  override fun setDigitStiffness(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.stiffness = value.finiteOr(100f) }
  @ReactProp(name = "digitMass")
  override fun setDigitMass(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.mass = value.finiteOr(1f) }
  @ReactProp(name = "digitInitialVelocity")
  override fun setDigitInitialVelocity(view: NumberAnimationView, value: Float) { view.pendingProps.digitMotion.initialVelocity = value.finiteOr(0f) }

  @ReactProp(name = "layoutDurationMs")
  override fun setLayoutDurationMs(view: NumberAnimationView, value: Double) {
    view.pendingProps.layoutMotion.durationMs = value.finiteOr(800.0)
  }

  @ReactProp(name = "layoutEasing")
  override fun setLayoutEasing(view: NumberAnimationView, value: String?) {
    view.pendingProps.layoutMotion.easing = value ?: "cubicBezier"
  }

  @ReactProp(name = "layoutX1")
  override fun setLayoutX1(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.x1 = value.finiteOr(0.22f) }
  @ReactProp(name = "layoutY1")
  override fun setLayoutY1(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.y1 = value.finiteOr(1f) }
  @ReactProp(name = "layoutX2")
  override fun setLayoutX2(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.x2 = value.finiteOr(0.36f) }
  @ReactProp(name = "layoutY2")
  override fun setLayoutY2(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.y2 = value.finiteOr(1f) }
  @ReactProp(name = "layoutDamping")
  override fun setLayoutDamping(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.damping = value.finiteOr(1f) }
  @ReactProp(name = "layoutStiffness")
  override fun setLayoutStiffness(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.stiffness = value.finiteOr(100f) }
  @ReactProp(name = "layoutMass")
  override fun setLayoutMass(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.mass = value.finiteOr(1f) }
  @ReactProp(name = "layoutInitialVelocity")
  override fun setLayoutInitialVelocity(view: NumberAnimationView, value: Float) { view.pendingProps.layoutMotion.initialVelocity = value.finiteOr(0f) }

  @ReactProp(name = "opacityDurationMs")
  override fun setOpacityDurationMs(view: NumberAnimationView, value: Double) {
    view.pendingProps.opacityMotion.durationMs = value.finiteOr(450.0)
  }

  @ReactProp(name = "opacityEasing")
  override fun setOpacityEasing(view: NumberAnimationView, value: String?) {
    view.pendingProps.opacityMotion.easing = value ?: "cubicBezier"
  }

  @ReactProp(name = "opacityX1")
  override fun setOpacityX1(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.x1 = value.finiteOr(0.22f) }
  @ReactProp(name = "opacityY1")
  override fun setOpacityY1(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.y1 = value.finiteOr(1f) }
  @ReactProp(name = "opacityX2")
  override fun setOpacityX2(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.x2 = value.finiteOr(0.36f) }
  @ReactProp(name = "opacityY2")
  override fun setOpacityY2(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.y2 = value.finiteOr(1f) }
  @ReactProp(name = "opacityDamping")
  override fun setOpacityDamping(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.damping = value.finiteOr(1f) }
  @ReactProp(name = "opacityStiffness")
  override fun setOpacityStiffness(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.stiffness = value.finiteOr(100f) }
  @ReactProp(name = "opacityMass")
  override fun setOpacityMass(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.mass = value.finiteOr(1f) }
  @ReactProp(name = "opacityInitialVelocity")
  override fun setOpacityInitialVelocity(view: NumberAnimationView, value: Float) { view.pendingProps.opacityMotion.initialVelocity = value.finiteOr(0f) }

  companion object {
    const val NAME = "NumberAnimationView"
    private const val DIGIT_COUNT = 10
  }
}

private fun ReadableArray?.toSlots(): List<NativeSlot> {
  if (this == null) return emptyList()
  return buildList(size()) {
    for (index in 0 until size()) {
      val slot = getMap(index) ?: continue
      if (!slot.hasKey("key") || !slot.hasKey("text")) continue
      add(
        NativeSlot(
          key = slot.getString("key") ?: continue,
          text = slot.getString("text") ?: continue,
          digitValue = if (slot.hasKey("digitValue") && !slot.isNull("digitValue")) slot.getInt("digitValue") else -1,
          delta = if (slot.hasKey("delta") && !slot.isNull("delta")) slot.getInt("delta") else 0,
          entering = slot.hasKey("entering") && !slot.isNull("entering") && slot.getBoolean("entering"),
        ),
      )
    }
  }
}

private fun ReadableArray?.toStrings(): List<String> {
  if (this == null) return emptyList()
  return buildList(size()) {
    for (index in 0 until size()) getString(index)?.let(::add)
  }
}

private fun Float.finiteOr(fallback: Float): Float = if (isFinite()) this else fallback
private fun Double.finiteOr(fallback: Double): Double = if (isFinite()) this else fallback
