type Make = "Ford" | "BMW" | "Tesla";
type VehicleCatalog = Record<
  Make,
  Readonly<Record<string, readonly string[]>>
>;

export const vehicles: VehicleCatalog = {
  Ford: {
    Ranger: ["Raptor", "Raptor X", "Wildtrak"],
    Falcon: ["XR6", "XR6 Turbo", "XR8"],
    "Falcon Ute": ["XR6", "XR6 Turbo", "🍌"],
  },
  BMW: {
    "130d": ["xDrive 26d", "xDrive 30d"],
    "240i": ["xDrive 30d", "xDrive 50d"],
    "320e": ["xDrive 75d", "xDrive 80d", "xDrive 85d"],
  },
  Tesla: {
    "Model 3": ["Performance", "Long Range", "Dual Motor"],
  },
};

function isMake(value: string): value is Make {
  return Object.hasOwn(vehicles, value);
}

export function isValidVehicle(
  make: string,
  model: string,
  badge: string,
): boolean {
  if (!isMake(make)) {
    return false;
  }

  const models = vehicles[make];
  if (!Object.hasOwn(models, model)) {
    return false;
  }

  return models[model].includes(badge);
}
