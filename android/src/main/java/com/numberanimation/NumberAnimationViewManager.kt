package com.numberanimation

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.NumberAnimationViewManagerInterface
import com.facebook.react.viewmanagers.NumberAnimationViewManagerDelegate

@ReactModule(name = NumberAnimationViewManager.NAME)
class NumberAnimationViewManager : SimpleViewManager<NumberAnimationView>(),
  NumberAnimationViewManagerInterface<NumberAnimationView> {
  private val mDelegate: ViewManagerDelegate<NumberAnimationView>

  init {
    mDelegate = NumberAnimationViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<NumberAnimationView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): NumberAnimationView {
    return NumberAnimationView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: NumberAnimationView?, color: Int?) {
    view?.setBackgroundColor(color ?: Color.TRANSPARENT)
  }

  companion object {
    const val NAME = "NumberAnimationView"
  }
}
