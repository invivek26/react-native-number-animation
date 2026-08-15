package com.numberanimation

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class NumberAnimationEvent(
  surfaceId: Int,
  viewId: Int,
  private val started: Boolean,
  private val revision: Int,
) : Event<NumberAnimationEvent>(surfaceId, viewId) {
  override fun getEventName(): String = if (started) START_EVENT else COMPLETE_EVENT

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("revision", revision)
  }

  companion object {
    const val START_EVENT = "topAnimationStart"
    const val COMPLETE_EVENT = "topAnimationComplete"
  }
}
