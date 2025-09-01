import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  Edit,
  Show,
  SimpleShowLayout,
  required,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
  TopToolbar,
  Toolbar,
  SaveButton,
  Button,
  ListButton,
  SearchInput,
  FilterButton,
  ExportButton,
  UrlField,
  ImageField,
  FunctionField,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define filters for the picture list
// API supports: q (search)
const pictureFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search pictures..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const PictureToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/pictures');
  };
  
  return (
    <Toolbar>
      <SaveButton />
      <Button 
        onClick={handleCancel}
        label="Cancel"
      />
    </Toolbar>
  );
};

const PictureListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const PictureShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Pictures" />
    <EditButton />
  </TopToolbar>
);

export const PictureList = () => (
  <List 
    filters={pictureFilters}
    actions={<PictureListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <ImageField 
        source="image_url" 
        label="Image" 
        sx={{ '& img': { maxHeight: 50, maxWidth: 50 } }}
      />
      <TextField source="file_name" label="File Name" sortable />
      <TextField source="alt_text" label="Alt Text" />
      <FunctionField 
        label="Dimensions" 
        render={record => 
          record.width && record.height 
            ? `${record.width}x${record.height}`
            : 'N/A'
        } 
      />
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const PictureCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<PictureToolbar />}>
      <TextInput 
        source="image_url" 
        label="Photo URL"
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="file_name" 
        label="File Name"
        fullWidth 
      />
      <TextInput 
        source="alt_text" 
        label="Alt Text"
        fullWidth 
        multiline
      />
      <NumberInput 
        source="width" 
        label="Width (pixels)"
        min={1}
      />
      <NumberInput 
        source="height" 
        label="Height (pixels)"
        min={1}
      />
    </SimpleForm>
  </Create>
);

export const PictureEdit = () => (
  <Edit>
    <SimpleForm toolbar={<PictureToolbar />}>
      <TextInput 
        source="image_url" 
        label="Photo URL"
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="file_name" 
        label="File Name"
        fullWidth 
      />
      <TextInput 
        source="alt_text" 
        label="Alt Text"
        fullWidth 
        multiline
      />
      <NumberInput 
        source="width" 
        label="Width (pixels)"
        min={1}
      />
      <NumberInput 
        source="height" 
        label="Height (pixels)"
        min={1}
      />
    </SimpleForm>
  </Edit>
);

export const PictureShow = () => (
  <Show actions={<PictureShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <ImageField source="image_url" label="Image" />
      <UrlField source="image_url" label="Photo URL" />
      <TextField source="file_name" label="File Name" />
      <TextField source="alt_text" label="Alt Text" />
      <TextField source="width" label="Width (pixels)" />
      <TextField source="height" label="Height (pixels)" />
      <DateField source="creation_date_utc" label="Created" />
    </SimpleShowLayout>
  </Show>
);