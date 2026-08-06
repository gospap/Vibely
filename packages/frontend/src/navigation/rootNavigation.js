import { createNavigationContainerRef } from "@react-navigation/native";

// A notification is tapped from outside the tree — there is no screen holding a
// navigation prop at that moment — so the container is reached through a ref.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
}
