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
      <TextField source="playback_policy" label="Policy" />
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
      <BooleanField source="drm_protection" label="DRM" />
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
      
      {/* Upload and Encoding Settings */}
      <SelectInput 
        source="upload_method" 
        choices={[
          { id: 'existing_url', name: 'Existing URL' },
          { id: 'new_upload', name: 'New Upload' },
        ]}
        defaultValue="existing_url"
      />
      
      <SelectInput 
        source="upload_status" 
        choices={[
          { id: 'metadata_only', name: 'Metadata Only' },
          { id: 'upload_completed', name: 'Completed' },
        ]}
        defaultValue="upload_completed"
        helperText="For existing URLs, typically set to 'Completed'"
      />
      
      <SelectInput 
        source="encoding_status" 
        choices={[
          { id: 'pending', name: 'Pending' },
          { id: 'processing', name: 'Processing' },
          { id: 'completed', name: 'Completed' },
          { id: 'failed', name: 'Failed' },
        ]}
        defaultValue="completed"
      />
      
      {/* Playback and Security Settings */}
      <SelectInput 
        source="playback_policy" 
        choices={[
          { id: 'public', name: 'Public' },
          { id: 'signed', name: 'Signed' },
          { id: 'drm', name: 'DRM' },
        ]}
        helperText="IMPORTANT: Set to 'signed' for protected content that requires key requests, 'drm' for DRM-protected content"
      />
      
      <BooleanInput source="drm_protection" label="DRM Protection" />
      
      {/* Technical Specifications */}
      <NumberInput source="duration_seconds" />
      <NumberInput source="file_size_bytes" />
      <NumberInput source="max_resolution_width" />
      <NumberInput source="max_resolution_height" />
      <NumberInput source="bitrate_kbps" />
      <NumberInput source="frame_rate" />
      <TextInput source="aspect_ratio" />
      <NumberInput source="audio_sample_rate" />
      
      {/* Environment and SEO */}
      <TextInput source="environment_key" helperText="Environment identifier" />
      <TextInput source="slug" helperText="SEO-friendly URL slug (auto-generated if empty)" />
      
      {/* Encoding Profile */}
      <TextInput source="encoding_profile" helperText="Video encoding profile used" />
    </SimpleForm>
  </Create>
);

export const VideoFileEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="file_name" validate={[required()]} fullWidth />
      <TextInput source="external_url" label="Video URL" fullWidth />
      
      {/* Upload and Encoding Settings */}
      <SelectInput 
        source="upload_method" 
        choices={[
          { id: 'existing_url', name: 'Existing URL' },
          { id: 'new_upload', name: 'New Upload' },
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
      
      <SelectInput 
        source="encoding_status" 
        choices={[
          { id: 'pending', name: 'Pending' },
          { id: 'processing', name: 'Processing' },
          { id: 'completed', name: 'Completed' },
          { id: 'failed', name: 'Failed' },
        ]}
      />
      
      {/* Playback and Security Settings */}
      <SelectInput 
        source="playback_policy" 
        choices={[
          { id: 'public', name: 'Public' },
          { id: 'signed', name: 'Signed' },
          { id: 'drm', name: 'DRM' },
        ]}
        helperText="IMPORTANT: Set to 'signed' for protected content that requires key requests, 'drm' for DRM-protected content"
      />
      
      <BooleanInput source="drm_protection" label="DRM Protection" />
      
      {/* Technical Specifications */}
      <NumberInput source="duration_seconds" />
      <NumberInput source="file_size_bytes" />
      <NumberInput source="max_resolution_width" />
      <NumberInput source="max_resolution_height" />
      <NumberInput source="bitrate_kbps" />
      <NumberInput source="frame_rate" />
      <TextInput source="aspect_ratio" />
      <NumberInput source="audio_sample_rate" />
      
      {/* Environment and SEO */}
      <TextInput source="environment_key" helperText="Environment identifier" />
      <TextInput source="slug" helperText="SEO-friendly URL slug (auto-generated if empty)" />
      
      {/* Encoding Profile */}
      <TextInput source="encoding_profile" helperText="Video encoding profile used" />
      
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
      
      {/* Upload and Status Information */}
      <TextField source="upload_method" label="Upload Method" />
      <TextField source="upload_status" label="Upload Status" />
      <TextField source="encoding_status" label="Encoding Status" />
      <TextField source="external_url" label="External URL" />
      <TextField source="file_url" label="File URL" />
      
      {/* Playback and Security Settings */}
      <TextField source="playback_policy" label="Playback Policy" style={{fontWeight: 'bold', color: '#d32f2f'}} />
      <BooleanField source="drm_protection" label="DRM Protection" />
      
      {/* Technical Specifications */}
      <NumberField source="duration_seconds" label="Duration (seconds)" />
      <NumberField source="file_size_bytes" label="File Size (bytes)" />
      <NumberField source="max_resolution_width" label="Max Width" />
      <NumberField source="max_resolution_height" label="Max Height" />
      <NumberField source="bitrate_kbps" label="Bitrate (kbps)" />
      <NumberField source="frame_rate" label="Frame Rate" />
      <TextField source="aspect_ratio" label="Aspect Ratio" />
      <NumberField source="audio_sample_rate" label="Audio Sample Rate" />
      
      {/* Environment and SEO */}
      <TextField source="environment_key" label="Environment Key" />
      <TextField source="slug" label="URL Slug" />
      
      {/* Encoding Information */}
      <TextField source="encoding_profile" label="Encoding Profile" />
      <DateField source="encodage_date_utc" label="Encoding Date" />
      
      {/* Mux Integration */}
      <TextField source="mux_asset_id" label="Mux Asset ID" />
      <TextField source="mux_playback_id" label="Mux Playback ID" />
      
      {/* Advanced Fields */}
      <FunctionField
        label="Subtitle Tracks"
        render={(record: any) => record.subtitle_tracks ? record.subtitle_tracks.join(', ') : 'None'}
      />
      <FunctionField
        label="Subtitle Tracks (Text List)"
        render={(record: any) => record.subtitle_tracks_text_list ? record.subtitle_tracks_text_list.join(', ') : 'None'}
      />
      <FunctionField
        label="Supported Resolutions"
        render={(record: any) => record.resolutions_list ? record.resolutions_list.join(', ') : 'None'}
      />
      <FunctionField
        label="Accessibilities"
        render={(record: any) => record.accessibilities_list ? record.accessibilities_list.join(', ') : 'None'}
      />
      <FunctionField
        label="Audio Languages"
        render={(record: any) => record.audio_languages_id_list ? record.audio_languages_id_list.join(', ') : 'None'}
      />
      
      {/* Timestamps */}
      <DateField source="upload_timestamp" label="Upload Time" />
      <DateField source="creation_date_utc" label="Creation Date" />
    </SimpleShowLayout>
  </Show>
);