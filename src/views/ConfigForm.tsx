import React from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { RJSFSchema } from '@rjsf/utils';
import Card from '../ui/Card';

interface ConfigFormProps {
    schema: RJSFSchema;
    formData?: any;
    onSubmit?: (data: any) => void;
    title?: string;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ schema, formData, onSubmit, title = "Configuration" }) => {
  const handleSubmit = ({ formData }: { formData: any }) => {
    console.log('Form submitted:', formData);
    if (onSubmit) {
        onSubmit(formData);
    }
  };

  const handleError = (errors: any) => {
    console.error('Form errors:', errors);
  };

  return (
    <div className="p-4 w-full max-w-4xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <Form
          schema={schema}
          formData={formData}
          validator={validator}
          onSubmit={handleSubmit}
          onError={handleError}
          className="config-form"
        />
      </Card>
    </div>
  );
};

export default ConfigForm;
