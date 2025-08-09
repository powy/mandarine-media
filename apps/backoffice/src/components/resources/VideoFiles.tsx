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
      source="upload_method" 
      choices={[
        { id: 'new_upload', name: 'New Upload' },
        { id: 'existing_url', name: 'Existing URL' },
      ]} 
    />
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
      <TextField source="filename" />
      <TextField source="upload_method" label="Method" />
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
      <BooleanField source="is_processed" label="Processed" />
      <TextField source="media_description_id" label="Linked Media" />
      <DateField source="created_at" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const VideoFileCreate = () => (
  <Create>
    <SimpleForm>
      <SelectInput 
        source="upload_method" 
        choices={[
          { id: 'new_upload', name: 'New Upload' },
          { id: 'existing_url', name: 'Existing URL' },
        ]}
        validate={[required()]}
        defaultValue="existing_url"
      />
      
      <TextInput source="filename" validate={[required()]} fullWidth />
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
      
      <TextInput source="resolution" placeholder="1920x1080" />
      <NumberInput source="bitrate_kbps" />
      <NumberInput source="frame_rate" />
      
      <TextInput source="video_codec" />
      <TextInput source="audio_codec" />
      
      <SelectInput 
        source="upload_status" 
        choices={[
          { id: 'metadata_only', name: 'Metadata Only' },
          { id: 'upload_completed', name: 'Completed' },
        ]}
        defaultValue="upload_completed"
        helperText="For existing URLs, typically set to 'Completed'"
      />
      
      <BooleanInput source="is_processed" defaultValue={true} />
      <BooleanInput source="is_public" defaultValue={false} />
    </SimpleForm>
  </Create>
);

export const VideoFileEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="filename" validate={[required()]} fullWidth />
      <TextInput source="external_url" label="Video URL" fullWidth />
      
      <ReferenceInput source="media_description_id" reference="media-descriptions" allowEmpty>
        <AutocompleteInput optionText="episode_title" />
      </ReferenceInput>
      
      <NumberInput source="duration_seconds" />
      <NumberInput source="file_size_bytes" />
      
      <TextInput source="resolution" />
      <NumberInput source="bitrate_kbps" />
      <NumberInput source="frame_rate" />
      
      <TextInput source="video_codec" />
      <TextInput source="audio_codec" />
      
      <SelectInput 
        source="upload_status" 
        choices={[
          { id: 'metadata_only', name: 'Metadata Only' },
          { id: 'file_uploading', name: 'Uploading' },
          { id: 'upload_completed', name: 'Completed' },
          { id: 'upload_failed', name: 'Failed' },
        ]}
      />
      
      <BooleanInput source="is_processed" />
      <BooleanInput source="is_public" />
      
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
      <TextField source="filename" />
      <TextField source="upload_method" label="Upload Method" />
      <TextField source="upload_status" label="Status" />
      <TextField source="external_url" label="External URL" />
      <TextField source="file_url" label="File URL" />
      <TextField source="media_description_id" label="Linked Media Description" />
      
      <NumberField source="duration_seconds" label="Duration (seconds)" />
      <NumberField source="file_size_bytes" label="File Size (bytes)" />
      
      <TextField source="resolution" />
      <NumberField source="bitrate_kbps" label="Bitrate (kbps)" />
      <NumberField source="frame_rate" label="Frame Rate" />
      
      <TextField source="video_codec" />
      <TextField source="audio_codec" />
      
      <BooleanField source="is_processed" label="Processed" />
      <BooleanField source="is_public" label="Public" />
      
      <TextField source="mux_asset_id" label="Mux Asset ID" />
      <TextField source="mux_playback_id" label="Mux Playback ID" />
      
      <DateField source="upload_timestamp" label="Upload Time" />
      <DateField source="created_at" />
      <DateField source="last_updated_utc" />
      
      <TextField source="encoding_logs" label="Encoding Logs" />
    </SimpleShowLayout>
  </Show>
);