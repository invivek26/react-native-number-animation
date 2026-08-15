import CoreText
import QuartzCore
import UIKit

@objc public protocol NumberAnimationRendererDelegate: AnyObject {
  func numberAnimationRendererDidStart(_ renderer: NumberAnimationRenderer, revision: Int)
  func numberAnimationRendererDidComplete(_ renderer: NumberAnimationRenderer, revision: Int)
}

@objcMembers public final class NumberAnimationSlot: NSObject {
  public let key: String
  public let text: String
  public let digitValue: Int
  public let delta: Int
  public let entering: Bool

  public init(key: String, text: String, digitValue: Int, delta: Int, entering: Bool) {
    self.key = key
    self.text = text
    self.digitValue = digitValue
    self.delta = delta
    self.entering = entering
  }
}

@objcMembers public final class NumberAnimationTiming: NSObject {
  public let duration: TimeInterval
  public let easing: String
  public let x1: CGFloat
  public let y1: CGFloat
  public let x2: CGFloat
  public let y2: CGFloat
  public let damping: CGFloat
  public let stiffness: CGFloat
  public let mass: CGFloat
  public let initialVelocity: CGFloat

  public init(
    durationMs: Double,
    easing: String,
    x1: CGFloat,
    y1: CGFloat,
    x2: CGFloat,
    y2: CGFloat,
    damping: CGFloat,
    stiffness: CGFloat,
    mass: CGFloat,
    initialVelocity: CGFloat
  ) {
    duration = max(0, durationMs / 1_000)
    self.easing = easing
    self.x1 = x1
    self.y1 = y1
    self.x2 = x2
    self.y2 = y2
    self.damping = max(0.01, damping)
    self.stiffness = max(0.01, stiffness)
    self.mass = max(0.01, mass)
    self.initialVelocity = initialVelocity
  }
}

@objcMembers public final class NumberAnimationConfiguration: NSObject {
  public var active = false
  public var revision = 0
  public var formattedValue = ""
  public var slots: [NumberAnimationSlot] = []
  public var initialSlots: [NumberAnimationSlot] = []
  public var digitGlyphs: [String] = []
  public var trend = 0
  public var mask = true
  public var reduceMotion = false
  public var textColor = UIColor.label
  public var fontFamily: String?
  public var fontSize: CGFloat = 14
  public var fontWeight: String?
  public var italic = false
  public var fontVariant: [String] = []
  public var resolvedFont: UIFont?
  public var letterSpacing: CGFloat = 0
  public var lineHeight: CGFloat = 0
  public var textAlign = "auto"
  public var writingDirection = "auto"
  public var digitTiming = NumberAnimationTiming(
    durationMs: 0,
    easing: "cubicBezier",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    damping: 1,
    stiffness: 100,
    mass: 1,
    initialVelocity: 0
  )
  public var layoutTiming = NumberAnimationTiming(
    durationMs: 0,
    easing: "cubicBezier",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    damping: 1,
    stiffness: 100,
    mass: 1,
    initialVelocity: 0
  )
  public var opacityTiming = NumberAnimationTiming(
    durationMs: 0,
    easing: "cubicBezier",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    damping: 1,
    stiffness: 100,
    mass: 1,
    initialVelocity: 0
  )
}

private struct TypographyKey: Hashable {
  let family: String
  let size: CGFloat
  let weight: String
  let italic: Bool
  let variants: String
  let resolvedFontName: String
  let letterSpacing: CGFloat
  let lineHeight: CGFloat
  let color: UInt32
  let scale: CGFloat
}

private struct AtlasKey: Hashable {
  let typography: TypographyKey
  let glyphs: [String]
}

private final class GlyphAtlas: NSObject {
  let image: CGImage
  let rowHeight: CGFloat
  let rowWidth: CGFloat
  let glyphWidths: [CGFloat]
  let wheelSize: Int
  let repetitions: Int
  let centerCopy: Int

  init(
    image: CGImage,
    rowHeight: CGFloat,
    rowWidth: CGFloat,
    glyphWidths: [CGFloat],
    wheelSize: Int,
    repetitions: Int
  ) {
    self.image = image
    self.rowHeight = rowHeight
    self.rowWidth = rowWidth
    self.glyphWidths = glyphWidths
    self.wheelSize = wheelSize
    self.repetitions = repetitions
    centerCopy = repetitions / 2
  }

  func centeredPhase(for digit: Int) -> CGFloat {
    CGFloat(centerCopy * wheelSize + digit)
  }

  func width(for digit: Int) -> CGFloat {
    glyphWidths[positiveModulo(digit, glyphWidths.count)]
  }

  private func positiveModulo(_ value: Int, _ modulus: Int) -> Int {
    let result = value % modulus
    return result >= 0 ? result : result + modulus
  }
}

private final class RenderedGlyph: NSObject {
  let image: CGImage?
  let size: CGSize

  init(image: CGImage?, size: CGSize) {
    self.image = image
    self.size = size
  }
}

