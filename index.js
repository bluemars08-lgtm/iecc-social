import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text } from 'react-native';

// Load the app, but if anything throws while LOADING the module graph (e.g. a
// native module failing at import), show the error on screen instead of a
// black screen — so we can see exactly what failed.
let RootComponent;
try {
  RootComponent = require('./App').default;
} catch (e) {
  RootComponent = function LoadError() {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0B0B', padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: '#C0D328', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
          خطأ في تحميل التطبيق
        </Text>
        <Text selectable style={{ color: '#F4F4F4', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
          {String((e && (e.stack || e.message)) || e)}
        </Text>
      </View>
    );
  };
}

registerRootComponent(RootComponent);
