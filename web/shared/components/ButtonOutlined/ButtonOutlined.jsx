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
import { space, width } from 'shared/system';
import defaultTheme from 'shared/theme';

const ButtonOutlined = ({ children, setRef, ...props}) => {
  return (
    <StyledButton {...props} ref={setRef}>
      <span>{children}</span>
    </StyledButton>
  )
}

const size = props => {
  switch (props.size) {
    case 'small':
      return {
        fontSize: '10px',
        padding: '8px 8px'
      }
    case 'medium':
      return {
        fontSize: `12px`,
        padding: '12px 32px'
      }
    case 'large':
      return {
        fontSize: '14px',
        padding: '20px 40px'
      }
    default:
      return {
        fontSize: `10px`,
        padding: '12px 24px'
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
    ...block(props)
  }
}

const kinds = props => {
  const { kind, theme } = props;
  switch(kind){
    case 'primary':
      return {
        borderColor: theme.colors.secondary.main,
        color: theme.colors.secondary.light,
        '&:hover, &:focus': {
          borderColor: theme.colors.secondary.light
        },
        '&:active': {
          borderColor: theme.colors.secondary.dark,
        },
      }
    default:
      return {
        borderColor: theme.colors.text.primary,
        color: theme.colors.text.primary,
        '&:hover, &:focus': {
          borderColor: theme.colors.light,
          color: theme.colors.light
        }
    }
  }
}

const block = props => (props.block ? {
  width: '100%'
} : null)

const StyledButton = styled.button`
  border-radius: 4px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border: 1px solid;
  background-color: transparent;
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
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

  > span {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ${themedStyles}
  ${kinds}
  ${block}
`

ButtonOutlined.propTypes = {
  ...space.propTypes,
}

ButtonOutlined.defaultProps = {
  size: 'medium',
  theme: defaultTheme
}

ButtonOutlined.displayName = 'ButtonOutlined'

export default ButtonOutlined;
export const OutlinedPrimary = props => <ButtonOutlined kind="primary" {...props} />