private enum GlyphRenderer {
  static let atlasCache = NSCache<NSString, GlyphAtlas>()
  static let glyphCache = NSCache<NSString, RenderedGlyph>()
  static let repetitions = 5
  static let bidiControlScalars: Set<UInt32> = [
    0x061C,
    0x200E,
    0x200F,
    0x202A,
    0x202B,
    0x202C,
    0x202D,
    0x202E,
    0x2066,
    0x2067,
    0x2068,
    0x2069,
  ]

  static func clearCaches() {
    atlasCache.removeAllObjects()
    glyphCache.removeAllObjects()
  }

  static func font(for configuration: NumberAnimationConfiguration) -> CTFont {
    let size = max(1, configuration.fontSize)
    if let resolvedFont = configuration.resolvedFont {
      return CTFontCreateWithFontDescriptor(
        resolvedFont.fontDescriptor as CTFontDescriptor,
        size,
        nil
      )
    }
    let weight = uiFontWeight(configuration.fontWeight)
    var descriptor = fontDescriptor(
      family: configuration.fontFamily,
      size: size,
      weight: weight
    )
    descriptor = descriptor.addingAttributes([
      .traits: [UIFontDescriptor.TraitKey.weight: weight],
    ])
    var traits = descriptor.symbolicTraits
    if configuration.italic {
      traits.insert(.traitItalic)
    }
    descriptor = descriptor.withSymbolicTraits(traits) ?? descriptor

    let featureSettings = configuration.fontVariant.compactMap(featureSetting)
    if !featureSettings.isEmpty {
      descriptor = descriptor.addingAttributes([
        UIFontDescriptor.AttributeName.featureSettings: featureSettings,
      ])
    }

    let resolved = UIFont(descriptor: descriptor, size: size)
    return CTFontCreateWithFontDescriptor(
      resolved.fontDescriptor as CTFontDescriptor,
      size,
      nil
    )
  }

  private static func fontDescriptor(
    family: String?,
    size: CGFloat,
    weight: UIFont.Weight
  ) -> UIFontDescriptor {
    guard let family, !family.isEmpty else {
      return UIFont.systemFont(ofSize: size, weight: weight).fontDescriptor
    }

    if !UIFont.fontNames(forFamilyName: family).isEmpty {
      return UIFontDescriptor(fontAttributes: [
        .family: family,
        .size: size,
      ])
    }

    if let exactFace = UIFont(name: family, size: size) {
      return exactFace.fontDescriptor
    }

    return UIFont.systemFont(ofSize: size, weight: weight).fontDescriptor
  }

  private static func featureSetting(
    _ variant: String
  ) -> [UIFontDescriptor.FeatureKey: Int]? {
    let feature: (type: Int, selector: Int)?
    switch variant {
    case "small-caps": feature = (kLowerCaseType, kLowerCaseSmallCapsSelector)
    case "oldstyle-nums": feature = (kNumberCaseType, kLowerCaseNumbersSelector)
    case "lining-nums": feature = (kNumberCaseType, kUpperCaseNumbersSelector)
    case "tabular-nums": feature = (kNumberSpacingType, kMonospacedNumbersSelector)
    case "proportional-nums": feature = (kNumberSpacingType, kProportionalNumbersSelector)
    case "common-ligatures": feature = (kLigaturesType, kCommonLigaturesOnSelector)
    case "no-common-ligatures": feature = (kLigaturesType, kCommonLigaturesOffSelector)
    case "discretionary-ligatures": feature = (kLigaturesType, kRareLigaturesOnSelector)
    case "no-discretionary-ligatures": feature = (kLigaturesType, kRareLigaturesOffSelector)
    case "historical-ligatures": feature = (kLigaturesType, kHistoricalLigaturesOnSelector)
    case "no-historical-ligatures": feature = (kLigaturesType, kHistoricalLigaturesOffSelector)
    case "contextual": feature = (kContextualAlternatesType, kContextualAlternatesOnSelector)
    case "no-contextual": feature = (kContextualAlternatesType, kContextualAlternatesOffSelector)
    case "stylistic-one": feature = (kStylisticAlternativesType, kStylisticAltOneOnSelector)
    case "stylistic-two": feature = (kStylisticAlternativesType, kStylisticAltTwoOnSelector)
    case "stylistic-three": feature = (kStylisticAlternativesType, kStylisticAltThreeOnSelector)
    case "stylistic-four": feature = (kStylisticAlternativesType, kStylisticAltFourOnSelector)
    case "stylistic-five": feature = (kStylisticAlternativesType, kStylisticAltFiveOnSelector)
    case "stylistic-six": feature = (kStylisticAlternativesType, kStylisticAltSixOnSelector)
    case "stylistic-seven": feature = (kStylisticAlternativesType, kStylisticAltSevenOnSelector)
    case "stylistic-eight": feature = (kStylisticAlternativesType, kStylisticAltEightOnSelector)
    case "stylistic-nine": feature = (kStylisticAlternativesType, kStylisticAltNineOnSelector)
    case "stylistic-ten": feature = (kStylisticAlternativesType, kStylisticAltTenOnSelector)
    case "stylistic-eleven": feature = (kStylisticAlternativesType, kStylisticAltElevenOnSelector)
    case "stylistic-twelve": feature = (kStylisticAlternativesType, kStylisticAltTwelveOnSelector)
    case "stylistic-thirteen": feature = (kStylisticAlternativesType, kStylisticAltThirteenOnSelector)
    case "stylistic-fourteen": feature = (kStylisticAlternativesType, kStylisticAltFourteenOnSelector)
    case "stylistic-fifteen": feature = (kStylisticAlternativesType, kStylisticAltFifteenOnSelector)
    case "stylistic-sixteen": feature = (kStylisticAlternativesType, kStylisticAltSixteenOnSelector)
    case "stylistic-seventeen": feature = (kStylisticAlternativesType, kStylisticAltSeventeenOnSelector)
    case "stylistic-eighteen": feature = (kStylisticAlternativesType, kStylisticAltEighteenOnSelector)
    case "stylistic-nineteen": feature = (kStylisticAlternativesType, kStylisticAltNineteenOnSelector)
    case "stylistic-twenty": feature = (kStylisticAlternativesType, kStylisticAltTwentyOnSelector)
    default: feature = nil
    }
    guard let feature else { return nil }
    return [
      .type: feature.type,
      .selector: feature.selector,
    ]
  }

