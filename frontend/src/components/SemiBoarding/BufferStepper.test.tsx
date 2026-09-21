import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BufferStepper } from './BufferStepper';

describe('BufferStepper Component (SCR-MGR-01: Semi-Boarding Demand Buffer Control)', () => {
  it('should display the current buffer rate percentage formatted as +X%', () => {
    render(<BufferStepper value={5} onChange={() => {}} />);

    const label = screen.getByText('+5%');
    expect(label).toBeInTheDocument();
  });

  it('should invoke onChange with decremented value when minus button is clicked', () => {
    const handleChange = vi.fn();
    render(<BufferStepper value={5} onChange={handleChange} />);

    const minusButton = screen.getByRole('button', { name: '-' });
    fireEvent.click(minusButton);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('should invoke onChange with incremented value when plus button is clicked', () => {
    const handleChange = vi.fn();
    render(<BufferStepper value={5} onChange={handleChange} />);

    const plusButton = screen.getByRole('button', { name: '+' });
    fireEvent.click(plusButton);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(6);
  });

  it('should disable minus button when value reaches 0%', () => {
    const handleChange = vi.fn();
    render(<BufferStepper value={0} onChange={handleChange} />);

    const minusButton = screen.getByRole('button', { name: '-' });
    const plusButton = screen.getByRole('button', { name: '+' });

    expect(minusButton).toBeDisabled();
    expect(plusButton).not.toBeDisabled();
  });

  it('should disable plus button when value reaches statutory maximum 10%', () => {
    const handleChange = vi.fn();
    render(<BufferStepper value={10} onChange={handleChange} />);

    const minusButton = screen.getByRole('button', { name: '-' });
    const plusButton = screen.getByRole('button', { name: '+' });

    expect(minusButton).not.toBeDisabled();
    expect(plusButton).toBeDisabled();
  });

  it('should disable both buttons when disabled prop is set to true', () => {
    render(<BufferStepper value={5} onChange={() => {}} disabled={true} />);

    const minusButton = screen.getByRole('button', { name: '-' });
    const plusButton = screen.getByRole('button', { name: '+' });

    expect(minusButton).toBeDisabled();
    expect(plusButton).toBeDisabled();
  });
});
