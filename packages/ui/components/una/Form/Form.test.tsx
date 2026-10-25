import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from './Form';

describe('UNA Form Component', () => {
  it('should render form and children correctly', () => {
    render(
      <Form data-testid="una-form">
        <span data-testid="child-element">Form Content</span>
      </Form>,
    );

    const form = screen.getByTestId('una-form');
    const child = screen.getByTestId('child-element');

    expect(form).toBeInTheDocument();
    expect(form.tagName).toBe('FORM');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Form Content');
  });

  it('should apply card variant styling by default', () => {
    const { container } = render(
      <Form>
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = container.querySelector('form');

    expect(form).toBeInTheDocument();
    expect(form?.className).toContain('card');
  });

  it('should apply simple variant and custom className', () => {
    const { container } = render(
      <Form variant="simple" className="custom-form-class">
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = container.querySelector('form');

    expect(form).toBeInTheDocument();
    expect(form).toHaveClass('custom-form-class');
    expect(form?.className).toContain('simple');
    expect(form?.className).not.toContain('card');
  });

  it('should pass through native form attributes and forward props', () => {
    render(
      <Form
        id="contact-form"
        data-testid="contact-form"
        noValidate
        aria-label="Contact Us"
        name="contact"
      >
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = screen.getByRole('form', { name: /contact us/i });

    expect(form).toHaveAttribute('id', 'contact-form');
    expect(form).toHaveAttribute('name', 'contact');
    expect(form).toHaveAttribute('novalidate');
  });

  it('should call action with FormData when form is submitted', async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    render(
      <Form action={action}>
        <input name="email" defaultValue="test@example.com" />
        <button type="submit">Submit</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(action).toHaveBeenCalledTimes(1);

    const submittedData = action.mock.calls[0]?.[0] as FormData;

    expect(submittedData).toBeInstanceOf(FormData);
    expect(submittedData.get('email')).toBe('test@example.com');
  });

  it('should call onData with parsed form entries when submitted', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();

    render(
      <Form onData={onData}>
        <input name="username" defaultValue="alex" />
        <input name="role" defaultValue="developer" />
        <button type="submit">Save</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({
      username: 'alex',
      role: 'developer',
    });
  });

  it('should group repeated form fields into an array in onData', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();

    render(
      <Form onData={onData}>
        <input name="skills" defaultValue="TypeScript" />
        <input name="skills" defaultValue="React" />
        <button type="submit">Save</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({
      skills: ['TypeScript', 'React'],
    });
  });

  it('should handle async action handler without unhandled rejection', async () => {
    let resolved = false;
    const asyncAction = vi.fn().mockImplementation(async () => {
      await Promise.resolve();
      resolved = true;
    });
    const user = userEvent.setup();

    render(
      <Form action={asyncAction}>
        <button type="submit">Send</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(asyncAction).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(true);
  });

  it('should prevent default event submission behavior', () => {
    const onData = vi.fn();

    render(
      <Form onData={onData} data-testid="prevent-default-form">
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = screen.getByTestId('prevent-default-form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });

    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(onData).toHaveBeenCalledTimes(1);
  });

  it('should render form fields, labels, and error messages with proper accessibility association', () => {
    render(
      <Form aria-label="User Profile">
        <div>
          <label htmlFor="user-email">Email address</label>
          <input
            id="user-email"
            name="email"
            type="email"
            aria-describedby="email-hint email-error"
            aria-invalid="true"
          />
          <span id="email-hint">We will never share your email.</span>
          <span id="email-error" role="alert">
            Email is required.
          </span>
        </div>
        <button type="submit">Update</button>
      </Form>,
    );

    const input = screen.getByLabelText(/email address/i);
    const hint = screen.getByText(/we will never share your email/i);
    const error = screen.getByRole('alert');

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'user-email');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint email-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(hint).toHaveAttribute('id', 'email-hint');
    expect(error).toHaveAttribute('id', 'email-error');
    expect(error).toHaveTextContent('Email is required.');
  });
});
