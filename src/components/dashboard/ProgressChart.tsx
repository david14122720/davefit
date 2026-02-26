import { useEffect, useRef, useState } from 'preact/hooks';
import { insforge } from '../../lib/insforge';

// Import Chart.js dinámicamente para evitar errores de carga
let Chart: any;

interface WorkoutData {
    fecha: string;
    duracion_minutos: number;
}

export default function ProgressChart() {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [periodo, setPeriodo] = useState<'7dias' | '30dias'>('7dias');
    const [chartLoaded, setChartLoaded] = useState(false);

    // Cargar Chart.js dinámicamente
    useEffect(() => {
        const loadChart = async () => {
            try {
                const chartModule = await import('chart.js/auto');
                Chart = chartModule.default;
                setChartLoaded(true);
            } catch (err) {
                console.error('Error cargando Chart.js:', err);
            }
        };
        loadChart();
    }, []);

    useEffect(() => {
        if (chartLoaded) {
            cargarDatos();
        }
    }, [periodo, chartLoaded]);

    const cargarDatos = async () => {
        try {
            const { data: sessionData } = await insforge.auth.getCurrentSession();
            const user = sessionData?.session?.user;

            if (!user) {
                setLoading(false);
                return;
            }

            const dias = periodo === '7dias' ? 7 : 30;
            const fechaInicio = new Date();
            fechaInicio.setDate(fechaInicio.getDate() - dias);

            const { data: historial, error } = await insforge.database
                .from('historial_entrenamientos')
                .select('fecha, duracion_minutos')
                .eq('usuario_id', user.id)
                .gte('fecha', fechaInicio.toISOString())
                .order('fecha', { ascending: true });

            if (error) {
                console.error('Error en consulta:', error);
                setLoading(false);
                return;
            }

            // Procesar datos para el gráfico
            const datosProcesados = procesarDatosSemana(historial || []);
            setData(datosProcesados);
            setLoading(false);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setLoading(false);
        }
    };

    const procesarDatosSemana = (historial: WorkoutData[]): number[] => {
        const datosPorDia = new Array(7).fill(0);

        historial.forEach((registro) => {
            const fecha = new Date(registro.fecha);
            const diaSemana = fecha.getDay();
            datosPorDia[diaSemana] += registro.duracion_minutos || 0;
        });

        // Reordenar para que empiece en Lunes
        const [domingo, ...resto] = datosPorDia;
        return [...resto, domingo];
    };

    useEffect(() => {
        if (!chartRef.current || loading || !Chart) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(255, 107, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 107, 0, 0.0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Minutos Activos',
                    data: data,
                    backgroundColor: gradient,
                    borderColor: '#ff6b00',
                    borderWidth: 4,
                    pointBackgroundColor: '#ff6b00',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#141414',
                        titleColor: '#fff',
                        bodyColor: '#9ca3af',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: (context: any) => `${context.parsed.y} min`
                        }
                    }
                },
                scales: {
                    y: {
                        display: false,
                        beginAtZero: true,
                        grid: { display: false }
                    },
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: { color: '#6b7280', font: { size: 10 } }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, loading, Chart]);

    if (loading) {
        return (
            <div class="h-full flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
        );
    }

    return (
        <div class="h-full">
            <div class="flex justify-end gap-2 mb-4">
                <button
                    onClick={() => setPeriodo('7dias')}
                    class={`px-3 py-1 text-xs font-bold rounded transition-colors ${periodo === '7dias'
                        ? 'bg-white/10 text-white'
                        : 'text-gray-500 hover:text-white'
                        }`}
                >
                    7 Días
                </button>
                <button
                    onClick={() => setPeriodo('30dias')}
                    class={`px-3 py-1 text-xs font-bold rounded transition-colors ${periodo === '30dias'
                        ? 'bg-white/10 text-white'
                        : 'text-gray-500 hover:text-white'
                        }`}
                >
                    30 Días
                </button>
            </div>
            <div class="h-48">
                <canvas ref={chartRef} />
            </div>
        </div>
    );
}
