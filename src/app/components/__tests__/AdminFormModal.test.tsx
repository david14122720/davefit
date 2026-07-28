import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import AdminFormModal from '../AdminFormModal';

// Mock FileUpload — it depends on insforge storage which is not part of the base mock
vi.mock('../FileUpload', () => ({
  default: ({ label, value, onChange, placeholder }: any) => (
    <div data-testid="file-upload">
      {label && <span>{label}</span>}
      <input
        data-testid="file-upload-input"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  ),
}));

describe('AdminFormModal', () => {
  const baseFields = [
    { label: 'Nombre', name: 'nombre', type: 'text' as const, required: true },
    { label: 'Edad', name: 'edad', type: 'number' as const },
    { label: 'Descripción', name: 'descripcion', type: 'textarea' as const },
    {
      label: 'Categoría',
      name: 'categoria',
      type: 'select' as const,
      options: [
        { value: 'a', label: 'Opción A' },
        { value: 'b', label: 'Opción B' },
      ],
    },
    { label: 'Imagen', name: 'imagen', type: 'file' as const },
    { label: 'Activo', name: 'activo', type: 'toggle' as const },
  ];

  const baseProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Form',
    fields: baseFields,
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal content when open=true', () => {
    render(<AdminFormModal {...baseProps} />);
    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('does NOT render when open=false', () => {
    render(<AdminFormModal {...baseProps} open={false} />);
    expect(screen.queryByText('Test Form')).not.toBeInTheDocument();
    expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
  });

  it('renders all form fields with labels', () => {
    render(<AdminFormModal {...baseProps} />);
    // "Nombre *" includes required asterisk as a separate text node
    expect(screen.getByText((content) => content.startsWith('Nombre'))).toBeInTheDocument();
    expect(screen.getByText('Edad')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Categoría')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows required asterisk on required fields', () => {
    render(<AdminFormModal {...baseProps} />);
    expect(screen.getByText(/Nombre \*/)).toBeInTheDocument();
    // Non-required fields should NOT have asterisk
    expect(screen.queryByText(/Edad \*/)).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<AdminFormModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<AdminFormModal {...baseProps} onClose={onClose} />);
    const xButton = container.querySelector('.lucide-x')?.closest('button');
    expect(xButton).toBeTruthy();
    if (xButton) {
      fireEvent.click(xButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onSubmit with form data when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AdminFormModal
        {...baseProps}
        onSubmit={onSubmit}
        initialData={{ nombre: 'Test Name', edad: 25, descripcion: '', categoria: 'a', imagen: '', activo: true }}
      />
    );

    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Test Name',
          edad: 25,
          categoria: 'a',
          activo: true,
        })
      );
    });
  });

  it('renders file upload component for file type fields', () => {
    render(<AdminFormModal {...baseProps} />);
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('renders select with options', () => {
    render(<AdminFormModal {...baseProps} />);
    expect(screen.getByText('Opción A')).toBeInTheDocument();
    expect(screen.getByText('Opción B')).toBeInTheDocument();
  });
});
