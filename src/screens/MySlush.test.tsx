// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MySlush } from './MySlush';

describe('MySlush', () => {
  it('shows a hand-off that never finishes and no real link', () => {
    render(<MySlush onRestart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Redirecting you to My Slush' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('restarts the demo straight away', async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    const nativeConfirm = vi.spyOn(window, 'confirm');
    render(<MySlush onRestart={onRestart} />);
    await user.click(screen.getByRole('button', { name: 'Restart the demo' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(nativeConfirm).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });
});
