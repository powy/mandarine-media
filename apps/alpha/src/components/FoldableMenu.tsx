import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface FoldableMenuProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  count?: number;
}

export const FoldableMenu: React.FC<FoldableMenuProps> = ({
  title,
  children,
  defaultExpanded = false,
  count
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>
          {isExpanded ? '▼' : '▶'} {title}
          {count !== undefined && ` (${count})`}
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    padding: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 8,
  },
});