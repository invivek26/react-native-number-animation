import { createContext, useContext, type ReactNode } from 'react';

const NumberAnimationEnabledContext = createContext(true);

export type NumberAnimationProviderProps = Readonly<{
  children: ReactNode;
  enabled: boolean;
}>;

export const NumberAnimationProvider = ({
  children,
  enabled,
}: NumberAnimationProviderProps) => {
  const parentEnabled = useContext(NumberAnimationEnabledContext);

  return (
    <NumberAnimationEnabledContext.Provider value={parentEnabled && enabled}>
      {children}
    </NumberAnimationEnabledContext.Provider>
  );
};

export const useNumberAnimationEnabled = () =>
  useContext(NumberAnimationEnabledContext);
