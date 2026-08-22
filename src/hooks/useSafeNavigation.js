import { useMemo } from 'react';
import { KNOWN_ROUTES, toast } from '../lib/safe';

/**
 * Wraps a React Navigation `navigation` prop so that EVERY navigate / goBack
 * call made anywhere in the screen is defensively guarded:
 *
 *  - unknown routes fall back to a friendly "coming soon" toast,
 *  - dispatch errors are caught instead of crashing,
 *  - all other navigation methods are passed through untouched.
 *
 * Usage:  const navigation = useSafeNavigation(rawNavigationProp);
 */
export function useSafeNavigation(navigation) {
  return useMemo(() => {
    if (!navigation) {
      // Absolute last resort — a no-op shell that can never crash.
      return {
        navigate: () => toast('Coming Soon', 'This feature will be available soon.'),
        goBack: () => {},
        push: () => {},
        replace: () => {},
        setParams: () => {},
        addListener: () => () => {},
        removeListener: () => {},
        dispatch: () => {},
        setOptions: () => {},
        isFocused: () => true,
        getState: () => undefined,
      };
    }

    return new Proxy(
      {},
      {
        get(_target, prop) {
          // Guard the two dispatchers that can receive bad routes.
          if (prop === 'navigate') {
            return (...args) => {
              try {
                const [route] = args;
                if (typeof route === 'string' && !KNOWN_ROUTES.has(route)) {
                  toast('Coming Soon', 'This feature will be available soon.');
                  return;
                }
                return navigation.navigate(...args);
              } catch (e) {
                console.log('[safe navigate]', e?.message || e);
                toast('Coming Soon', 'This feature will be available soon.');
              }
            };
          }

          if (prop === 'goBack') {
            return (...args) => {
              try {
                return navigation.goBack(...args);
              } catch (e) {
                console.log('[safe goBack]', e?.message || e);
              }
            };
          }

          if (prop === 'push' || prop === 'replace') {
            return (...args) => {
              try {
                return navigation[prop](...args);
              } catch (e) {
                console.log(`[safe ${prop}]`, e?.message || e);
                toast('Coming Soon', 'This feature will be available soon.');
              }
            };
          }

          // Every other method/property delegates straight through.
          const value = navigation[prop];
          return typeof value === 'function' ? value.bind(navigation) : value;
        },
      },
    );
  }, [navigation]);
}