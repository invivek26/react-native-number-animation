#import "NumberAnimationView.h"

#import <React/RCTConversions.h>
#import <React/RCTFont.h>

#import <react/renderer/components/NumberAnimationViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/NumberAnimationViewSpec/EventEmitters.h>
#import <react/renderer/components/NumberAnimationViewSpec/Props.h>
#import <react/renderer/components/NumberAnimationViewSpec/RCTComponentViewHelpers.h>

#import "NumberAnimation-Swift.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface NumberAnimationView () <RCTNumberAnimationViewViewProtocol, NumberAnimationRendererDelegate>
@end

static NumberAnimationTiming *NumberAnimationMakeTiming(
    double durationMs,
    const std::string &easing,
    Float x1,
    Float y1,
    Float x2,
    Float y2,
    Float damping,
    Float stiffness,
    Float mass,
    Float initialVelocity)
{
  return [[NumberAnimationTiming alloc]
      initWithDurationMs:durationMs
                 easing:RCTNSStringFromString(easing)
                     x1:x1
                     y1:y1
                     x2:x2
                     y2:y2
                damping:damping
              stiffness:stiffness
                   mass:mass
        initialVelocity:initialVelocity];
}

static NSArray<NumberAnimationSlot *> *NumberAnimationMakeSlots(
    const std::vector<NumberAnimationViewSlotsStruct> &slots)
{
  NSMutableArray<NumberAnimationSlot *> *result = [NSMutableArray arrayWithCapacity:slots.size()];
  for (const auto &slot : slots) {
    [result addObject:[[NumberAnimationSlot alloc]
                          initWithKey:RCTNSStringFromString(slot.key)
                                text:RCTNSStringFromString(slot.text)
                          digitValue:slot.digitValue
                                delta:slot.delta
                             entering:slot.entering]];
  }
  return result;
}

static NSArray<NumberAnimationSlot *> *NumberAnimationMakeInitialSlots(
    const std::vector<NumberAnimationViewInitialSlotsStruct> &slots)
{
  NSMutableArray<NumberAnimationSlot *> *result = [NSMutableArray arrayWithCapacity:slots.size()];
  for (const auto &slot : slots) {
    [result addObject:[[NumberAnimationSlot alloc]
                          initWithKey:RCTNSStringFromString(slot.key)
                                text:RCTNSStringFromString(slot.text)
                          digitValue:slot.digitValue
                                delta:slot.delta
                             entering:slot.entering]];
  }
  return result;
}

static NSArray<NSString *> *NumberAnimationMakeStrings(const std::vector<std::string> &strings)
{
  NSMutableArray<NSString *> *result = [NSMutableArray arrayWithCapacity:strings.size()];
  for (const auto &value : strings) {
    [result addObject:RCTNSStringFromString(value)];
  }
  return result;
}

@implementation NumberAnimationView {
  NumberAnimationRenderer *_renderer;
  NumberAnimationConfiguration *_pendingConfiguration;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<NumberAnimationViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const NumberAnimationViewProps>();
    _props = defaultProps;

    _renderer = [[NumberAnimationRenderer alloc] initWithFrame:self.bounds];
    _renderer.delegate = self;
    self.contentView = _renderer;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<const NumberAnimationViewProps>(props);
  NumberAnimationConfiguration *configuration = [NumberAnimationConfiguration new];
  configuration.active = newProps.active;
  configuration.revision = newProps.revision;
  configuration.formattedValue = RCTNSStringFromString(newProps.formattedValue);
  configuration.slots = NumberAnimationMakeSlots(newProps.slots);
  configuration.initialSlots = NumberAnimationMakeInitialSlots(newProps.initialSlots);
  configuration.digitGlyphs = NumberAnimationMakeStrings(newProps.digitGlyphs);
  configuration.trend = newProps.trend;
  configuration.mask = newProps.mask;
  configuration.reduceMotion = newProps.reduceMotion;
  configuration.textColor = RCTUIColorFromSharedColor(newProps.textColor) ?: UIColor.labelColor;
  configuration.fontFamily = newProps.fontFamily.empty() ? nil : RCTNSStringFromString(newProps.fontFamily);
  configuration.fontSize = newProps.fontSize;
  configuration.fontWeight =
      newProps.fontWeight.empty() ? nil : RCTNSStringFromString(newProps.fontWeight);
  configuration.italic = newProps.italic;
  configuration.fontVariant = NumberAnimationMakeStrings(newProps.fontVariant);
  configuration.resolvedFont = [RCTFont updateFont:nil
                                        withFamily:configuration.fontFamily
                                              size:@(configuration.fontSize)
                                            weight:configuration.fontWeight
                                             style:configuration.italic ? @"italic" : @"normal"
                                           variant:configuration.fontVariant
                                   scaleMultiplier:1];
  configuration.letterSpacing = newProps.letterSpacing;
  configuration.lineHeight = newProps.lineHeight;
  configuration.textAlign = RCTNSStringFromString(newProps.textAlign);
  configuration.writingDirection = RCTNSStringFromString(newProps.writingDirection);
  configuration.digitTiming = NumberAnimationMakeTiming(
      newProps.digitDurationMs,
      newProps.digitEasing,
      newProps.digitX1,
      newProps.digitY1,
      newProps.digitX2,
      newProps.digitY2,
      newProps.digitDamping,
      newProps.digitStiffness,
      newProps.digitMass,
      newProps.digitInitialVelocity);
  configuration.layoutTiming = NumberAnimationMakeTiming(
      newProps.layoutDurationMs,
      newProps.layoutEasing,
      newProps.layoutX1,
      newProps.layoutY1,
      newProps.layoutX2,
      newProps.layoutY2,
      newProps.layoutDamping,
      newProps.layoutStiffness,
      newProps.layoutMass,
      newProps.layoutInitialVelocity);
  configuration.opacityTiming = NumberAnimationMakeTiming(
      newProps.opacityDurationMs,
      newProps.opacityEasing,
      newProps.opacityX1,
      newProps.opacityY1,
      newProps.opacityX2,
      newProps.opacityY2,
      newProps.opacityDamping,
      newProps.opacityStiffness,
      newProps.opacityMass,
      newProps.opacityInitialVelocity);
  _pendingConfiguration = configuration;

  [super updateProps:props oldProps:oldProps];
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask
{
  [super finalizeUpdates:updateMask];
  if (_pendingConfiguration != nil) {
    [_renderer applyConfiguration:_pendingConfiguration];
    _pendingConfiguration = nil;
  }
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _pendingConfiguration = nil;
  [_renderer resetForReuse];
}

- (void)invalidate
{
  [_renderer invalidateRenderer];
  _pendingConfiguration = nil;
  [super invalidate];
}

- (void)numberAnimationRendererDidStart:(NumberAnimationRenderer *)renderer revision:(NSInteger)revision
{
  if (renderer != _renderer || !_eventEmitter) {
    return;
  }
  auto eventEmitter = std::static_pointer_cast<const NumberAnimationViewEventEmitter>(_eventEmitter);
  eventEmitter->onAnimationStart({.revision = static_cast<int>(revision)});
}

- (void)numberAnimationRendererDidComplete:(NumberAnimationRenderer *)renderer revision:(NSInteger)revision
{
  if (renderer != _renderer || !_eventEmitter) {
    return;
  }
  auto eventEmitter = std::static_pointer_cast<const NumberAnimationViewEventEmitter>(_eventEmitter);
  eventEmitter->onAnimationComplete({.revision = static_cast<int>(revision)});
}

@end
