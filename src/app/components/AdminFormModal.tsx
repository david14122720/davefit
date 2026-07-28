import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import FileUpload from './FileUpload';
import type { FormField, AdminFormData } from '../../types';

interface AdminFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  initialData?: AdminFormData;
  onSubmit: (data: AdminFormData) => Promise<void>;
  loading?: boolean;
  accentColor?: string;
}

type AccentKey = 'primary' | 'blue' | 'purple' | 'green';

const accentClasses: Record<AccentKey, { focus: string; bg: string; hoverBg: string }> = {
  primary: { focus: 'focus:border-primary/50', bg: 'bg-primary', hoverBg: 'hover:bg-primary-dark' },
  blue: { focus: 'focus:border-blue-500/50', bg: 'bg-blue-500', hoverBg: 'hover:bg-blue-600' },
  purple: { focus: 'focus:border-purple-500/50', bg: 'bg-purple-500', hoverBg: 'hover:bg-purple-600' },
  green: { focus: 'focus:border-green-500/50', bg: 'bg-green-500', hoverBg: 'hover:bg-green-600' },
};

function getAccent(color?: string) {
  const key = (color || 'primary') as AccentKey;
  return accentClasses[key] || accentClasses.primary;
}

export default function AdminFormModal({
  open,
  onClose,
  title,
  fields,
  initialData,
  onSubmit,
  loading = false,
  accentColor,
}: AdminFormModalProps) {
  const defaultFormData = useMemo(() => {
    const defaults: AdminFormData = {};
    fields.forEach((f) => {
      if (f.type === 'toggle') defaults[f.name] = false;
      else defaults[f.name] = '';
    });
    return defaults;
  }, [fields]);

  const [formData, setFormData] = useState<AdminFormData>({ ...defaultFormData });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(
        initialData
          ? { ...defaultFormData, ...initialData }
          : { ...defaultFormData }
      );
      setSaving(false);
    }
  }, [open, initialData, defaultFormData]);

  const handleChange = (name: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
    } catch {
      // Caller handles errors
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const accent = getAccent(accentColor);
  const isSaving = saving || loading;

  const renderField = (field: FormField) => {
    const value = formData[field.name] ?? '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            required={field.required}
            value={value as string}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-hidden ${accent.focus}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            required={field.required}
            min="0"
            value={value as string}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-hidden ${accent.focus}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            required={field.required}
            value={value as string}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={`w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-hidden ${accent.focus} resize-none`}
          />
        );

      case 'select':
        return (
          <select
            required={field.required}
            value={value as string}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={`w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-hidden ${accent.focus}`}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="capitalize">
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'file':
        return (
          <FileUpload
            value={value as string}
            onChange={(url) => handleChange(field.name, url)}
            placeholder={field.placeholder}
          />
        );

      case 'toggle':
        return (
          <button
            type="button"
            onClick={() => handleChange(field.name, !(value as boolean))}
            className={`w-12 h-6 rounded-full transition-colors ${
              value ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                value ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {field.label}
                {field.required && ' *'}
              </label>
              {renderField(field)}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 ${accent.bg} ${accent.hoverBg} text-white rounded-xl font-medium transition-colors disabled:opacity-50`}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