  static func atlas(
    configuration: NumberAnimationConfiguration,
    glyphs rawGlyphs: [String],
    scale: CGFloat
  ) -> GlyphAtlas {
    let glyphs = rawGlyphs.isEmpty ? (0...9).map(String.init) : rawGlyphs
    let typography = typographyKey(configuration, scale: scale)
    let key = AtlasKey(typography: typography, glyphs: glyphs)
    let cacheKey = String(describing: key) as NSString
    if let cached = atlasCache.object(forKey: cacheKey) {
      return cached
    }

    let font = font(for: configuration)
    let metrics = glyphs.map {
      lineMetrics(text: $0, font: font, letterSpacing: configuration.letterSpacing)
    }
    let naturalHeight = ceil(
      CTFontGetAscent(font) + CTFontGetDescent(font) + CTFontGetLeading(font)
    )
    let rowHeight = max(1, configuration.lineHeight > 0 ? configuration.lineHeight : naturalHeight)
    let glyphWidths = metrics.map { max(0, $0.width) }
    let rowWidth = max(1 / scale, glyphWidths.max() ?? 0)
    let pixelWidth = max(1, Int(ceil(rowWidth * scale)))
    let rowCount = glyphs.count * repetitions
    let pixelHeight = max(1, Int(ceil(rowHeight * CGFloat(rowCount) * scale)))
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
    guard let context = CGContext(
      data: nil,
      width: pixelWidth,
      height: pixelHeight,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: colorSpace,
      bitmapInfo: bitmapInfo
    ) else {
      preconditionFailure("Unable to create glyph atlas context")
    }

    context.scaleBy(x: scale, y: scale)
    context.textMatrix = .identity
    let ascent = CTFontGetAscent(font)
    let descent = CTFontGetDescent(font)
    let typographicHeight = ascent + descent
    let verticalInset = max(0, (rowHeight - typographicHeight) / 2)
    let imageHeight = rowHeight * CGFloat(rowCount)

    for row in 0..<rowCount {
      let glyph = glyphs[row % glyphs.count]
      let line = makeLine(
        text: glyph,
        font: font,
        letterSpacing: configuration.letterSpacing,
        color: configuration.textColor.cgColor
      )
      let width = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
      let x = max(0, (rowWidth - width) / 2)
      let rowBottom = imageHeight - CGFloat(row + 1) * rowHeight
      context.textPosition = CGPoint(x: x, y: rowBottom + verticalInset + descent)
      CTLineDraw(line, context)
    }

    guard let image = context.makeImage() else {
      preconditionFailure("Unable to create glyph atlas image")
    }
    let atlas = GlyphAtlas(
      image: image,
      rowHeight: rowHeight,
      rowWidth: rowWidth,
      glyphWidths: glyphWidths,
      wheelSize: glyphs.count,
      repetitions: repetitions
    )
    atlasCache.setObject(atlas, forKey: cacheKey)
    return atlas
  }

