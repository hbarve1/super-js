// @superjs/types-react — narrow hand-curated SJS bindings for React 18.x.

export type ReactNode = dynamic;

export type ReactElement {
  type: dynamic;
  props: dynamic;
  key: string | null;
}

export type Key = string | number;

export type Ref<T> = dynamic;

export type ComponentType<P> = (props: P) => ReactElement | null;

export type FC<P> = ComponentType<P>;

export type PropsWithChildren<P> {
  children: ReactNode;
}

export type Dispatch<T> = (value: T) => void;

export type SetStateAction<T> = T | dynamic;

export type StateHookResult<T> = [T, Dispatch<SetStateAction<T>>];

export type EffectCleanup = () => void;

export type EffectCallback = () => EffectCleanup | void;

export type MutableRefObject<T> {
  current: T;
}
