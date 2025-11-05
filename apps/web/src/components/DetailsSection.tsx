import React from 'react';

export interface DetailField {
  label: string;
  value: string | number | null | undefined;
  show?: boolean;
}

interface DetailsSectionProps {
  title?: string;
  fields: DetailField[];
}

const DetailsSection: React.FC<DetailsSectionProps> = ({
  title = "Détails",
  fields
}) => {
  // Filter fields that should be shown (have value and show is not false)
  const visibleFields = fields.filter(
    field => (field.show !== false) && (field.value !== null && field.value !== undefined && field.value !== '')
  );

  // Don't render section if no fields to show
  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-kyool-blue mb-3">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {visibleFields.map((field, index) => (
          <div key={index}>
            <span className="text-gray-400">{field.label}: </span>
            <span className="text-white">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailsSection;