  static func glyph(
    configuration: NumberAnimationConfiguration,
    text: String,
    scale: CGFloat
  ) -> RenderedGlyph {
    let typography = typographyKey(configuration, scale: scale)
    let cacheKey = "\(typography)|\(text)" as NSString
    if let cached = glyphCache.object(forKey: cacheKey) {
      return cached
    }

    if isBidiControl(text) {
      let rendered = RenderedGlyph(image: nil, size: .zero)
      glyphCache.setObject(rendered, forKey: cacheKey)
      return rendered
    }

    let font = font(for: configuration)
    let line = makeLine(
      text: text,
      font: font,
      letterSpacing: configuration.letterSpacing,
      color: configuration.textColor.cgColor
    )
    let width = max(0, CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil)))
    let naturalHeight = ceil(
      CTFontGetAscent(font) + CTFontGetDescent(font) + CTFontGetLeading(font)
    )
    let height = max(1, configuration.lineHeight > 0 ? configuration.lineHeight : naturalHeight)
    let pixelWidth = max(1, Int(ceil(max(width, 1 / scale) * scale)))
    let pixelHeight = max(1, Int(ceil(height * scale)))
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
      data: nil,
      width: pixelWidth,
      height: pixelHeight,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      preconditionFailure("Unable to create glyph context")
    }

    context.scaleBy(x: scale, y: scale)
    context.textMatrix = .identity
    let ascent = CTFontGetAscent(font)
    let descent = CTFontGetDescent(font)
    let verticalInset = max(0, (height - ascent - descent) / 2)
    context.textPosition = CGPoint(x: 0, y: verticalInset + descent)
    CTLineDraw(line, context)
    guard let image = context.makeImage() else {
      preconditionFailure("Unable to create glyph image")
    }

    let rendered = RenderedGlyph(image: image, size: CGSize(width: width, height: height))
    glyphCache.setObject(rendered, forKey: cacheKey)
    return rendered
  }

  private static func isBidiControl(_ text: String) -> Bool {
    !text.unicodeScalars.isEmpty && text.unicodeScalars.allSatisfy {
      bidiControlScalars.contains($0.value)
    }
  }

  private static func typographyKey(
    _ configuration: NumberAnimationConfiguration,
    scale: CGFloat
  ) -> TypographyKey {
    TypographyKey(
      family: configuration.fontFamily ?? "",
      size: configuration.fontSize,
      weight: configuration.fontWeight ?? "",
      italic: configuration.italic,
      variants: configuration.fontVariant.joined(separator: ","),
      resolvedFontName: configuration.resolvedFont?.fontName ?? "",
      letterSpacing: configuration.letterSpacing,
      lineHeight: configuration.lineHeight,
      color: rgba(configuration.textColor),
      scale: scale
    )
  }

  private static func rgba(_ color: UIColor) -> UInt32 {
    let resolvedColor = color.resolvedColor(with: UITraitCollection.current)
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    guard resolvedColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else {
      return UInt32(truncatingIfNeeded: resolvedColor.hashValue)
    }
    return UInt32(max(0, min(255, red * 255))) << 24
      | UInt32(max(0, min(255, green * 255))) << 16
      | UInt32(max(0, min(255, blue * 255))) << 8
      | UInt32(max(0, min(255, alpha * 255)))
  }

  private static func makeLine(
    text: String,
    font: CTFont,
    letterSpacing: CGFloat,
    color: CGColor
  ) -> CTLine {
    let attributes: [NSAttributedString.Key: Any] = [
      NSAttributedString.Key(kCTFontAttributeName as String): font,
      NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
      NSAttributedString.Key(kCTKernAttributeName as String): letterSpacing,
    ]
    return CTLineCreateWithAttributedString(
      NSAttributedString(string: text, attributes: attributes)
    )
  }

  private static func lineMetrics(
    text: String,
    font: CTFont,
    letterSpacing: CGFloat
  ) -> CGSize {
    let line = makeLine(text: text, font: font, letterSpacing: letterSpacing, color: UIColor.white.cgColor)
    return CGSize(
      width: CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil)),
      height: CTFontGetAscent(font) + CTFontGetDescent(font) + CTFontGetLeading(font)
    )
  }

  private static func uiFontWeight(_ value: String?) -> UIFont.Weight {
    switch value?.lowercased() {
    case "100", "ultralight": return .ultraLight
    case "200", "thin": return .thin
    case "300", "light": return .light
    case "500", "medium": return .medium
    case "600", "semibold": return .semibold
    case "700", "bold": return .bold
    case "800", "heavy": return .heavy
    case "900", "black": return .black
    default: return .regular
    }
  }
}

private enum LayerAnimation {
  static func make(
    keyPath: String,
    from: Any,
    to: Any,
    timing: NumberAnimationTiming
  ) -> CAPropertyAnimation {
    if timing.easing == "spring" {
      let animation = CASpringAnimation(keyPath: keyPath)
      animation.fromValue = from
      animation.toValue = to
      animation.damping = timing.damping
      animation.stiffness = timing.stiffness
      animation.mass = timing.mass
      animation.initialVelocity = timing.initialVelocity
      animation.duration = timing.duration
      return animation
    }

    let animation = CABasicAnimation(keyPath: keyPath)
    animation.fromValue = from
    animation.toValue = to
    animation.duration = timing.duration
    animation.timingFunction = CAMediaTimingFunction(
      controlPoints: Float(timing.x1),
      Float(timing.y1),
      Float(timing.x2),
      Float(timing.y2)
    )
    return animation
  }
}

private protocol NumberSlotLayer: AnyObject {
  var key: String { get }
  var rootLayer: CALayer { get }
  var text: String { get }
  var width: CGFloat { get }
  func settle()
}

private final class DigitSlotLayer: NumberSlotLayer {
  let key: String
  let rootLayer = CALayer()
  private let atlasLayer = CALayer()
  private(set) var text: String
  private(set) var width: CGFloat
  private(set) var digitValue: Int
  private var atlas: GlyphAtlas

  init(key: String, text: String, digitValue: Int, atlas: GlyphAtlas, mask: Bool) {
    self.key = key
    self.text = text
    self.digitValue = digitValue
    self.atlas = atlas
    width = atlas.width(for: digitValue)
    rootLayer.anchorPoint = .zero
    rootLayer.masksToBounds = true
    atlasLayer.anchorPoint = .zero
    atlasLayer.contents = atlas.image
    atlasLayer.contentsScale = UIScreen.main.scale
    atlasLayer.contentsGravity = .topLeft
    rootLayer.addSublayer(atlasLayer)
    configure(atlas: atlas, mask: mask)
    setPhase(atlas.centeredPhase(for: digitValue))
  }

