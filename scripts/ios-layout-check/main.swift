// Drives the real NumberAnimationRenderer through $105,174.71 <-> $1,049,482.14
// and checks where each slot starts its slide: new slots start at their final
// x, and kept slots never overlap while x and width animate together.
import UIKit

func slot(_ key: String, _ text: String, _ delta: Int = 0, entering: Bool = false) -> NumberAnimationSlot {
  NumberAnimationSlot(key: key, text: text, digitValue: Int(text) ?? -1, delta: delta, entering: entering)
}

func timing(_ ms: Double) -> NumberAnimationTiming {
  NumberAnimationTiming(
    durationMs: ms, easing: "cubicBezier", x1: 0.22, y1: 1, x2: 0.36, y2: 1,
    damping: 1, stiffness: 100, mass: 1, initialVelocity: 0
  )
}

func config(_ revision: Int, _ text: String, _ slots: [NumberAnimationSlot], align: String) -> NumberAnimationConfiguration {
  let c = NumberAnimationConfiguration()
  c.active = true
  c.revision = revision
  c.formattedValue = text
  c.slots = slots
  c.initialSlots = slots
  c.digitGlyphs = (0...9).map(String.init)
  c.fontSize = 47
  c.fontWeight = "300"
  c.textAlign = align
  c.digitTiming = timing(800)
  c.layoutTiming = timing(800)
  c.opacityTiming = timing(450)
  return c
}

let small = [
  slot("prefix:0", "$"), slot("integer:5", "1"), slot("integer:4", "0"), slot("integer:3", "5"),
  slot("group:0", ","), slot("integer:2", "1"), slot("integer:1", "7"), slot("integer:0", "4"),
  slot("decimal:0", "."), slot("fraction:0", "7"), slot("fraction:1", "1"),
]
let big = [
  slot("prefix:0", "$"), slot("integer:6", "1"), slot("group:1", ","), slot("integer:5", "0"),
  slot("integer:4", "4"), slot("integer:3", "9"), slot("group:0", ","), slot("integer:2", "4"),
  slot("integer:1", "8"), slot("integer:0", "2"), slot("decimal:0", "."), slot("fraction:0", "1"),
  slot("fraction:1", "4"),
]
let grow = [
  slot("prefix:0", "$"), slot("integer:6", "1", 1, entering: true), slot("group:1", ",", entering: true),
  slot("integer:5", "0", 9), slot("integer:4", "4", 4), slot("integer:3", "9", 4), slot("group:0", ","),
  slot("integer:2", "4", 3), slot("integer:1", "8", 1), slot("integer:0", "2", 8), slot("decimal:0", "."),
  slot("fraction:0", "1", 4), slot("fraction:1", "4", 3),
]
let shrink = [
  slot("prefix:0", "$"), slot("integer:5", "1", -9), slot("integer:4", "0", -4), slot("integer:3", "5", -4),
  slot("group:0", ","), slot("integer:2", "1", -3), slot("integer:1", "7", -1), slot("integer:0", "4", -8),
  slot("decimal:0", "."), slot("fraction:0", "7", -4), slot("fraction:1", "1", -3),
]

func from(_ layer: CALayer, _ key: String) -> CGFloat? {
  ((layer.animation(forKey: key) as? CABasicAnimation)?.fromValue as? NSNumber).map { CGFloat($0.doubleValue) }
}

var failures: [String] = []

func check(_ name: String, _ renderer: NumberAnimationRenderer) {
  let slots = (renderer.layer.sublayers ?? []).filter {
    $0.animation(forKey: "number.session") == nil && ($0.opacity > 0 || from($0, "number.opacity") == 0)
  }
  let entering = slots.filter { from($0, "number.opacity") == 0 }
  for layer in entering {
    if let x = from(layer, "number.x") {
      failures.append(String(format: "%@: new slot slides from x=%.2f to %.2f", name, x, layer.position.x))
    }
    if layer.animation(forKey: "number.width") != nil {
      failures.append("\(name): new slot animates its width")
    }
  }
  let kept = slots
    .filter { from($0, "number.opacity") != 0 }
    .map { (x: from($0, "number.x") ?? $0.position.x, width: from($0, "number.width") ?? $0.bounds.width) }
    .sorted { $0.x < $1.x }
  for (a, b) in zip(kept, kept.dropFirst()) where a.x + a.width - b.x > 0.01 {
    failures.append(String(format: "%@: kept slots overlap at start: %.2f+%.2f > %.2f", name, a.x, a.width, b.x))
  }
  if kept.count < 2 {
    failures.append("\(name): found no slots to compare")
  }
}

func makeRenderer() -> NumberAnimationRenderer {
  NumberAnimationRenderer(frame: CGRect(x: 0, y: 0, width: 400, height: 60))
}

for align in ["left", "center", "right"] {
  let growing = makeRenderer()
  growing.applyConfiguration(config(1, "$105,174.71", small, align: align))
  growing.applyConfiguration(config(2, "$1,049,482.14", grow, align: align))
  check("\(align) grow", growing)

  let shrinking = makeRenderer()
  shrinking.applyConfiguration(config(1, "$1,049,482.14", big, align: align))
  shrinking.applyConfiguration(config(2, "$105,174.71", shrink, align: align))
  check("\(align) shrink", shrinking)
}

failures.forEach { print("FAIL", $0) }
print(failures.isEmpty ? "PASS" : "FAILED \(failures.count)")
exit(failures.isEmpty ? 0 : 1)
