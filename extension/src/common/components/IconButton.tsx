import React from 'react'
import { Icon, IconType } from './icons/Icons'
import './IconButton.scss'

interface IconButtonProps {
  type: IconType
  onClick: () => void
  title?: string
  isActive?: boolean
  disabled?: boolean
  'data-testid'?: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  type,
  onClick,
  title,
  isActive,
  disabled = false,
  'data-testid': testId
}) => {
  return (
    <button 
      className={`icon-button ${isActive ? 'icon-button--active' : ''} ${disabled ? 'icon-button--disabled' : ''}`}
      onClick={disabled ? undefined : onClick} 
      title={title}
      type="button"
      data-testid={testId}
      disabled={disabled}
    >
      <Icon type={type} />
    </button>
  )
}