  func update(
    text: String,
    digitValue: Int,
    delta: Int,
    atlas: GlyphAtlas,
    mask: Bool,
    timing: NumberAnimationTiming,
    animated: Bool
  ) {
    let previousAtlas = self.atlas
    let previousPhase = visiblePhase()
    let atlasChanged = previousAtlas !== atlas
    self.text = text
    self.atlas = atlas
    width = atlas.width(for: digitValue)
    configure(atlas: atlas, mask: mask)

    if atlasChanged {
      atlasLayer.contents = atlas.image
    }

    let normalized = normalizedCenterPhase(previousPhase, wheelSize: previousAtlas.wheelSize)
    let target = targetPhase(
      from: normalized,
      digit: digitValue,
      delta: delta,
      wheelSize: atlas.wheelSize
    )
    self.digitValue = digitValue

    CATransaction.begin()
    CATransaction.setDisableActions(true)
    atlasLayer.removeAnimation(forKey: "number.phase")
    setPhase(target)
    CATransaction.commit()

    guard animated, timing.duration > 0, abs(target - normalized) > 0.0001 else {
      settle()
      return
    }

    let animation = LayerAnimation.make(
      keyPath: "position.y",
      from: -normalized * atlas.rowHeight,
      to: -target * atlas.rowHeight,
      timing: timing
    )
    atlasLayer.add(animation, forKey: "number.phase")
  }

  func settle() {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    atlasLayer.removeAllAnimations()
    setPhase(atlas.centeredPhase(for: digitValue))
    rootLayer.removeAllAnimations()
    rootLayer.opacity = 1
    CATransaction.commit()
  }

  private func configure(atlas: GlyphAtlas, mask: Bool) {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    rootLayer.bounds = CGRect(x: 0, y: 0, width: width, height: atlas.rowHeight)
    atlasLayer.bounds = CGRect(
      x: 0,
      y: 0,
      width: atlas.rowWidth,
      height: atlas.rowHeight * CGFloat(atlas.wheelSize * atlas.repetitions)
    )
    if mask {
      let gradient = (rootLayer.mask as? CAGradientLayer) ?? CAGradientLayer()
      gradient.frame = rootLayer.bounds
      gradient.colors = [
        UIColor.clear.cgColor,
        UIColor.white.cgColor,
        UIColor.white.cgColor,
        UIColor.clear.cgColor,
      ]
      gradient.locations = [0, 0.16, 0.84, 1]
      rootLayer.mask = gradient
    } else {
      rootLayer.mask = nil
    }
    CATransaction.commit()
  }

  private func visiblePhase() -> CGFloat {
    let y = atlasLayer.presentation()?.position.y ?? atlasLayer.position.y
    return -y / max(1, atlas.rowHeight)
  }

  private func setPhase(_ phase: CGFloat) {
    atlasLayer.position = CGPoint(
      x: -(atlas.rowWidth - width) / 2,
      y: -phase * atlas.rowHeight
    )
  }

  private func normalizedCenterPhase(_ phase: CGFloat, wheelSize: Int) -> CGFloat {
    let fraction = phase - floor(phase)
    let digit = positiveModulo(Int(floor(phase)), wheelSize)
    return CGFloat(atlas.centerCopy * wheelSize + digit) + fraction
  }

  private func targetPhase(from phase: CGFloat, digit: Int, delta: Int, wheelSize: Int) -> CGFloat {
    guard delta != 0 else {
      return atlas.centeredPhase(for: digit)
    }

    let size = CGFloat(wheelSize)
    let phaseDigit = phase.truncatingRemainder(dividingBy: size)
    let normalizedPhaseDigit = phaseDigit >= 0 ? phaseDigit : phaseDigit + size
    var difference = CGFloat(digit) - normalizedPhaseDigit

    if delta > 0 {
      while difference < 0 { difference += size }
      if abs(delta) >= wheelSize, difference < size { difference += size }
    } else {
      while difference > 0 { difference -= size }
      if abs(delta) >= wheelSize, difference > -size { difference -= size }
    }
    return phase + difference
  }

  private func positiveModulo(_ value: Int, _ modulus: Int) -> Int {
    let result = value % modulus
    return result >= 0 ? result : result + modulus
  }
}

private final class SymbolSlotLayer: NumberSlotLayer {
  let key: String
  let rootLayer = CALayer()
  private(set) var text: String
  private(set) var width: CGFloat

  init(key: String, text: String, glyph: RenderedGlyph) {
    self.key = key
    self.text = text
    width = glyph.size.width
    rootLayer.anchorPoint = .zero
    rootLayer.contents = glyph.image
    rootLayer.contentsScale = UIScreen.main.scale
    rootLayer.contentsGravity = .topLeft
    rootLayer.bounds = CGRect(origin: .zero, size: glyph.size)
  }

  func update(text: String, glyph: RenderedGlyph) -> Bool {
    let changed = self.text != text
    self.text = text
    width = glyph.size.width
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    rootLayer.contents = glyph.image
    rootLayer.bounds = CGRect(origin: .zero, size: glyph.size)
    CATransaction.commit()
    return changed
  }

