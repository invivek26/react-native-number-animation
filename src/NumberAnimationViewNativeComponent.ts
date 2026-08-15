import type { HostComponent, ViewProps } from 'react-native';
import {
  codegenNativeComponent,
  type CodegenTypes,
  type ColorValue,
} from 'react-native';

export type NativeNumberSlot = Readonly<{
  key: string;
  text: string;
  digitValue: CodegenTypes.Int32;
  delta: CodegenTypes.Int32;
  entering: boolean;
}>;

type NativeAnimationEvent = Readonly<{
  revision: CodegenTypes.Int32;
}>;

export interface NativeNumberAnimationProps extends ViewProps {
  active: boolean;
  revision: CodegenTypes.Int32;
  formattedValue: string;
  slots: ReadonlyArray<NativeNumberSlot>;
  initialSlots: ReadonlyArray<NativeNumberSlot>;
  digitGlyphs: ReadonlyArray<string>;
  trend: CodegenTypes.Int32;
  mask: boolean;
  reduceMotion: boolean;
  textColor?: ColorValue;
  fontFamily?: string;
  fontSize: CodegenTypes.Float;
  fontWeight: string;
  italic: boolean;
  fontVariant: ReadonlyArray<string>;
  letterSpacing: CodegenTypes.Float;
  lineHeight: CodegenTypes.Float;
  textAlign: string;
  writingDirection: string;
  digitDurationMs: CodegenTypes.Double;
  digitEasing: string;
  digitX1: CodegenTypes.Float;
  digitY1: CodegenTypes.Float;
  digitX2: CodegenTypes.Float;
  digitY2: CodegenTypes.Float;
  digitDamping: CodegenTypes.Float;
  digitStiffness: CodegenTypes.Float;
  digitMass: CodegenTypes.Float;
  digitInitialVelocity: CodegenTypes.Float;
  layoutDurationMs: CodegenTypes.Double;
  layoutEasing: string;
  layoutX1: CodegenTypes.Float;
  layoutY1: CodegenTypes.Float;
  layoutX2: CodegenTypes.Float;
  layoutY2: CodegenTypes.Float;
  layoutDamping: CodegenTypes.Float;
  layoutStiffness: CodegenTypes.Float;
  layoutMass: CodegenTypes.Float;
  layoutInitialVelocity: CodegenTypes.Float;
  opacityDurationMs: CodegenTypes.Double;
  opacityEasing: string;
  opacityX1: CodegenTypes.Float;
  opacityY1: CodegenTypes.Float;
  opacityX2: CodegenTypes.Float;
  opacityY2: CodegenTypes.Float;
  opacityDamping: CodegenTypes.Float;
  opacityStiffness: CodegenTypes.Float;
  opacityMass: CodegenTypes.Float;
  opacityInitialVelocity: CodegenTypes.Float;
  onAnimationStart?: CodegenTypes.DirectEventHandler<NativeAnimationEvent>;
  onAnimationComplete?: CodegenTypes.DirectEventHandler<NativeAnimationEvent>;
}

export default codegenNativeComponent<NativeNumberAnimationProps>(
  'NumberAnimationView'
) as HostComponent<NativeNumberAnimationProps>;
