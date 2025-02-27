/*
Copyright 2019 Gravitational, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { space, width, height } from 'shared/system';
import defaultTheme from 'shared/theme';

const Button = ({ children, setRef, ...props}) => {
  return (
    <StyledButton {...props} ref={setRef}>
      {children}
    </StyledButton>
  )
}

const size = props => {
  switch (props.size) {
    case 'small':
      return {
        fontSize: '10px',
        lineHeight: '24px',
        padding: '0px 16px'
      }
    case 'large':
      return {
        lineHeight: '48px',
        fontSize: '14px',
        padding: '0px 48px'
      }
    default:
      // medium
      return {
        lineHeight: '40px',
        fontSize: `12px`,
        padding: '0px 32px'
      }
  }
}

const themedStyles = props => {
  const { colors } = props.theme;
  const style = {
    color: colors.secondary.contrastText,
    '&:disabled': {
      background: colors.action.disabledBackground,
      color: colors.action.disabled
    },
  }

  return {
    ...kinds(props),
    ...style,
    ...size(props),
    ...space(props),
    ...width(props),
    ...block(props),
    ...height(props)
  }
}

const kinds = props => {
  const { kind, theme } = props;
  switch(kind){
    case 'secondary':
      return  {
        background: theme.colors.primary.light,

        '&:hover, &:focus': {
          background: theme.colors.primary.lighter,
        }
      };
    case 'warning':
      return {
        background: theme.colors.error.dark,
        '&:hover, &:focus': {
          background: theme.colors.error.main
        }
      };
    case 'primary':
    default:
      return {
        background: theme.colors.secondary.main,
        '&:hover, &:focus': {
          background: theme.colors.secondary.light
        },
        '&:active': {
          background: theme.colors.secondary.dark,
        },
      }
  }
}

const block = props => (props.block ? {
  width: '100%'
} : null)

const StyledButton = styled.button`
  margin: 0;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  outline: none;
  position: relative;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  transition: all .3s;
  -webkit-font-smoothing: antialiased;
  &:active {
    opacity: .56;
  }
  ${themedStyles}
`

Button.propTypes = {
  block: PropTypes.bool,
  secondary: PropTypes.bool,
  ...space.propTypes,
  ...height.propTypes
}

Button.defaultProps = {
  size: 'medium',
  theme: defaultTheme
}

Button.displayName = 'Button'

export default Button;
export const ButtonPrimary = props => <Button kind="primary" {...props} />
export const ButtonSecondary = props => <Button kind="secondary" {...props} />
export const ButtonWarning = props => <Button kind="warning" {...props} />