  func settle() {
    rootLayer.removeAllAnimations()
    rootLayer.opacity = 1
  }
}

@objcMembers public final class NumberAnimationRenderer: UIView {
  public weak var delegate: NumberAnimationRendererDelegate?

  private var configuration: NumberAnimationConfiguration?
  private var slotsByKey: [String: NumberSlotLayer] = [:]
  private var exitingSlots: [NumberSlotLayer] = []
  private var sessionRevision: Int?
  private var sessionGeneration = 0
  private var completionSentinels: [CALayer] = []
  private var hasConfigured = false
  private var pendingConfiguration: NumberAnimationConfiguration?
  private var notificationTokens: [NSObjectProtocol] = []

  public override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .clear
    isAccessibilityElement = false
    clipsToBounds = false
    registerNotifications()
    registerColorTraitChanges()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    isUserInteractionEnabled = false
    backgroundColor = .clear
    isAccessibilityElement = false
    clipsToBounds = false
    registerNotifications()
    registerColorTraitChanges()
  }

  deinit {
    notificationTokens.forEach(NotificationCenter.default.removeObserver)
  }

  public func applyConfiguration(_ next: NumberAnimationConfiguration) {
    precondition(Thread.isMainThread)
    pendingConfiguration = next
    guard bounds.width > 0, bounds.height > 0 else {
      return
    }
    applyPendingConfiguration()
  }

  public func resetForReuse() {
    sessionGeneration += 1
    sessionRevision = nil
    removeCompletionSentinels()
    pendingConfiguration = nil
    configuration = nil
    hasConfigured = false
    settle(removeSlots: true)
    isHidden = true
  }

  public func invalidateRenderer() {
    resetForReuse()
    delegate = nil
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    applyPendingConfiguration()
    guard let configuration else { return }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    layoutSlots(
      configuration.slots.compactMap { slotsByKey[$0.key] },
      configuration: configuration,
      animated: false,
      preserveActiveAnimations: true
    )
    CATransaction.commit()
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      sessionGeneration += 1
      sessionRevision = nil
      removeCompletionSentinels()
      settle(removeSlots: false)
    }
  }

  private func refreshForColorAppearance() {
    GlyphRenderer.clearCaches()
    guard let configuration else { return }
    let interruptedRevision = sessionRevision
    sessionGeneration += 1
    sessionRevision = nil
    removeCompletionSentinels()
    traitCollection.performAsCurrent {
      rebuild(slots: configuration.slots, configuration: configuration)
    }
    if let interruptedRevision {
      delegate?.numberAnimationRendererDidComplete(self, revision: interruptedRevision)
    }
  }

  private func registerColorTraitChanges() {
    registerForTraitChanges([
      UITraitUserInterfaceStyle.self,
      UITraitAccessibilityContrast.self,
    ]) { (renderer: NumberAnimationRenderer, _) in
      renderer.refreshForColorAppearance()
    }
  }

  private func applyPendingConfiguration() {
    guard bounds.width > 0, bounds.height > 0, let next = pendingConfiguration else {
      return
    }
    pendingConfiguration = nil
    let firstConfiguration = !hasConfigured
    let shouldAnimate = next.active && next.formattedValue.contains("\n") == false
    let reduceMotion = next.reduceMotion || UIAccessibility.isReduceMotionEnabled

    if firstConfiguration, shouldAnimate, !next.initialSlots.isEmpty {
      configuration = next
      rebuild(slots: next.initialSlots, configuration: next)
      hasConfigured = true
    }

    configuration = next
    hasConfigured = true
    isHidden = false

    guard shouldAnimate else {
      sessionGeneration += 1
      sessionRevision = nil
      removeCompletionSentinels()
      rebuild(slots: next.slots, configuration: next)
      settle(removeSlots: false)
      return
    }

    beginSession(revision: next.revision)
    if reduceMotion {
      applyCrossfade(next)
      return
    }
    applyAnimated(next)
  }

  private func rebuild(slots: [NumberAnimationSlot], configuration: NumberAnimationConfiguration) {
    settle(removeSlots: true)
    let scale = max(1, window?.screen.scale ?? UIScreen.main.scale)
    slots.forEach { slot in
      let layer = makeSlotLayer(slot, configuration: configuration, scale: scale)
      slotsByKey[slot.key] = layer
      self.layer.addSublayer(layer.rootLayer)
    }
    layoutSlots(
      slots.compactMap { slotsByKey[$0.key] },
      configuration: configuration,
      animated: false
    )
  }

  private func applyAnimated(_ next: NumberAnimationConfiguration) {
    let generation = sessionGeneration
    let scale = max(1, window?.screen.scale ?? UIScreen.main.scale)
    let targetKeys = Set(next.slots.map(\.key))

    let removedKeys = slotsByKey.keys.filter { !targetKeys.contains($0) }
    for key in removedKeys {
      guard let oldLayer = slotsByKey[key] else { continue }
      slotsByKey.removeValue(forKey: key)
      exitingSlots.append(oldLayer)
      animateOpacity(oldLayer.rootLayer, to: 0, timing: next.opacityTiming, animated: true)
    }

    for slot in next.slots {
      if slot.digitValue >= 0 {
        let atlas = GlyphRenderer.atlas(
          configuration: next,
          glyphs: next.digitGlyphs,
          scale: scale
        )
        let digitLayer: DigitSlotLayer
        if let existing = slotsByKey[slot.key] as? DigitSlotLayer {
          digitLayer = existing
        } else {
          slotsByKey[slot.key]?.rootLayer.removeFromSuperlayer()
          digitLayer = DigitSlotLayer(
            key: slot.key,
            text: slot.text,
            digitValue: positiveModulo(slot.digitValue - slot.delta, 10),
            atlas: atlas,
            mask: next.mask
          )
          slotsByKey[slot.key] = digitLayer
          layer.addSublayer(digitLayer.rootLayer)
        }
        digitLayer.update(
          text: slot.text,
          digitValue: slot.digitValue,
          delta: slot.delta,
          atlas: atlas,
          mask: next.mask,
          timing: next.digitTiming,
          animated: true
        )
        if slot.entering {
          animateOpacity(digitLayer.rootLayer, from: 0, to: 1, timing: next.opacityTiming, animated: true)
        }
      } else {
        let glyph = GlyphRenderer.glyph(configuration: next, text: slot.text, scale: scale)
        let symbolLayer: SymbolSlotLayer
        var contentChanged = false
        if let existing = slotsByKey[slot.key] as? SymbolSlotLayer {
          symbolLayer = existing
          contentChanged = existing.update(text: slot.text, glyph: glyph)
        } else {
          slotsByKey[slot.key]?.rootLayer.removeFromSuperlayer()
          symbolLayer = SymbolSlotLayer(key: slot.key, text: slot.text, glyph: glyph)
          slotsByKey[slot.key] = symbolLayer
          layer.addSublayer(symbolLayer.rootLayer)
        }
        if slot.entering || contentChanged {
          animateOpacity(symbolLayer.rootLayer, from: 0, to: 1, timing: next.opacityTiming, animated: true)
        }
      }
    }

    layoutSlots(next.slots.compactMap { slotsByKey[$0.key] }, configuration: next, animated: true)
    finishSessionAfterAnimations(
      revision: next.revision,
      duration: max(
        next.digitTiming.duration,
        next.layoutTiming.duration,
        next.opacityTiming.duration
      ),
      generation: generation
    )
  }

  private func applyCrossfade(_ next: NumberAnimationConfiguration) {
    let generation = sessionGeneration
    let previousLayers = Array(slotsByKey.values)
    previousLayers.forEach {
      slotsByKey.removeValue(forKey: $0.key)
      exitingSlots.append($0)
    }
    let scale = max(1, window?.screen.scale ?? UIScreen.main.scale)
    next.slots.forEach { slot in
      let slotLayer = makeSlotLayer(slot, configuration: next, scale: scale)
      slotsByKey[slot.key] = slotLayer
      layer.addSublayer(slotLayer.rootLayer)
      animateOpacity(slotLayer.rootLayer, from: 0, to: 1, timing: next.opacityTiming, animated: true)
    }
    previousLayers.forEach {
      animateOpacity($0.rootLayer, to: 0, timing: next.opacityTiming, animated: true)
    }
    layoutSlots(next.slots.compactMap { slotsByKey[$0.key] }, configuration: next, animated: false)
    finishSessionAfterAnimations(
      revision: next.revision,
      duration: next.opacityTiming.duration,
      generation: generation
    )
  }

  private func makeSlotLayer(
    _ slot: NumberAnimationSlot,
    configuration: NumberAnimationConfiguration,
    scale: CGFloat
  ) -> NumberSlotLayer {
    if slot.digitValue >= 0 {
      let atlas = GlyphRenderer.atlas(
        configuration: configuration,
        glyphs: configuration.digitGlyphs,
        scale: scale
      )
      return DigitSlotLayer(
        key: slot.key,
        text: slot.text,
        digitValue: slot.digitValue,
        atlas: atlas,
        mask: configuration.mask
      )
    }
    let glyph = GlyphRenderer.glyph(
      configuration: configuration,
      text: slot.text,
      scale: scale
    )
    return SymbolSlotLayer(key: slot.key, text: slot.text, glyph: glyph)
  }

  private func layoutSlots(
    _ orderedLayers: [NumberSlotLayer],
    configuration: NumberAnimationConfiguration,
    animated: Bool,
    preserveActiveAnimations: Bool = false
  ) {
    let scale = max(1, window?.screen.scale ?? UIScreen.main.scale)
    let fractionalWidth = orderedLayers.reduce(CGFloat(0)) { $0 + $1.width }
    let contentWidth = ceil(fractionalWidth * scale) / scale
    var x = horizontalOrigin(contentWidth: contentWidth, configuration: configuration)
    for slot in orderedLayers {
      let root = slot.rootLayer
      let oldX = root.presentation()?.position.x ?? root.position.x
      let target = CGPoint(x: x, y: max(0, (bounds.height - root.bounds.height) / 2))
      let hasActiveAnimation = root.animation(forKey: "number.x") != nil
      let targetChanged = abs(root.position.x - target.x) > 0.0001
      CATransaction.begin()
      CATransaction.setDisableActions(true)
      if !preserveActiveAnimations || !hasActiveAnimation || targetChanged {
        root.removeAnimation(forKey: "number.x")
      }
      root.position = target
      CATransaction.commit()

      let shouldRetarget = preserveActiveAnimations && hasActiveAnimation && targetChanged
      if (animated || shouldRetarget),
         configuration.layoutTiming.duration > 0,
         abs(oldX - target.x) > 0.0001 {
        let animation = LayerAnimation.make(
          keyPath: "position.x",
          from: oldX,
          to: target.x,
          timing: configuration.layoutTiming
        )
        root.add(animation, forKey: "number.x")
      }
      x += slot.width
    }
  }

  private func horizontalOrigin(
    contentWidth: CGFloat,
    configuration: NumberAnimationConfiguration
  ) -> CGFloat {
    let isRTL: Bool
    switch configuration.writingDirection {
    case "rtl": isRTL = true
    case "ltr": isRTL = false
    default: isRTL = effectiveUserInterfaceLayoutDirection == .rightToLeft
    }

    switch configuration.textAlign {
    case "center": return (bounds.width - contentWidth) / 2
    case "right": return bounds.width - contentWidth
    case "left": return 0
    case "end": return isRTL ? 0 : bounds.width - contentWidth
    case "start", "auto": return isRTL ? bounds.width - contentWidth : 0
    default: return 0
    }
  }

  private func animateOpacity(
    _ layer: CALayer,
    from: Float? = nil,
    to: Float,
    timing: NumberAnimationTiming,
    animated: Bool
  ) {
    let visible = from ?? layer.presentation()?.opacity ?? layer.opacity
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    layer.removeAnimation(forKey: "number.opacity")
    layer.opacity = to
    CATransaction.commit()
    guard animated, timing.duration > 0, abs(visible - to) > 0.0001 else { return }
    layer.add(
      LayerAnimation.make(keyPath: "opacity", from: visible, to: to, timing: timing),
      forKey: "number.opacity"
    )
  }

  private func beginSession(revision: Int) {
    let shouldEmitStart = sessionRevision != revision
    sessionGeneration += 1
    removeCompletionSentinels()
    sessionRevision = revision
    if shouldEmitStart {
      delegate?.numberAnimationRendererDidStart(self, revision: revision)
    }
  }

  private func finishSessionAfterAnimations(
    revision: Int,
    duration: TimeInterval,
    generation: Int
  ) {
    guard duration > 0 else {
      completeSession(revision, generation: generation)
      return
    }

    let sentinel = CALayer()
    sentinel.opacity = 0
    completionSentinels.append(sentinel)
    layer.addSublayer(sentinel)
    CATransaction.begin()
    CATransaction.setCompletionBlock { [weak self, weak sentinel] in
      guard let self else { return }
      if let sentinel {
        self.completionSentinels.removeAll { $0 === sentinel }
      }
      sentinel?.removeFromSuperlayer()
      self.completeSession(revision, generation: generation)
    }
    let animation = CABasicAnimation(keyPath: "opacity")
    animation.fromValue = 0
    animation.toValue = 0
    animation.duration = duration
    sentinel.add(animation, forKey: "number.session")
    CATransaction.commit()
  }

  private func completeSession(_ revision: Int, generation: Int) {
    guard generation == sessionGeneration, sessionRevision == revision else { return }
    exitingSlots.forEach { $0.rootLayer.removeFromSuperlayer() }
    exitingSlots.removeAll()
    slotsByKey.values.forEach { $0.settle() }
    sessionRevision = nil
    delegate?.numberAnimationRendererDidComplete(self, revision: revision)
  }

  private func settle(removeSlots: Bool) {
    slotsByKey.values.forEach { $0.settle() }
    exitingSlots.forEach { $0.rootLayer.removeFromSuperlayer() }
    exitingSlots.removeAll()
    if removeSlots {
      slotsByKey.values.forEach { $0.rootLayer.removeFromSuperlayer() }
      slotsByKey.removeAll()
    }
  }

  private func removeCompletionSentinels() {
    let sentinels = completionSentinels
    completionSentinels.removeAll()
    sentinels.forEach {
      $0.removeAllAnimations()
      $0.removeFromSuperlayer()
    }
  }

  private func registerNotifications() {
    let center = NotificationCenter.default
    notificationTokens.append(center.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.sessionGeneration += 1
      self?.sessionRevision = nil
      self?.removeCompletionSentinels()
      self?.settle(removeSlots: false)
    })
    notificationTokens.append(center.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification,
      object: nil,
      queue: .main
    ) { _ in
      GlyphRenderer.clearCaches()
    })
    notificationTokens.append(center.addObserver(
      forName: UIAccessibility.reduceMotionStatusDidChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard UIAccessibility.isReduceMotionEnabled else { return }
      self?.sessionGeneration += 1
      self?.sessionRevision = nil
      self?.removeCompletionSentinels()
      self?.settle(removeSlots: false)
    })
  }

  private func positiveModulo(_ value: Int, _ modulus: Int) -> Int {
    let result = value % modulus
    return result >= 0 ? result : result + modulus
  }
}
