import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  ShowButton,
  TopToolbar,
  ListButton,
  SearchInput,
  FilterButton,
  ExportButton,
  FunctionField,
  SelectInput,
} from 'react-admin';

// Define event choices for filtering
const eventChoices = [
  { id: 'possible_orphan', name: 'Possible Orphan' },
  { id: 'file_delete', name: 'File Delete' },
  { id: 'upload_failed', name: 'Upload Failed' },
  { id: 'processing_failed', name: 'Processing Failed' },
  { id: 'destroyed', name: 'Destroyed' },
];

// Define filters for the video file report list
const videoFileReportFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search reports..." 
    alwaysOn 
    key="search"
  />,
  <SelectInput 
    source="event" 
    label="Event Type"
    choices={eventChoices}
    key="event"
  />,
];

const VideoFileReportListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const VideoFileReportShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Video File Reports" />
  </TopToolbar>
);

export const VideoFileReportList = () => (
  <List 
    filters={videoFileReportFilters}
    actions={<VideoFileReportListActions />} 
    sort={{ field: 'timestamp', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" />
      <TextField source="video_file_name" label="Video File" sortable />
      <TextField source="media_description_title" label="Media Title" />
      <FunctionField 
        label="Event" 
        render={record => {
          const event = eventChoices.find(choice => choice.id === record.event);
          return event ? event.name : record.event;
        }}
        sortable
      />
      <DateField source="timestamp" sortable />
      <TextField source="file_size" label="File Size" />
      <TextField source="duration" />
      <ShowButton />
    </Datagrid>
  </List>
);

export const VideoFileReportShow = () => (
  <Show actions={<VideoFileReportShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="video_file_id" label="Video File ID" />
      <TextField source="video_file_name" label="Video File Name" />
      <TextField source="video_file_url" label="Video File URL" />
      <TextField source="upload_method" label="Upload Method" />
      <TextField source="file_size" label="File Size" />
      <TextField source="duration" />
      <TextField source="media_description_id" label="Media Description ID" />
      <TextField source="media_description_title" label="Media Description Title" />
      <FunctionField 
        label="Event Type" 
        render={record => {
          const event = eventChoices.find(choice => choice.id === record.event);
          return event ? event.name : record.event;
        }}
      />
      <DateField source="timestamp" showTime />
      <TextField source="additional_info" label="Additional Information" />
    </SimpleShowLayout>
  </Show>
);