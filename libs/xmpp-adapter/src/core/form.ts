// SPDX-License-Identifier: MIT
// implements https://xmpp.org/extensions/xep-0004.html

import type { StanzaBuilder } from '../stanza-builder';
import {
  BooleanFormField,
  FieldOption,
  FieldType,
  FieldValueType,
  FormField,
  FormType,
  JidMultiFormField,
  JidSingleFormField,
  ListMultiFormField,
  ListSingleFormField,
  nsXForm,
  TextMultiFormField,
  TextualFormField,
  XmlSchemaForm,
} from '@pazznetwork/ngx-chat-shared';

function parseStringValue([valueEl]: Element[]): string {
  return valueEl?.textContent ?? '';
}

function parseMultipleStringValues(valueEls: Element[]): string[] {
  return valueEls.map((el) => parseStringValue([el]));
}

function parseJidValue([valueEl]: Element[]): string {
  return valueEl?.textContent ?? '';
}

const valueParsers = {
  fixed: parseStringValue,
  boolean: ([valueEl]: Element[]): boolean => {
    if (!valueEl) {
      return false;
    }
    const value = valueEl.textContent;
    return value === '1' || value === 'true';
  },
  hidden: parseStringValue,
  'jid-single': parseJidValue,
  'jid-multi': (valueEls: Element[]): string[] => [
    ...new Set(valueEls.map((el) => parseStringValue([el]))),
  ],
  'list-single': parseStringValue,
  'list-multi': parseMultipleStringValues,
  'text-single': parseStringValue,
  'text-private': parseStringValue,
  'text-multi': parseMultipleStringValues,
};

export function parseForm(formEl: Element): XmlSchemaForm {
  if (formEl.nodeName !== 'x' || formEl.getAttribute('xmlns') !== nsXForm) {
    throw new Error(
      `Provided element is not a form element: elementName=${formEl.tagName}, xmlns=${
        formEl?.getAttribute('xmlns') as string
      }, form=${formEl.toString()}`
    );
  }

  const instructionsNodes = formEl.querySelectorAll('instructions');

  return {
    type: formEl.getAttribute('type') as FormType,
    title: formEl.getAttribute('title') ?? undefined,
    instructions: instructionsNodes
      ? (Array.from(instructionsNodes)
          .map((descEl) => descEl?.textContent)
          .filter((s) => !s) as string[])
      : ([] as string[]),
    fields: Array.from(formEl.querySelectorAll('field')).map((fieldEl) => {
      const rawType = fieldEl.getAttribute('type');
      const type =
        rawType && rawType in valueParsers ? (rawType as keyof typeof valueParsers) : 'text-single';
      const variable = fieldEl.getAttribute('var');
      const label = fieldEl.getAttribute('label');
      let options: FieldOption[] | undefined;
      if (type === 'list-single' || type === 'list-multi') {
        const htmlOptions = Array.from(fieldEl.querySelectorAll('option'));
        options = htmlOptions.map((optionEl) => ({
          value: optionEl.querySelector('value')?.textContent ?? '',
          label: optionEl.getAttribute('label') ?? undefined,
        }));
      }
      return {
        type,
        variable,
        label,
        description: fieldEl.querySelector('desc')?.textContent ?? undefined,
        required: fieldEl.querySelector('required') != null,
        value: valueParsers[type](Array.from(fieldEl.querySelectorAll('value'))),
        options,
      } as FormField;
    }),
  };
}

export function getField<TFormField extends FormField>(
  form: XmlSchemaForm,
  variable: string
): TFormField | undefined {
  return (form.fields.find((field) => field.variable === variable) as TFormField) ?? undefined;
}

export function setFieldValue<
  TFieldType extends FieldType,
  TValue extends FieldValueType[TFieldType]
>(
  form: XmlSchemaForm,
  type: TFieldType,
  variable: string,
  value: TValue,
  createField = false
): void {
  const field = form.fields.find((f) => f.variable === variable);

  if (field && field.type === type) {
    field.value = value;
    return;
  }

  if (field && field.type !== type) {
    throw new Error(
      `type mismatch setting field value: variable=${field?.variable as string}, field.type=${
        field?.type as string
      }, requested type=${type}`
    );
  }

  if (!createField) {
    throw new Error(
      `field for variable not found! variable=${variable}, type=${type}, value=${value as string}`
    );
  }

  form.fields.push({
    type,
    variable,
    value,
  } as FormField);
}

function serializeTextualField(field: TextualFormField | ListSingleFormField): string[] {
  return field.value != null ? [field.value] : [];
}

function serializeTextualMultiField(field: ListMultiFormField | TextMultiFormField): string[] {
  return field.value ?? [];
}

const valueSerializers = {
  fixed: serializeTextualField,
  boolean: (field: BooleanFormField) => (field.value != null ? [String(field.value)] : []),
  hidden: serializeTextualField,
  'jid-single': (field: JidSingleFormField) => (field.value ? [field.value.toString()] : []),
  'jid-multi': (field: JidMultiFormField) => field.value?.map((jid) => jid.toString()) ?? [],
  'list-single': serializeTextualField,
  'list-multi': serializeTextualMultiField,
  'text-single': serializeTextualField,
  'text-private': serializeTextualField,
  'text-multi': serializeTextualMultiField,
} as const;

export function serializeToSubmitForm(builder: StanzaBuilder, form: XmlSchemaForm): StanzaBuilder {
  const serializedFields = form.fields.reduce<[string, string[], string][]>(
    (collectedFields, field) => {
      const serializer = valueSerializers[field.type];
      if (!serializer) {
        throw new Error(`unknown field type: ${field.type}`);
      }

      const values = (serializer as (field: FormField) => string[])(field);

      if (field.variable != null && values.length > 0) {
        collectedFields.push([field.variable, values, field.type]);
      }

      return collectedFields;
    },
    []
  );

  const childBuilder = builder.c('x', { xmlns: nsXForm, type: 'submit' });
  serializedFields.map(([variable, values, type]) => {
    const attrs = { var: variable };
    if (['hidden', 'fixed', 'boolean'].includes(type)) {
      attrs['type'] = type;
    }
    const childChildBuilder = childBuilder.c('field', attrs);
    values.map((value) => childChildBuilder.c('value', {}, value));
    childBuilder.up();
  });

  return builder;
}
