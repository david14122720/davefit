import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import AdminCrudTable from '../AdminCrudTable';

describe('AdminCrudTable', () => {
  const baseProps = {
    data: [
      { id: '1', name: 'Test Item 1' },
      { id: '2', name: 'Test Item 2' },
    ],
    columns: ['Nombre', 'Acción'],
    title: 'Test Items',
    itemCount: 2,
    loading: false,
    search: '',
    onSearchChange: vi.fn(),
    keyExtractor: (item: any) => item.id,
    renderRow: (item: any) => (
      <>
        <td className="px-6 py-4">{item.name}</td>
        <td className="px-6 py-4">
          <button>Editar</button>
        </td>
      </>
    ),
  };

  it('renders search input', () => {
    render(<AdminCrudTable {...baseProps} />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('renders column headings', () => {
    render(<AdminCrudTable {...baseProps} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Acción')).toBeInTheDocument();
  });

  it('renders items via renderRow', () => {
    render(<AdminCrudTable {...baseProps} />);
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.getAllByText('Editar')).toHaveLength(2);
  });

  it('shows loading spinner when loading', () => {
    render(<AdminCrudTable {...baseProps} loading={true} data={[]} itemCount={0} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Test Items')).not.toBeInTheDocument();
  });

  it('shows empty state with message and icon', () => {
    render(
      <AdminCrudTable
        {...baseProps}
        data={[]}
        itemCount={0}
        emptyIcon="📦"
        emptyMessage="No hay elementos"
      />
    );
    expect(screen.getByText('No hay elementos')).toBeInTheDocument();
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing', () => {
    const onSearchChange = vi.fn();
    render(<AdminCrudTable {...baseProps} onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(input, { target: { value: 'busqueda' } });
    expect(onSearchChange).toHaveBeenCalledWith('busqueda');
  });

  it('shows title and item count', () => {
    render(<AdminCrudTable {...baseProps} />);
    expect(screen.getByText('Test Items')).toBeInTheDocument();
    // itemCount value should appear in the subtitle
    expect(screen.getByText(/2 elementos/)).toBeInTheDocument();
  });

  it('renders new button with label and calls onNewClick', () => {
    const onNewClick = vi.fn();
    render(
      <AdminCrudTable
        {...baseProps}
        newButtonLabel="Nuevo Item"
        onNewClick={onNewClick}
      />
    );
    const btn = screen.getByText('Nuevo Item');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onNewClick).toHaveBeenCalledTimes(1);
  });

  it('renders empty action button and calls onEmptyAction', () => {
    const onEmptyAction = vi.fn();
    render(
      <AdminCrudTable
        {...baseProps}
        data={[]}
        itemCount={0}
        emptyActionLabel="Crear Primero"
        onEmptyAction={onEmptyAction}
      />
    );
    const btn = screen.getByText('Crear Primero');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onEmptyAction).toHaveBeenCalledTimes(1);
  });

  it('renders custom search placeholder', () => {
    render(
      <AdminCrudTable
        {...baseProps}
        searchPlaceholder="Buscar elementos..."
      />
    );
    expect(screen.getByPlaceholderText('Buscar elementos...')).toBeInTheDocument();
  });

  it('works without columns (card mode)', () => {
    render(
      <AdminCrudTable
        {...baseProps}
        columns={undefined}
        renderRow={(item: any) => (
          <div data-testid={`card-${item.id}`} className="card">
            {item.name}
          </div>
        )}
      />
    );
    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });
});
