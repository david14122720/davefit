import { describe, it, expect } from 'vitest';
// These types don't exist yet — this file must fail at module resolution (RED)
import type { FormFieldType, AdminFormData, FormField, AdminCrudTableProps } from './index';

describe('FormFieldType', () => {
    it('should be a union of exactly 6 valid field type strings', () => {
        const types: FormFieldType[] = ['text', 'number', 'select', 'textarea', 'file', 'toggle'];
        expect(types).toHaveLength(6);
        expect(types).toContain('text');
        expect(types).toContain('number');
        expect(types).toContain('select');
        expect(types).toContain('textarea');
        expect(types).toContain('file');
        expect(types).toContain('toggle');
    });

    it('should accept a FormFieldType variable as a string', () => {
        const t: FormFieldType = 'text';
        expect(typeof t).toBe('string');
    });
});

describe('AdminFormData', () => {
    it('should be a record of string keys to string/number/boolean values', () => {
        const data: AdminFormData = {
            nombre: 'Test',
            edad: 25,
            activo: true,
        };
        expect(data.nombre).toBe('Test');
        expect(data.edad).toBe(25);
        expect(data.activo).toBe(true);
    });

    it('should allow partial form data', () => {
        const partial: Partial<AdminFormData> = {
            nombre: 'Solo nombre',
        };
        expect(partial.nombre).toBe('Solo nombre');
    });
});

describe('FormField', () => {
    it('should create a minimal text field config', () => {
        const field: FormField = {
            label: 'Nombre del ejercicio',
            name: 'nombre',
            type: 'text',
        };
        expect(field.label).toBe('Nombre del ejercicio');
        expect(field.name).toBe('nombre');
        expect(field.type).toBe('text');
        // Optional fields default to undefined
        expect(field.options).toBeUndefined();
        expect(field.required).toBeUndefined();
        expect(field.placeholder).toBeUndefined();
    });

    it('should create a select field with options', () => {
        const field: FormField = {
            label: 'Nivel',
            name: 'nivel',
            type: 'select',
            options: [
                { value: 'principiante', label: 'Principiante' },
                { value: 'intermedio', label: 'Intermedio' },
                { value: 'avanzado', label: 'Avanzado' },
            ],
            required: true,
            placeholder: 'Selecciona un nivel',
        };
        expect(field.type).toBe('select');
        expect(field.options).toHaveLength(3);
        expect(field.options![0].value).toBe('principiante');
        expect(field.required).toBe(true);
        expect(field.placeholder).toBe('Selecciona un nivel');
    });

    it('should create every field type variant', () => {
        const types: FormField['type'][] = ['text', 'number', 'select', 'textarea', 'file', 'toggle'];
        const fields: FormField[] = types.map((type) => ({
            label: type === 'file' ? 'Imagen' : `Field ${type}`,
            name: type,
            type,
        }));
        expect(fields).toHaveLength(6);
        fields.forEach((f, i) => {
            expect(f.type).toBe(types[i]);
        });
    });
});

describe('AdminCrudTableProps', () => {
    interface TestItem {
        id: string;
        nombre: string;
        nivel: string;
    }

    const mockItem: TestItem = { id: '1', nombre: 'Test', nivel: 'principiante' };

    it('should accept minimal required props', () => {
        const props: AdminCrudTableProps<TestItem> = {
            data: [mockItem],
            renderRow: (item: TestItem) => item.nombre,
            keyExtractor: (item: TestItem) => item.id,
            title: 'Ejercicios',
            itemCount: 1,
            loading: false,
            search: '',
            onSearchChange: () => {},
        };
        expect(props.data).toHaveLength(1);
        expect(props.title).toBe('Ejercicios');
        expect(props.keyExtractor(mockItem)).toBe('1');
    });

    it('should accept full config with optional props', () => {
        const props: AdminCrudTableProps<TestItem> = {
            data: [mockItem],
            columns: ['Nombre', 'Nivel'],
            renderRow: (item: TestItem) => item.nombre,
            keyExtractor: (item: TestItem) => item.id,
            title: 'Ejercicios',
            itemCount: 1,
            loading: false,
            search: '',
            onSearchChange: (v: string) => {},
            accentColor: 'blue',
            emptyIcon: '📋',
            emptyMessage: 'No hay ejercicios',
            emptyActionLabel: 'Crear ejercicio',
            onEmptyAction: () => {},
            searchPlaceholder: 'Buscar ejercicios...',
            onNewClick: () => {},
            newButtonLabel: 'Nuevo Ejercicio',
        };
        expect(props.columns).toHaveLength(2);
        expect(props.accentColor).toBe('blue');
        expect(props.renderRow(mockItem)).toBe('Test');
    });

    it('should work with empty data array', () => {
        const props: AdminCrudTableProps<TestItem> = {
            data: [],
            renderRow: (item: TestItem) => item.nombre,
            keyExtractor: (item: TestItem) => item.id,
            title: 'Empty',
            itemCount: 0,
            loading: false,
            search: '',
            onSearchChange: () => {},
        };
        expect(props.data).toHaveLength(0);
    });
});
