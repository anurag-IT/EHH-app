import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name || 'EHH',
    slug: config.slug || 'EHH',
    updates: {
      ...config.updates,
      // Production update system
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    // Adding performance optimization plugins
    plugins: [
      ...(config.plugins || []),
      'expo-font',
      'expo-secure-store',
      [
        'expo-updates',
        {
          username: 'ehh-production',
        },
      ],
    ],
  };
};
