#import "NumberAnimationView.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/NumberAnimationViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/NumberAnimationViewSpec/Props.h>
#import <react/renderer/components/NumberAnimationViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@implementation NumberAnimationView {
    UIView * _view;
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

    _view = [[UIView alloc] init];

    self.contentView = _view;
  }

  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<NumberAnimationViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<NumberAnimationViewProps const>(props);

    if (oldViewProps.color != newViewProps.color) {
        [_view setBackgroundColor: RCTUIColorFromSharedColor(newViewProps.color)];
    }

    [super updateProps:props oldProps:oldProps];
}

@end
