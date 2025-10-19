import React from 'react';
import { Button, useRecordContext, useNotify, useRedirect } from 'react-admin';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface CopyMediaDescriptionButtonProps {
  label?: string;
}

/**
 * Button component that copies the current media description to a new one.
 * Navigates to the create form with all fields pre-filled from the current record.
 *
 * Excludes system-managed fields:
 * - id (auto-generated)
 * - creation_date_utc (system managed)
 * - last_updated_utc (system managed)
 * - file_number (auto-incremented)
 */
export const CopyMediaDescriptionButton: React.FC<CopyMediaDescriptionButtonProps> = ({
  label = 'Copy into New'
}) => {
  const record = useRecordContext();
  const notify = useNotify();
  const redirect = useRedirect();

  const handleClick = () => {
    if (!record) {
      notify('No record to copy', { type: 'warning' });
      return;
    }

    const copyData = prepareCopyData(record);

    redirect('/media-descriptions/create', undefined, undefined, undefined, { record: copyData });

    notify('Media description copied. Review and save to create.', { type: 'info' });
  };

  return (
    <Button
      onClick={handleClick}
      label={label}
      startIcon={<ContentCopyIcon />}
    >
      <ContentCopyIcon />
    </Button>
  );
};

/**
 * Prepares record data for copying by:
 * 1. Removing system-managed fields (id, dates, file_number)
 * 2. Removing nested objects returned by API (actors, directors, etc.)
 * 3. Transforming datetime fields to date-only format for form
 * 4. Transforming array fields to comma-separated strings if needed
 */
const prepareCopyData = (record: any) => {
  const {
    // System-managed fields to exclude
    id,
    creation_date_utc,
    last_updated_utc,
    file_number,

    // Nested objects from API response (we keep only ID arrays)
    actors,
    directors,
    producers,
    authors,
    origin_countries,
    available_countries,
    original_languages,
    available_subtitle_languages,
    available_audio_languages,
    audience_categories,
    eligible_plans,
    media_themes,
    additional_images,
    trailers,
    excerpts,
    people_roles,

    // Keep all other fields
    ...copyData
  } = record;

  // Transform datetime fields to date-only format (YYYY-MM-DD) for form inputs
  if (copyData.contract_start_date_utc) {
    copyData.contract_start_date_utc = extractDateOnly(copyData.contract_start_date_utc);
  }
  if (copyData.contract_end_date_utc) {
    copyData.contract_end_date_utc = extractDateOnly(copyData.contract_end_date_utc);
  }
  if (copyData.original_broadcast_date_utc) {
    copyData.original_broadcast_date_utc = extractDateOnly(copyData.original_broadcast_date_utc);
  }

  // Transform array fields to comma-separated strings if they are arrays
  // (The form expects comma-separated strings for these fields)
  // Convert empty arrays to null to avoid backend validation errors
  if (Array.isArray(copyData.tags)) {
    copyData.tags = copyData.tags.length > 0 ? copyData.tags.join(', ') : null;
  }
  if (Array.isArray(copyData.seo_keywords_text_list)) {
    copyData.seo_keywords_text_list = copyData.seo_keywords_text_list.length > 0
      ? copyData.seo_keywords_text_list.join(', ')
      : null;
  }
  if (Array.isArray(copyData.hashtags_text_list)) {
    copyData.hashtags_text_list = copyData.hashtags_text_list.length > 0
      ? copyData.hashtags_text_list.join(', ')
      : null;
  }
  if (Array.isArray(copyData.human_keywords_text_list)) {
    copyData.human_keywords_text_list = copyData.human_keywords_text_list.length > 0
      ? copyData.human_keywords_text_list.join(', ')
      : null;
  }

  return copyData;
};

/**
 * Extracts date portion from ISO datetime string
 * @param dateTime - ISO datetime string (e.g., "2024-01-15T00:00:00Z")
 * @returns Date string in YYYY-MM-DD format (e.g., "2024-01-15")
 */
const extractDateOnly = (dateTime: string): string => {
  if (!dateTime) return dateTime;
  return dateTime.split('T')[0];
};
