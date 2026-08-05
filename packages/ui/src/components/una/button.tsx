import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }

export const Button: React.FC<ButtonProps> = ({ label, children, ...props }) => {
  return <button {...props}>{label ?? children}</button>
}
