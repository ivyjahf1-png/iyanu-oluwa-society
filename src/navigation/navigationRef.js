import { createNavigationContainerRef } from '@react-navigation/native';

/** Global navigation ref so non-component code (guards, services, modals)
 *  can read the current route and dispatch navigation. */
export const navigationRef = createNavigationContainerRef();