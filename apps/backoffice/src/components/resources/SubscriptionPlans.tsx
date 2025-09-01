import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
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
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define filters for the subscription plan list
// API supports: q (search)
const subscriptionPlanFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search subscription plans..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const SubscriptionPlanToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/subscription-plans');
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

const SubscriptionPlanListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const SubscriptionPlanShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Subscription Plans" />
    <EditButton />
  </TopToolbar>
);

export const SubscriptionPlanList = () => (
  <List 
    filters={subscriptionPlanFilters}
    actions={<SubscriptionPlanListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="name" label="Plan Name" sortable />
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const SubscriptionPlanCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<SubscriptionPlanToolbar />}>
      <TextInput 
        source="name" 
        label="Plan Name"
        validate={[required()]} 
        fullWidth 
        helperText="Enter the subscription plan name (e.g., Basic, Premium, Enterprise)"
      />
    </SimpleForm>
  </Create>
);

export const SubscriptionPlanEdit = () => (
  <Edit>
    <SimpleForm toolbar={<SubscriptionPlanToolbar />}>
      <TextInput 
        source="name" 
        label="Plan Name"
        validate={[required()]} 
        fullWidth 
        helperText="Enter the subscription plan name (e.g., Basic, Premium, Enterprise)"
      />
    </SimpleForm>
  </Edit>
);

export const SubscriptionPlanShow = () => (
  <Show actions={<SubscriptionPlanShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" label="Plan Name" />
      <DateField source="creation_date_utc" label="Created" />
    </SimpleShowLayout>
  </Show>
);