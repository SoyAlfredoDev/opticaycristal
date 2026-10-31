import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonthlyNotice } from './MonthlyNotice';
import { SiteHeader } from '@/components/site/SiteHeader';

afterEach(() => vi.useRealTimers());
describe('Cinta mensual de Inicio', () => {
  it('usa el mes de Chile y cambia sola al cruzar de mes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T02:59:30Z'));
    render(<MonthlyNotice />);
    expect(screen.getByRole('note', { name: 'Novedades del mes' })).toHaveTextContent('Este octubre');
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole('note', { name: 'Novedades del mes' })).toHaveTextContent('Este noviembre');
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(document.querySelectorAll('button')).toHaveLength(0);
  });
  it('conserva la cabecera institucional de las páginas interiores', () => {
    render(<SiteHeader active="Óptica" />);
    expect(screen.queryByRole('note', { name: 'Novedades del mes' })).not.toBeInTheDocument();
    expect(screen.getByText('Tu mirada, nuestra prioridad')).toBeInTheDocument();
  });
  it('evita dejar un mes desactualizado en HTML generado o cacheado por el servidor', () => {
    expect(renderToString(<MonthlyNotice />)).toContain('Este mes, encuentra tu próxima mirada');
  });
});
