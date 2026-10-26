import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactTags } from './ContactTags';

describe('ContactTags', () => {
  it.each(['', '   '])('should omit an empty alternative contact %j', (alternativeContact) => {
    render(
      <ContactTags
        email="profile@example.com"
        alternativeContact={alternativeContact}
        emailLabel="Email"
        alternativeContactLabel="Alternative contact"
      />,
    );

    expect(screen.getByTitle('Email')).toHaveTextContent('profile@example.com');
    expect(screen.queryByTitle('Alternative contact')).not.toBeInTheDocument();
  });

  it('should show both contacts with localized labels', () => {
    render(
      <ContactTags
        email="profile@example.com"
        alternativeContact="  @student_dev  "
        emailLabel="Пошта"
        alternativeContactLabel="Інший контакт"
      />,
    );

    expect(screen.getByTitle('Пошта')).toHaveTextContent('profile@example.com');
    expect(screen.getByTitle('Інший контакт')).toHaveTextContent('@student_dev');
  });

  it('should escape untrusted contact text', () => {
    const contact = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <ContactTags
        alternativeContact={contact}
        emailLabel="Email"
        alternativeContactLabel="Alternative contact"
      />,
    );

    expect(screen.getByTitle('Alternative contact')).toHaveTextContent(contact);
    expect(container.querySelector('img')).toBeNull();
  });
});
