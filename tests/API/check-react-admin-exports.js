#!/usr/bin/env node

/**
 * Simple script to check what React Admin actually exports
 */

async function checkExports() {
try {
  const { default: reactAdmin, ...namedExports } = await import('react-admin');
  const allExports = { ...namedExports };
  
  // If there's a default export with properties, include them
  if (reactAdmin && typeof reactAdmin === 'object') {
    Object.assign(allExports, reactAdmin);
  }
  
  const exports = Object.keys(allExports).sort();
  
  console.log(`React Admin exports ${exports.length} items:`);
  console.log('');
  
  // Group exports by type for better readability
  const components = exports.filter(name => name[0] === name[0].toUpperCase());
  const hooks = exports.filter(name => name.startsWith('use'));
  const others = exports.filter(name => !components.includes(name) && !hooks.includes(name));
  
  console.log('🎨 COMPONENTS (' + components.length + '):');
  components.forEach(comp => console.log(`  ${comp}`));
  
  console.log('\n🎣 HOOKS (' + hooks.length + '):');
  hooks.forEach(hook => console.log(`  ${hook}`));
  
  console.log('\n⚙️  OTHER EXPORTS (' + others.length + '):');
  others.forEach(other => console.log(`  ${other}`));
  
  console.log('\n🔍 Looking for specific imports from our code...');
  
  // Check for the specific imports we're using
  const ourImports = [
    'List', 'Datagrid', 'TextField', 'DateField', 'NumberField', 'BooleanField',
    'Create', 'SimpleForm', 'TextInput', 'NumberInput', 'SelectInput', 'BooleanInput',
    'Edit', 'Show', 'SimpleShowLayout', 'required', 'EditButton', 'ShowButton', 'DeleteButton',
    'CreateButton', 'TopToolbar', 'Filter', 'ReferenceInput', 'AutocompleteInput', 'LongTextInput',
    'Admin', 'Resource', 'Layout', 'AppBar', 'Menu', 'MenuItemLink', 'useSidebarState'
  ];
  
  const missing = ourImports.filter(imp => !exports.includes(imp));
  const found = ourImports.filter(imp => exports.includes(imp));
  
  console.log(`\n✅ FOUND (${found.length}/${ourImports.length}):`);
  found.forEach(imp => console.log(`  ${imp}`));
  
  if (missing.length > 0) {
    console.log(`\n❌ MISSING (${missing.length}):`);
    missing.forEach(imp => console.log(`  ${imp}`));
    
    // Suggest alternatives
    console.log('\n💡 Possible alternatives:');
    missing.forEach(imp => {
      const similar = exports.filter(exp => 
        exp.toLowerCase().includes(imp.toLowerCase()) || 
        imp.toLowerCase().includes(exp.toLowerCase())
      );
      if (similar.length > 0) {
        console.log(`  ${imp} -> ${similar.join(', ')}`);
      }
    });
  } else {
    console.log('\n🎉 All imports are available!');
  }
  
} catch (error) {
  console.error('❌ Failed to load react-admin:', error.message);
}
}

checkExports();