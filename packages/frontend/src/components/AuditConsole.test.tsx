// Tests for AuditConsole component
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditConsole } from './AuditConsole';

describe('AuditConsole', () => {
  let onSubmit: Mock<(input: { contractAddress?: string; sourceCode?: string }) => void>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders the form with address mode by default', () => {
    render(<AuditConsole onSubmit={onSubmit} />);
    expect(screen.getByText('Smart Contract Audit')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    expect(screen.getByText('Start Security Audit')).toBeInTheDocument();
  });

  it('validates empty address input', async () => {
    render(<AuditConsole onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Start Security Audit'));
    expect(screen.getByText('Please enter a contract address')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates invalid address format', async () => {
    const user = userEvent.setup();
    render(<AuditConsole onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('0x...');
    await user.type(input, 'invalid-address');
    fireEvent.click(screen.getByText('Start Security Audit'));

    expect(screen.getByText(/Invalid address format/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid address', async () => {
    const user = userEvent.setup();
    render(<AuditConsole onSubmit={onSubmit} />);

    const validAddress = '0x' + 'a'.repeat(40);
    const input = screen.getByPlaceholderText('0x...');
    await user.type(input, validAddress);
    fireEvent.click(screen.getByText('Start Security Audit'));

    expect(onSubmit).toHaveBeenCalledWith({ contractAddress: validAddress });
  });

  it('switches to source code mode', async () => {
    render(<AuditConsole onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Paste Source Code'));
    expect(screen.getByPlaceholderText(/SPDX-License/)).toBeInTheDocument();
  });

  it('validates empty source code', () => {
    render(<AuditConsole onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Paste Source Code'));
    fireEvent.click(screen.getByText('Start Security Audit'));
    expect(screen.getByText(/valid Solidity source code/)).toBeInTheDocument();
  });

  it('validates source code too short', async () => {
    const user = userEvent.setup();
    render(<AuditConsole onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Paste Source Code'));

    const textarea = screen.getByPlaceholderText(/SPDX-License/);
    await user.type(textarea, 'short');
    fireEvent.click(screen.getByText('Start Security Audit'));

    expect(screen.getByText(/valid Solidity source code/)).toBeInTheDocument();
  });

  it('submits valid source code', async () => {
    const user = userEvent.setup();
    render(<AuditConsole onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Paste Source Code'));

    const code = 'pragma solidity ^0.8.0; contract Foo implements Bar';
    const textarea = screen.getByPlaceholderText(/SPDX-License/);
    await user.type(textarea, code);
    fireEvent.click(screen.getByText('Start Security Audit'));

    expect(onSubmit).toHaveBeenCalledWith({ sourceCode: expect.stringContaining('pragma solidity') });
  });

  it('shows loading state when audit is running', () => {
    render(<AuditConsole onSubmit={onSubmit} auditStatus="started" />);
    expect(screen.getByText('Analyzing Contract...')).toBeInTheDocument();
  });

  it('disables submit button during audit', () => {
    render(<AuditConsole onSubmit={onSubmit} auditStatus="started" />);
    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find(b => b.textContent?.includes('Analyzing Contract'));
    expect(submitButton).toBeDisabled();
  });

  it('displays backend error', () => {
    render(<AuditConsole onSubmit={onSubmit} error="Backend is down" />);
    expect(screen.getByText('Backend is down')).toBeInTheDocument();
  });

  it('shows status when not "started"', () => {
    render(<AuditConsole onSubmit={onSubmit} auditStatus="complete" />);
    expect(screen.getByText('complete')).toBeInTheDocument();
  });
});
