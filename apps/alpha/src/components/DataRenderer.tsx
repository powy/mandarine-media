import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DataRendererProps {
  data: any;
  depth?: number;
}

export const DataRenderer: React.FC<DataRendererProps> = ({ data, depth = 0 }) => {
  if (data === null || data === undefined) {
    return <Text style={[styles.value, { marginLeft: depth * 16 }]}>null</Text>;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return (
      <Text style={[styles.value, { marginLeft: depth * 16 }]}>
        {String(data)}
      </Text>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <Text style={[styles.value, { marginLeft: depth * 16 }]}>[]</Text>;
    }
    return (
      <View style={{ marginLeft: depth * 16 }}>
        <Text style={styles.label}>[Array - {data.length} items]</Text>
        {data.slice(0, 3).map((item, index) => (
          <View key={index} style={styles.arrayItem}>
            <Text style={styles.arrayIndex}>[{index}]:</Text>
            <DataRenderer data={item} depth={depth + 1} />
          </View>
        ))}
        {data.length > 3 && (
          <Text style={[styles.value, { marginLeft: (depth + 1) * 16, fontStyle: 'italic' }]}>
            ... and {data.length - 3} more items
          </Text>
        )}
      </View>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <Text style={[styles.value, { marginLeft: depth * 16 }]}>{'{}'}</Text>;
    }
    
    return (
      <View style={{ marginLeft: depth * 16 }}>
        {entries.map(([key, value]) => (
          <View key={key} style={styles.objectEntry}>
            <Text style={styles.key}>{key}:</Text>
            <DataRenderer data={value} depth={depth + 1} />
          </View>
        ))}
      </View>
    );
  }

  return <Text style={[styles.value, { marginLeft: depth * 16 }]}>{String(data)}</Text>;
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  key: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '500',
    minWidth: 80,
  },
  value: {
    fontSize: 12,
    color: '#333',
    flexWrap: 'wrap',
  },
  objectEntry: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-start',
  },
  arrayItem: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-start',
  },
  arrayIndex: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 40,
  },
});