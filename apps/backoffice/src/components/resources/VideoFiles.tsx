import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  BooleanField,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
  Edit,
  Show,
  SimpleShowLayout,
  required,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
  TopToolbar,
  Filter,
  ReferenceInput,
  AutocompleteInput,
  FunctionField,
} from 'react-admin';

// Filters for the list view
const VideoFileFilters = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search" source="q" alwaysOn />
    <SelectInput 
      source="upload_status" 
      choices={[
        { id: 'metadata_only', name: 'Metadata Only' },
        { id: 'file_uploading', name: 'Uploading' },
        { id: 'upload_completed', name: 'Completed' },
        { id: 'upload_failed', name: 'Failed' },
      ]} 
    />
    <BooleanInput source="is_processed" label="Processed" />
  </Filter>
);

const VideoFileListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const VideoFileList = () => (
  <List filters={<VideoFileFilters />} actions={<VideoFileListActions />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="file_name" />
      <TextField source="upload_status" label="Status" />
      <FunctionField
        label="URL/File"
        render={(record: any) => 
          record.external_url ? 
            <a href={record.external_url} target="_blank" rel="noopener noreferrer">External URL</a> : 
            record.file_url || 'N/A'
        }
      />
      <NumberField source="duration_seconds" label="Duration (s)" />
      <NumberField source="file_size_bytes" label="Size (bytes)" />
      <TextField source="media_description_id" label="Linked Media" />
      <DateField source="creation_date_utc" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const VideoFileCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="file_name" validate={[required()]} fullWidth />
      <TextInput 
        source="external_url" 
        label="Video URL" 
        fullWidth 
        helperText="For existing URL method, provide the direct video URL"
      />
      
      <ReferenceInput source="media_description_id" reference="media-descriptions" allowEmpty>
        <AutocompleteInput optionText="episode_title" />
      </ReferenceInput>
      
      <NumberInput source="duration_seconds" />
      <NumberInput source="file_size_bytes" />
      
      <NumberInput source="max_resolution_width" />
      <NumberInput source="max_resolution_height" />
      <NumberInput source="bitrate_kbps" />
      <NumberInput source="frame_rate" />
      
      <SelectInput 
        source="upload_status" 
        choices={[
          { id: 'metadata_only', name: 'Metadata Only' },
          { id: 'upload_completed', name: 'Completed' },
        ]}
        defaultValue="upload_completed"
        helperText="For existing URLs, typically set to 'Completed'"
      />
    </SimpleForm>
  </Create>
);

export const VideoFileEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="file_name" validate={[required()]} fullWidth />
      <TextInput source="external_url" label="Video URL" fullWidth />
      
      <ReferenceInput source="media_description_id" reference="media-descriptions" allowEmpty>
        <AutocompleteInput optionText="episode_title" />
      </ReferenceInput>
      
      <NumberInput source="duration_seconds" />
      <NumberInput source="file_size_bytes" />
      
      <NumberInput source="max_resolution_width" />
      <NumberInput source="max_resolution_height" />
      <NumberInput source="bitrate_kbps" />
      <NumberInput source="frame_rate" />
      
      <SelectInput 
        source="upload_status" 
        choices={[
          { id: 'metadata_only', name: 'Metadata Only' },
          { id: 'file_uploading', name: 'Uploading' },
          { id: 'upload_completed', name: 'Completed' },
          { id: 'upload_failed', name: 'Failed' },
        ]}
      />
      
      {/* Mux integration fields - read only */}
      <TextInput source="mux_asset_id" disabled />
      <TextInput source="mux_playback_id" disabled />
      <TextInput source="encoding_logs" multiline rows={4} disabled />
    </SimpleForm>
  </Edit>
);

export const VideoFileShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="file_name" />
      <TextField source="upload_status" label="Status" />
      <TextField source="external_url" label="External URL" />
      <TextField source="file_url" label="File URL" />
      <TextField source="media_description_id" label="Linked Media Description" />
      
      <NumberField source="duration_seconds" label="Duration (seconds)" />
      <NumberField source="file_size_bytes" label="File Size (bytes)" />
      
      <NumberField source="max_resolution_width" label="Max Width" />
      <NumberField source="max_resolution_height" label="Max Height" />
      <NumberField source="bitrate_kbps" label="Bitrate (kbps)" />
      <NumberField source="frame_rate" label="Frame Rate" />
      
      <TextField source="mux_asset_id" label="Mux Asset ID" />
      <TextField source="mux_playback_id" label="Mux Playback ID" />
      
      <DateField source="upload_timestamp" label="Upload Time" />
      <DateField source="creation_date_utc" />
    </SimpleShowLayout>
  </Show>
);