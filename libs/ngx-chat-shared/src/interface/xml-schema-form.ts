// SPDX-License-Identifier: AGPL-3.0-or-later
export interface XmlSchemaForm {
  type: FormType;
  title?: string;
  instructions: string[];
  fields: FormField[];
}

export const nsXForm = 'jabber:x:data';

export type FormType = 'form' | 'submit' | 'cancel' | 'result';

export type FieldType =
  | 'fixed'
  | 'boolean'
  | 'hidden'
  | 'jid-single'
  | 'jid-multi'
  | 'list-single'
  | 'list-multi'
  | 'text-single'
  | 'text-private'
  | 'text-multi';

export interface FieldValueType {
  fixed: string;
  boolean: boolean;
  hidden: string;
  'jid-single': string;
  'jid-multi': string[];
  'list-single': string;
  'list-multi': string[];
  'text-single': string;
  'text-private': string;
  'text-multi': string[];
}

export type FormField =
  | FixedFormField
  | BooleanFormField
  | TextualFormField
  | JidSingleFormField
  | JidMultiFormField
  | ListSingleFormField
  | ListMultiFormField
  | TextMultiFormField;

export interface FixedFormField {
  type: 'fixed';
  variable?: string;
  value: string;
}

interface FormFieldBase<TFieldType extends FieldType> {
  type: TFieldType;
  variable: string;
  label?: string;
  required?: boolean;
  description?: string;
  value?: FieldValueType[TFieldType];
}

export type BooleanFormField = FormFieldBase<'boolean'>;
export type TextualFormField = FormFieldBase<'hidden' | 'text-single' | 'text-private'>;
export type JidSingleFormField = FormFieldBase<'jid-single'>;
export type JidMultiFormField = FormFieldBase<'jid-multi'>;
export type TextMultiFormField = FormFieldBase<'text-multi'>;

interface ListFormField<TFieldType extends 'list-single' | 'list-multi'>
  extends FormFieldBase<TFieldType> {
  options?: FieldOption[];
}

export type ListSingleFormField = ListFormField<'list-single'>;
export type ListMultiFormField = ListFormField<'list-multi'>;

export interface FieldOption {
  label?: string;
  value: string;
}
