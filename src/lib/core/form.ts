import { Element } from 'ltx';
import { jid as parseJid, JID } from '@xmpp/jid';
import { xml } from '@xmpp/client';

// implements https://xmpp.org/extensions/xep-0004.html

export const FORM_NS = 'jabber:x:data';

export type FormType = 'form' | 'submit' | 'cancel' | 'result';

export interface Form {
    type: FormType;
    title?: string;
    instructions: string[];
    fields: FormField[];
}

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
    'jid-single': JID;
    'jid-multi': JID[];
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

interface ListFormField<TFieldType extends 'list-single' | 'list-multi'> extends FormFieldBase<TFieldType> {
    options?: FieldOption[];
}

export type ListSingleFormField = ListFormField<'list-single'>;
export type ListMultiFormField = ListFormField<'list-multi'>;

export interface FieldOption {
    label?: string;
    value: string;
}

function parseStringValue([valueEl]: Element[]): string {
    return valueEl?.getText();
}

function parseMultipleStringValues(valueEls: Element[]): string[] {
    return valueEls.map(el => parseStringValue([el]));
}

function parseJidValue([valueEl]: Element[]): JID {
    return valueEl && parseJid(valueEl.getText());
}

const valueParsers = {
    fixed: parseStringValue,
    boolean: ([valueEl]: Element[]): boolean => {
        if (!valueEl) {
            return false;
        }
        const value = valueEl.getText();
        return value === '1' || value === 'true';
    },
    hidden: parseStringValue,
    'jid-single': parseJidValue,
    'jid-multi': (valueEls: Element[]): JID[] =>
        [
            ...new Set(
                valueEls.map(el => parseStringValue([el])),
            ),
        ]
            .map(jidStr => parseJid(jidStr)),
    'list-single': parseStringValue,
    'list-multi': parseMultipleStringValues,
    'text-single': parseStringValue,
    'text-private': parseStringValue,
    'text-multi': parseMultipleStringValues,
};

export function parseForm(formEl: Element): Form {
    if (formEl.name !== 'x' || formEl.getNS() !== FORM_NS) {
        throw new Error(`Provided element is not a form element: elementName=${formEl.name}, xmlns=${formEl.getNS()}, form=${formEl.toString()}`);
    }

    return {
        type: formEl.attrs.type,
        title: formEl.getChildText('title') ?? undefined,
        instructions: formEl.getChildren('instructions').map(descEl => descEl.getText()),
        fields: formEl.getChildren('field')
            .map(fieldEl => {
                const rawType = fieldEl.attrs.type as string;
                const type = rawType in valueParsers ? rawType as keyof typeof valueParsers : 'text-single';
                const {var: variable, label}: { var?: string, label?: string } = fieldEl.attrs;
                let options: FieldOption[] | undefined;
                if (type === 'list-single' || type === 'list-multi') {
                    options = fieldEl.getChildren('option').map(optionEl => ({
                        value: optionEl.getChildText('value'),
                        label: optionEl.attrs.label,
                    }));
                }
                return {
                    type,
                    variable,
                    label,
                    description: fieldEl.getChildText('desc') ?? undefined,
                    required: fieldEl.getChild('required') != null,
                    value: valueParsers[type](fieldEl.getChildren('value')),
                    options,
                } as FormField;
            }),
    };
}

export function getField(form: Form, variable: string): FormField | undefined {
    return form.fields.find(field => field.variable === variable) ?? undefined;
}

export function setFieldValue<TFieldType extends FieldType, TValue extends FieldValueType[TFieldType]>(
    form: Form,
    type: TFieldType,
    variable: string,
    value: TValue,
    createField = false,
) {
    let field = form.fields
        .find((f) => f.variable === variable);

    if (field) {
        if (field.type !== type) {
            throw new Error(`type mismatch setting field value: variable=${field.variable}, field.type=${field.type}, requested type=${type}`);
        }
        field.value = value;
        return;
    }

    if (createField) {
        field = {
            type,
            variable,
            value,
        } as FormField;
        form.fields.push(field);
    } else {
        throw new Error(`field for variable not found! variable=${variable}, type=${type}, value=${value}`);
    }
}

function serializeTextualField(field: TextualFormField | ListSingleFormField): string[] {
    return field.value != null ? [field.value] : [];
}

function serializeTextualMultiField(field: ListMultiFormField | TextMultiFormField): string[] {
    return field.value;
}

const valueSerializers: Record<FieldType, (field: FormField) => string[]> = {
    fixed: serializeTextualField,
    boolean: (field: BooleanFormField) => field.value != null ? [String(field.value)] : [],
    hidden: serializeTextualField,
    'jid-single': (field: JidSingleFormField) => field.value ? [field.value.toString()] : [],
    'jid-multi': (field: JidMultiFormField) => field.value.map(jid => jid.toString()),
    'list-single': serializeTextualField,
    'list-multi': serializeTextualMultiField,
    'text-single': serializeTextualField,
    'text-private': serializeTextualField,
    'text-multi': serializeTextualMultiField,
};

export function serializeToSubmitForm(form: Form): Element {
    const serializedFields = form.fields
        .reduce<[string, string[]][]>((collectedFields, field) => {
            const serializer = valueSerializers[field.type];
            if (!serializer) {
                throw new Error(`unknown field type: ${field.type}`);
            }

            const values = serializer(field);

            if (field.variable != null && values.length > 0) {
                collectedFields.push([field.variable, values]);
            }

            return collectedFields;
        }, []);

    return xml('x', {xmlns: FORM_NS, type: 'submit'},
        ...serializedFields.map(
            ([variable, values]) =>
                xml(
                    'field',
                    {var: variable},
                    ...values.map(value => xml('value', {}, value)),
                ),
        ),
    );
}
