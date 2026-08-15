export type SlotKind = 'digit' | 'symbol';

export type NumberSlot = Readonly<{
  digitValue: number;
  key: string;
  kind: SlotKind;
  text: string;
}>;

export type PlannedSlot = NumberSlot &
  Readonly<{
    delta: number;
    entering: boolean;
  }>;

export type NumberPresentation = Readonly<{
  digitGlyphs: readonly string[];
  formattedValue: string;
  slots: readonly NumberSlot[];
  value: number;
}>;

export type TransitionPlan = Readonly<{
  previousSlots: readonly NumberSlot[];
  slots: readonly PlannedSlot[];
  trend: -1 | 0 | 1;
}>;
